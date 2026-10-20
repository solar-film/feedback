const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function backendSetup() {
    let reads = 0;
    const store = new Map();
    const ctx = vm.createContext({
        CacheService: { getScriptCache: () => ({ get: key => store.get(key) ?? null, put: (key, value) => store.set(key, value) }) }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../Code.gs'), 'utf8'), ctx);
    ctx.jsonResponse = value => value;
    ctx.getAdminPassword = () => 'pw';
    ctx.getSheetData = () => { reads++; return []; };
    const post = body => ctx.doPost({ postData: { contents: JSON.stringify(body) } });
    return { ctx, store, post, reads: () => reads };
}

test('checkPassword answers without reading sheets or clearing the admin cache', () => {
    const { store, post, reads } = backendSetup();
    store.set('admin-detailed-version', 'v1');
    assert.deepEqual({ ...post({ action: 'checkPassword', password: 'pw' }) }, { status: 'success' });
    assert.match(post({ action: 'checkPassword', password: 'wrong' }).message, /Unauthorized/);
    assert.match(post({ action: 'checkPassword' }).message, /Unauthorized/);
    assert.equal(reads(), 0);
    assert.equal(store.get('admin-detailed-version'), 'v1');
});

function frontendSetup({ savedData, respond }) {
    const stored = new Map(savedData ? [['admin_dashboard_cache', '[]']] : []);
    const elements = {};
    const element = id => (elements[id] ||= { id, value: id === 'admin-password' ? 'pw' : '', innerHTML: '', innerText: '', disabled: false, style: {} });
    const calls = [];
    const ctx = vm.createContext({
        URL,
        crypto: globalThis.crypto,
        TextEncoder,
        document: { addEventListener() {}, getElementById: element },
        console: { error() {}, warn() {} },
        lucide: { createIcons() {} },
        localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) },
        fetch: async (url, options) => {
            const body = JSON.parse(options.body);
            calls.push(body);
            return { ok: true, status: 200, json: async () => respond(body) };
        }
    });
    ctx.window = ctx;
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../admin/app.js'), 'utf8'), ctx);
    const logins = [];
    ctx.checkLoginStatus = initialData => { logins.push(initialData); };
    const login = () => ctx.handleLogin({ preventDefault() {} });
    return { ctx, stored, calls, logins, element, login };
}

const fullData = { status: 'success', data: [{ id: 'A' }] };

test('a device with saved data logs in after the password check alone', async () => {
    const { calls, logins, stored, login } = frontendSetup({ savedData: true, respond: () => ({ status: 'success' }) });
    await login();
    assert.deepEqual(calls.map(call => call.action), ['checkPassword']);
    assert.equal(calls[0].password, 'pw');
    assert.equal(stored.get('admin_password'), 'pw');
    // null makes loadData show the saved data and refresh it in the background.
    assert.deepEqual(logins, [null]);
});

test('a first login still waits for the full data, as before', async () => {
    const { calls, logins, login } = frontendSetup({ savedData: false, respond: () => fullData });
    await login();
    assert.deepEqual(calls.map(call => call.action), ['getAllCustomersDetailed']);
    assert.equal(logins[0].data[0].id, 'A');
});

test('a wrong password is rejected and not stored', async () => {
    const { logins, stored, element, login } = frontendSetup({ savedData: true, respond: () => ({ status: 'error', message: 'Unauthorized: Invalid Password' }) });
    await login();
    assert.equal(logins.length, 0);
    assert.equal(stored.has('admin_password'), false);
    assert.equal(element('login-error').innerText, 'รหัสผ่านไม่ถูกต้อง');
    assert.equal(element('login-btn').disabled, false);
});

test('an Apps Script deployment without checkPassword falls back to the full load', async () => {
    const { calls, logins, login } = frontendSetup({
        savedData: true,
        respond: body => (body.action === 'checkPassword' ? { status: 'error', message: 'Unsupported POST action: checkPassword' } : fullData)
    });
    await login();
    assert.deepEqual(calls.map(call => call.action), ['checkPassword', 'getAllCustomersDetailed']);
    assert.equal(logins[0].data[0].id, 'A');
});

test('logging in again with the accepted password on this device needs no request', async () => {
    const { ctx, calls, logins, stored, element, login } = frontendSetup({ savedData: true, respond: () => ({ status: 'success' }) });
    await login();
    assert.equal(calls.length, 1);
    const verifier = stored.get('admin_login_verifier');
    assert.ok(verifier && !verifier.includes('pw"') && !verifier.includes(':pw'), 'stores a salted hash, not the password');

    stored.delete('admin_password');
    await login();
    assert.equal(calls.length, 1, 'second login made no request');
    assert.deepEqual(logins, [null, null]);

    // A different password is never accepted locally.
    element('admin-password').value = 'other';
    await login();
    assert.equal(calls.length, 2);
    assert.equal(calls[1].password, 'other');
});

test('a saved password the server rejects returns to the login screen', async () => {
    const { ctx, stored, element } = frontendSetup({ savedData: true, respond: () => ({ status: 'error', message: 'Unauthorized: Invalid Password' }) });
    stored.set('admin_password', 'old');
    stored.set('admin_login_verifier', '{"salt":"s","hash":"h"}');
    let returnedToLogin = 0;
    ctx.checkLoginStatus = () => { returnedToLogin++; };
    for (const name of ['updateDataAndRender', 'updateApiBadge', 'showToast']) ctx[name] = () => {};
    await ctx.loadData();
    assert.equal(stored.has('admin_password'), false);
    assert.equal(stored.has('admin_login_verifier'), false);
    assert.equal(returnedToLogin, 1);
    assert.equal(element('login-error').innerText, 'รหัสผ่านไม่ถูกต้อง');
});
