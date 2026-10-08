const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function backendSetup() {
    const rows = [['ID', 'Status', 'Timestamp', 'Timestamp2'], ['A', 'Sent', 'old copy', 'second copy']];
    let clock = 0;
    let locks = 0;
    let releases = 0;
    const sheet = {
        getLastRow: () => rows.length,
        getLastColumn: () => rows[0].length,
        appendRow: row => rows.push(Array.from(row)),
        insertColumnAfter: column => rows.forEach(row => row.splice(column, 0, '')),
        getRange(r, c, height = 1, width = 1) {
            const range = {
                getValue: () => rows[r - 1]?.[c - 1] ?? '',
                getValues: () => Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => rows[r + i - 1]?.[c + j - 1] ?? '')),
                getDisplayValues: () => range.getValues().map(row => row.map(String)),
                setValue(value) { rows[r - 1][c - 1] = value; return range; },
                setFontWeight() { return range; },
                setBackground() { return range; }
            };
            return range;
        }
    };
    const ctx = vm.createContext({
        Date: class extends Date { constructor() { super(Date.UTC(2026, 9, 8, 3, 0, clock++)); } },
        SpreadsheetApp: { flush() {} },
        LockService: { getScriptLock: () => ({ waitLock() { locks++; }, releaseLock() { releases++; } }) }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../Code.gs'), 'utf8'), ctx);
    ctx.ensureSheet = name => { assert.equal(name, 'GFS_Status_Log'); return sheet; };
    ctx.getSheetData = name => {
        assert.equal(name, 'GFS_Status_Log');
        return rows.slice(1).map(row => Object.fromEntries(rows[0].map((header, i) => [header, row[i] instanceof Date ? row[i].toISOString() : row[i] ?? ''])));
    };
    ctx.jsonResponse = value => value;
    ctx.getAdminPassword = () => 'test-password';
    const post = (action, fields = {}) => ctx.doPost({ postData: { contents: JSON.stringify({ action, password: 'test-password', id: 'A', ...fields }) } });
    return { ctx, rows, sheet, post, lockCounts: () => [locks, releases] };
}

test('reset survives reload, retains copy history, and later copies use the latest status row', () => {
    const { ctx, rows, post, lockCounts } = backendSetup();
    const reset = post('updateStatus', { status: 'Unsent' });
    assert.equal(reset.status, 'success');
    assert.equal(reset.statusData.status, 'Unsent');
    assert.deepEqual(Array.from(reset.statusData.linkSentAtHistory), ['old copy', 'second copy']);
    const resetTimestamp = rows[2][2].toISOString();
    assert.equal(ctx.buildStatusDataById(ctx.getSheetData('GFS_Status_Log')).A.status, 'Unsent');

    assert.equal(post('logLinkCopy').status, 'success');
    assert.equal(rows.length, 4);
    assert.equal(rows[2][1], 'Unsent');
    assert.equal(rows[2][2].toISOString(), resetTimestamp);
    post('logLinkCopy');
    assert.equal(rows.length, 4);
    assert.equal(rows[1][3], 'second copy');
    assert.ok(rows[3][3] instanceof Date);
    const afterCopy = ctx.buildStatusDataById(ctx.getSheetData('GFS_Status_Log')).A;
    assert.equal(afterCopy.status, 'Sent');
    assert.equal(afterCopy.linkSentAtHistory.length, 4);
    assert.equal(afterCopy.linkSentAtHistory.includes(resetTimestamp), false);
    assert.equal(afterCopy.linkSentAt, rows[3][3].toISOString());

    post('updateStatus', { status: 'Unsent' });
    post('logLinkCopy');
    const reloaded = ctx.buildStatusDataById(ctx.getSheetData('GFS_Status_Log')).A;
    assert.equal(reloaded.status, 'Sent');
    assert.equal(reloaded.linkSentAtHistory.length, 5);
    assert.deepEqual(lockCounts(), [5, 5]);
});

test('manual Sent writes a timestamp; invalid and unauthenticated status edits write nothing', () => {
    const { post, rows } = backendSetup();
    assert.equal(post('updateStatus', { status: 'Sent' }).statusData.linkSentAtHistory.length, 3);
    const count = rows.length;
    for (const fields of [{ id: '', status: 'Unsent' }, { status: 'Completed' }, { status: 'Unsent', password: 'wrong' }]) {
        assert.equal(post('updateStatus', fields).status, 'error');
        assert.equal(rows.length, count);
    }
});

function frontendSetup(fetch) {
    const stored = new Map([['admin_password', 'test-password']]);
    const renders = [];
    const toasts = [];
    const ctx = vm.createContext({
        window: {}, document: { addEventListener() {} }, console: { error() {} }, fetch,
        localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../admin/app.js'), 'utf8') + '\nglobalThis.testState = state;', ctx);
    for (const name of ['renderCustomerTable', 'renderKanbanBoard', 'renderKPIs', 'filterCustomerTable']) ctx[name] = () => renders.push(name);
    ctx.showToast = (text, type) => toasts.push({ text, type });
    const customer = { id: 'A', status: 'Sent', feedback: null, linkSentAt: 'second copy', linkSentAtHistory: ['old copy', 'second copy'] };
    ctx.testState.allCustomers = [customer];
    ctx.testState.customers = [customer];
    const select = { disabled: false, setAttribute() {} };
    return { ctx, customer, stored, select, renders, toasts };
}

test('manual edit waits for server confirmation, prevents duplicate saves and updates cache and filters', async () => {
    let finish;
    const calls = [];
    const { ctx, customer, stored, select, renders, toasts } = frontendSetup((url, options) => {
        calls.push(options);
        return new Promise(resolve => { finish = resolve; });
    });
    const pending = ctx.changeCustomerLinkStatus('A', 'Unsent', select);
    assert.equal(customer.status, 'Sent');
    assert.equal(select.disabled, true);
    await ctx.changeCustomerLinkStatus('A', 'Unsent', select);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].mode, undefined);
    assert.deepEqual(JSON.parse(calls[0].body), { action: 'updateStatus', id: 'A', status: 'Unsent', password: 'test-password' });
    finish({ ok: true, json: async () => ({ status: 'success', statusData: { status: 'Unsent', linkSentAt: 'second copy', linkSentAtHistory: ['old copy', 'second copy'] } }) });
    await pending;
    assert.equal(customer.status, 'Unsent');
    assert.deepEqual(customer.linkSentAtHistory, ['old copy', 'second copy']);
    assert.equal(JSON.parse(stored.get('admin_dashboard_cache'))[0].status, 'Unsent');
    assert.ok(renders.includes('renderKanbanBoard'));
    assert.equal(renders.at(-1), 'filterCustomerTable');
    assert.equal(toasts.at(-1).type, 'success');
});

test('failed writes leave status, history and cache intact; completed feedback cannot be reset', async () => {
    let calls = 0;
    const { ctx, customer, stored, select, renders, toasts } = frontendSetup(async () => {
        calls++;
        return { ok: true, json: async () => ({ status: 'error', message: 'Unauthorized' }) };
    });
    await ctx.changeCustomerLinkStatus('A', 'Unsent', select);
    assert.equal(customer.status, 'Sent');
    assert.equal(customer.linkSentAt, 'second copy');
    assert.equal(stored.has('admin_dashboard_cache'), false);
    assert.equal(toasts.at(-1).type, 'error');
    assert.equal(renders.at(-1), 'filterCustomerTable');
    customer.feedback = { timestamp: 'assessment' };
    customer.status = 'Completed';
    await ctx.changeCustomerLinkStatus('A', 'Unsent', select);
    assert.equal(calls, 1);
    assert.equal(customer.status, 'Completed');
});
