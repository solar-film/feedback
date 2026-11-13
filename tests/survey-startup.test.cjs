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

function openSurvey(search) {
    const missing = new Set(['install-date', 'sound-toggle', 'site-type', 'thankyou-review-banner']);
    const listeners = {};
    const requests = [];
    const stored = new Map();
    const ctx = vm.createContext({
        URLSearchParams,
        console: { log() {}, warn() {}, error() {} },
        lucide: { createIcons() {} },
        alert: message => { throw new Error('unexpected alert: ' + message); },
        fetch: url => { requests.push(String(url)); return new Promise(() => {}); },
        setTimeout: () => 0,
        localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, String(value)), removeItem: key => stored.delete(key) },
        window: {
            location: { search, href: 'https://solar-film.github.io/feedback/' + search },
            // Sound effects need an AudioContext, which browsers have and Node does not.
            AudioContext: function () { return stub(); }
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
