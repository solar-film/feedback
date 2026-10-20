const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup(dataRows) {
    const store = new Map();
    const reads = [];
    const sheet = {
        getLastRow: () => dataRows.length,
        getLastColumn: () => dataRows[0].length,
        getRange(r, c, height = 1, width = 1) {
            return {
                getValues() {
                    reads.push(height * width);
                    return Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => dataRows[r + i - 1]?.[c + j - 1] ?? ''));
                }
            };
        }
    };
    const cache = {
        get: key => store.get(key) ?? null,
        getAll: keys => Object.fromEntries(keys.filter(key => store.has(key)).map(key => [key, store.get(key)])),
        put(key, value) { assert.ok(Buffer.byteLength(value) < 100000, 'cache value over 100 KB'); store.set(key, value); },
        putAll(values) { Object.entries(values).forEach(([key, value]) => cache.put(key, value)); },
        remove: key => store.delete(key)
    };
    const ctx = vm.createContext({
        SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: name => (name === 'Data' ? sheet : null), getSpreadsheetTimeZone: () => 'Asia/Bangkok' }) },
        Utilities: { formatDate: value => value.toISOString() },
        CacheService: { getScriptCache: () => cache }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../Code.gs'), 'utf8'), ctx);
    ctx.jsonResponse = value => value;
    return { ctx, cache, store, reads };
}

test('customer lookup reads the ID column and one row, not the whole Data sheet', () => {
    const headers = ['ID', 'Name', 'Phone', 'InstallDate', ...Array.from({ length: 40 }, (_, i) => 'extra' + i)];
    const rows = [headers, ...Array.from({ length: 200 }, (_, i) => headers.map((_, c) => (c === 0 ? 'GFS' + i : c === 1 ? 'คุณ ' + i : 'value')))];
    const { ctx, reads } = setup(rows);
    const result = ctx.handleGetCustomer('GFS150');
    assert.equal(result.status, 'success');
    assert.equal(result.data.id, 'GFS150');
    assert.equal(result.data.name, 'คุณ 150');
    assert.ok(reads.reduce((sum, cells) => sum + cells, 0) < headers.length * 4 + rows.length, 'read more cells than needed');
    assert.equal(ctx.handleGetCustomer('missing').status, 'error');
});

test('large public payloads are cached in chunks and invalidated by the main key', () => {
    const { ctx, cache, store } = setup([['ID']]);
    const text = JSON.stringify({ status: 'success', data: 'ข้อมูลภาษาไทย'.repeat(20000) });
    ctx.writeChunkedCache(cache, 'public-presentation-v2', text, 60);
    assert.ok(store.size > 2);
    assert.equal(ctx.readChunkedCache(cache, 'public-presentation-v2'), text);

    // savePresentationOverride removes only the main key; that must hide every chunk.
    cache.remove('public-presentation-v2');
    assert.equal(ctx.readChunkedCache(cache, 'public-presentation-v2'), null);
});

test('a missing chunk falls back to a live read and small payloads use one key', () => {
    const { ctx, cache, store } = setup([['ID']]);
    const text = 'x'.repeat(70000);
    ctx.writeChunkedCache(cache, 'key', text, 60);
    store.delete([...store.keys()].find(key => key.endsWith(':1')));
    assert.equal(ctx.readChunkedCache(cache, 'key'), null);

    ctx.writeChunkedCache(cache, 'small', '{"status":"success"}', 60);
    assert.equal(store.get('small'), '{"status":"success"}');
    assert.equal(ctx.readChunkedCache(cache, 'small'), '{"status":"success"}');
});

function adminSetup() {
    const env = setup([['ID']]);
    const sheets = { Data: [{ ID: 'A', Name: 'คุณเอ' }], GFS_Care_Quest: [], GFS_Status_Log: [], Gift: [], remark: [] };
    let reads = 0;
    env.ctx.getSheetData = name => { if (name === 'Data') reads++; return sheets[name]; };
    env.ctx.getPresentationOverridesById = () => ({});
    env.ctx.getAdminPassword = () => 'pw';
    env.ctx.saveRemark = () => ({ status: 'success' });
    env.ctx.saveFeedback = () => ({ status: 'success' });
    env.ctx.ContentService = { MimeType: { JSON: 'json' }, createTextOutput: text => ({ text, setMimeType() { return this; } }) };
    const post = body => env.ctx.doPost({ postData: { contents: JSON.stringify({ password: 'pw', ...body }) } });
    const load = fresh => JSON.parse(post({ action: 'getAllCustomersDetailed', ...(fresh ? { fresh: true } : {}) }).text);
    return { ...env, sheets, post, load, reads: () => reads };
}

test('admin data is cached, cleared by any write and bypassed by the refresh button', () => {
    const { sheets, post, load, reads } = adminSetup();
    assert.equal(load().data[0].name, 'คุณเอ');
    sheets.Data[0].Name = 'แก้ในชีต';
    assert.equal(load().data[0].name, 'คุณเอ');
    assert.equal(reads(), 1);

    assert.equal(load(true).data[0].name, 'แก้ในชีต');
    sheets.Data[0].Name = 'หลังบันทึก';
    post({ action: 'saveRemark', id: 'A', remark: 'note' });
    assert.equal(load().data[0].name, 'หลังบันทึก');

    // Survey submissions are unauthenticated writes and must also clear it.
    sheets.Data[0].Name = 'หลังลูกค้าส่งแบบประเมิน';
    post({ id: 'A', teamFeedback: {}, overall: {} });
    assert.equal(load().data[0].name, 'หลังลูกค้าส่งแบบประเมิน');
});

test('a read that started before a write cannot serve its result afterwards', () => {
    const { ctx, sheets, load } = adminSetup();
    const realGetSheetData = ctx.getSheetData;
    let wrote = false;
    ctx.getSheetData = name => {
        const rows = realGetSheetData(name);
        // A write lands while this read is still building its response.
        if (name === 'Data' && !wrote) { wrote = true; ctx.invalidateAdminData(); sheets.Data = [{ ID: 'A', Name: 'ใหม่' }]; }
        return rows;
    };
    assert.equal(load().data[0].name, 'คุณเอ');
    assert.equal(load().data[0].name, 'ใหม่');
});
