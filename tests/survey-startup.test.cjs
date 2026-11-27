const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// A stand-in for any DOM element or collection: every property read returns
// another stand-in, and calling it returns one too, so start-up code can touch
// the page freely. Only elements the real page lacks come back as null.
function stub() {
    const target = function () {};
    return new Proxy(target, {
        get: (t, key) => {
            if (key === Symbol.iterator) return function* () {};
            if (key === Symbol.toPrimitive) return () => '';
            if (key === 'length') return 0;
            if (key === 'then') return undefined;
            if (!(key in t)) t[key] = stub();
            return t[key];
        },
        set: (t, key, value) => { t[key] = value; return true; },
        apply: () => stub()
    });
}

function openSurvey(search, fetchImpl = () => new Promise(() => {})) {
    const missing = new Set(['install-date', 'sound-toggle', 'site-type', 'thankyou-review-banner']);
    const listeners = {};
    const requests = [];
    const stored = new Map();
    const ctx = vm.createContext({
        URLSearchParams,
        console: { log() {}, warn() {}, error() {} },
        lucide: { createIcons() {} },
        alert: message => { throw new Error('unexpected alert: ' + message); },
        fetch: (url, options) => { requests.push(String(url)); return fetchImpl(url, options); },
        Blob,
        setTimeout: () => 0,
        localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, String(value)), removeItem: key => stored.delete(key) },
        window: {
            location: { search, href: 'https://solar-film.github.io/feedback/' + search },
            // Sound effects need an AudioContext, which browsers have and Node does not.
            AudioContext: function () { return stub(); },
            addEventListener: (type, fn) => { listeners['window:' + type] = fn; }
        },
        document: {
            addEventListener: (type, fn) => { listeners[type] = fn; },
            getElementById: id => (missing.has(id) ? null : stub()),
            querySelector: () => stub(),
            querySelectorAll: () => [],
            createElement: () => stub(),
            body: stub()
        }
    });
    ctx.window.document = ctx.document;
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8') + '\nglobalThis.surveyState = state;', ctx);
    return { ctx, listeners, requests };
}

test('the survey page starts without errors when opened from a customer link', () => {
    const { ctx, listeners, requests } = openSurvey('?id=K071126064');
    assert.equal(typeof listeners.DOMContentLoaded, 'function');
    assert.doesNotThrow(() => listeners.DOMContentLoaded());
    assert.equal(ctx.surveyState.formData.id, 'K071126064');
    // No lookup and no loading screen: the survey only needs the ID.
    assert.deepEqual(requests, []);
});

test('a link with contact details but no ID still fills them in', () => {
    const { ctx, listeners } = openSurvey('?name=%20คุณเอ%20&phone=0812345678');
    listeners.DOMContentLoaded();
    assert.equal(ctx.surveyState.formData.name, 'คุณเอ');
    assert.equal(ctx.surveyState.formData.phone, '0812345678');
});

test('submitting shows the thank-you screen at once and saves in the background', () => {
    const calls = [];
    const { ctx } = openSurvey('?id=K1', (url, options) => { calls.push(options); return new Promise(() => {}); });
    const screens = [];
    ctx.changeScreen = id => screens.push(id);
    ctx.submitSurvey();
    assert.deepEqual(screens, ['screen-thankyou'], 'thank-you shown without waiting for Apps Script');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].keepalive, true);
    assert.equal(JSON.parse(calls[0].body).id, 'K1');
});

test('the review click is recorded only after the survey save has finished', async () => {
    let finishSave;
    const calls = [];
    const { ctx } = openSurvey('?id=K1', (url, options) => {
        calls.push(JSON.parse(options.body));
        return calls.length === 1 ? new Promise(resolve => { finishSave = resolve; }) : Promise.resolve();
    });
    ctx.changeScreen = () => {};
    ctx.submitSurvey();
    ctx.clickGoogleMaps();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.length, 1, 'review update waits for the save');
    finishSave();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.length, 2);
    assert.equal(calls[1].action, 'updateReviewStatus');
    assert.equal(calls[1].id, 'K1');
});

test('later-screen images load after the page loads, or when their screen opens', () => {
    const { ctx, listeners } = openSurvey('?id=K1');
    const image = { attrs: { 'data-src': 'images/2-5.webp' }, src: '' };
    image.getAttribute = name => image.attrs[name];
    image.removeAttribute = name => { delete image.attrs[name]; };
    ctx.loadDeferredImages({ querySelectorAll: selector => (selector === 'img[data-src]' && image.attrs['data-src'] ? [image] : []) });
    assert.equal(image.src, 'images/2-5.webp');
    assert.equal(image.attrs['data-src'], undefined);
    assert.equal(typeof listeners['window:load'], 'function');
});
