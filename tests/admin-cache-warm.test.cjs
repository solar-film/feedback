const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');

// Apps Script's Utilities and Blob, backed by Node's zlib and Buffer.
function blob(bytes) {
    const buffer = Buffer.from(bytes);
    return { getBytes: () => Array.from(buffer), getDataAsString: () => buffer.toString('utf8') };
}
const Utilities = {
    newBlob: (data) => blob(typeof data === 'string' ? Buffer.from(data, 'utf8') : data),
    gzip: b => blob(zlib.gzipSync(Buffer.from(b.getBytes()))),
    ungzip: b => blob(zlib.gunzipSync(Buffer.from(b.getBytes()))),
    base64Encode: bytes => Buffer.from(bytes).toString('base64'),
    base64Decode: text => Array.from(Buffer.from(text, 'base64')),
    // 'H' gives the hour, which tests set through clock.hour.
    formatDate: (value, timezone, format) => (format === 'H' ? String(clock.hour) : value.toISOString())
};
const clock = { hour: 10 };

function setup() {
    const store = new Map();
    const cache = {
        get: key => store.get(key) ?? null,
        getAll: keys => Object.fromEntries(keys.filter(key => store.has(key)).map(key => [key, store.get(key)])),
        put(key, value) { assert.ok(Buffer.byteLength(value) < 100000, 'cache value over 100 KB'); store.set(key, value); },
        putAll(values) { Object.entries(values).forEach(([key, value]) => cache.put(key, value)); },
        remove: key => store.delete(key)
    };
    const triggers = [];
    const ctx = vm.createContext({
        Utilities,
        CacheService: { getScriptCache: () => cache },
        ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) },
        ScriptApp: {
            getProjectTriggers: () => triggers.slice(),
            deleteTrigger: trigger => triggers.splice(triggers.indexOf(trigger), 1),
            newTrigger: handler => ({ timeBased: () => ({ everyMinutes: minutes => ({ create: () => { triggers.push({ handler, minutes, getHandlerFunction: () => handler }); } }) }) })
        }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../Code.gs'), 'utf8'), ctx);
    // About 1,700 customers' worth of Thai JSON, like the live admin payload.
    const sheets = {
        Data: Array.from({ length: 1700 }, (_, i) => ({ ID: 'GFS' + i, Name: 'คุณลูกค้า ทดสอบ ' + i, 'ที่อยู่': '119/464 ถนนสุขุมวิท แขวงพระโขนง เขตคลองเตย กรุงเทพมหานคร ' + i })),
        GFS_Care_Quest: [], GFS_Status_Log: [], Gift: [], remark: []
    };
    let reads = 0;
    ctx.getSheetData = name => { if (name === 'Data') reads++; return sheets[name]; };
    ctx.getPresentationOverridesById = () => ({});
    ctx.getAdminPassword = () => 'pw';
    ctx.getSpreadsheetTimezone = () => 'Asia/Bangkok';
    clock.hour = 10;
    const load = fresh => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ action: 'getAllCustomersDetailed', password: 'pw', ...(fresh ? { fresh: true } : {}) }) } }).text);
    return { ctx, cache, store, triggers, load, sheets, reads: () => reads };
}

test('a large Thai payload is stored compressed in a few entries and read back unchanged', () => {
    const { ctx, cache, store } = setup();
    const text = JSON.stringify({ status: 'success', data: Array.from({ length: 1700 }, (_, i) => ({ id: 'GFS' + i, name: 'คุณลูกค้า ' + i, address: 'แขวงพระโขนง เขตคลองเตย กรุงเทพมหานคร' })) });
    ctx.writeChunkedCache(cache, 'k', text, 60);
    assert.ok(text.length > 100000);
    assert.ok(store.size <= 3, `expected a few entries, got ${store.size}`);
    assert.equal(ctx.readChunkedCache(cache, 'k'), text);
});

test('entries written before compression existed are still read', () => {
    const { ctx, cache, store } = setup();
    store.set('plain', '{"status":"success"}');
    assert.equal(ctx.readChunkedCache(cache, 'plain'), '{"status":"success"}');
});

test('the warm-up makes the next dashboard load a cache hit with no sheet reads', () => {
    const { ctx, load, reads } = setup();
    ctx.warmAdminDataCache();
    assert.equal(reads(), 1);
    const data = load();
    assert.equal(data.data.length, 1700);
    assert.equal(data.data[5].name, 'คุณลูกค้า ทดสอบ 5');
    assert.equal(reads(), 1, 'served from the warmed cache');
});

test('a write still shows at once, and the refresh button still reads the sheet', () => {
    const { ctx, load, sheets, reads } = setup();
    ctx.warmAdminDataCache();
    ctx.saveRemark = () => ({ status: 'success' });
    sheets.Data[0].Name = 'แก้หลังบันทึก';
    ctx.doPost({ postData: { contents: JSON.stringify({ action: 'saveRemark', password: 'pw', id: 'GFS0', remark: 'x' }) } });
    assert.equal(load().data[0].name, 'แก้หลังบันทึก');
    const before = reads();
    load(true);
    assert.equal(reads(), before + 1);
});

test('installing the warm-up leaves exactly one 5-minute trigger and fills the cache', () => {
    const { ctx, triggers, load, reads } = setup();
    ctx.installAdminCacheTrigger();
    ctx.installAdminCacheTrigger();
    assert.equal(triggers.length, 1);
    assert.equal(triggers[0].handler, 'warmAdminDataCache');
    assert.equal(triggers[0].minutes, 5);
    const before = reads();
    load();
    assert.equal(reads(), before);
});

test('the warm-up reads the sheets only from 07:00 to 17:59', () => {
    const { ctx, reads } = setup();
    for (const [hour, runs] of [[6, false], [7, true], [12, true], [17, true], [18, false], [23, false]]) {
        clock.hour = hour;
        const before = reads();
        ctx.warmAdminDataCache();
        assert.equal(reads() - before, runs ? 1 : 0, 'hour ' + hour);
    }
});

test('installing the warm-up at night still fills the cache once', () => {
    const { ctx, load, reads } = setup();
    clock.hour = 22;
    ctx.installAdminCacheTrigger();
    assert.equal(reads(), 1);
    load();
    assert.equal(reads(), 1);
});
