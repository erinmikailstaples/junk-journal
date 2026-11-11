import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const script = await readFile(new URL('../assets/js/journal.js', import.meta.url), 'utf8');
const modeScript = await readFile(new URL('../assets/js/mode.js', import.meta.url), 'utf8');

function setup(hash = '') {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button class="mode-toggle" hidden aria-pressed="false"><span data-mode-label></span></button>
        <div class="mode-status" role="status"></div>
        <nav><a href="/#home" data-section="home">Home</a><a href="/#about" data-section="about">About</a></nav>
        <section id="home" data-journal-page><h1>Home</h1><a href="#about" data-section-link>About</a></section>
        <section id="about" data-journal-page><h2>About</h2><h3 id="nested">Nested heading</h3></section>
        </body></html>`, { url: `https://example.test/${hash}`, runScripts: 'outside-only' });
    dom.window.HTMLElement.prototype.scrollIntoView = function () {};
    return dom;
}

test('journal opens a deep-linked section and marks its navigation', () => {
    const { window } = setup('#about');
    window.eval(script);
    assert.equal(window.document.querySelector('#home').hidden, true);
    assert.equal(window.document.querySelector('#about').hidden, false);
    assert.equal(window.document.querySelector('[data-section="about"]').getAttribute('aria-current'), 'location');
    window.close();
});

test('plain mode exposes every page and persists when returning to the journal', () => {
    const { window } = setup();
    window.eval(script);
    const button = window.document.querySelector('button');
    button.click();
    assert.equal(window.document.documentElement.dataset.mode, 'plain');
    assert.equal(window.localStorage.getItem('ems-site-mode'), 'plain');
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.equal(window.document.querySelectorAll('[data-journal-page][hidden]').length, 0);
    button.click();
    assert.equal(window.document.querySelector('#about').hidden, true);
    assert.equal(button.getAttribute('aria-pressed'), 'false');
    window.close();
});

test('saved plain mode is applied before the interactive script runs', () => {
    const { window } = setup();
    window.localStorage.setItem('ems-site-mode', 'plain');
    window.eval(modeScript);
    assert.equal(window.document.documentElement.dataset.mode, 'plain');
    window.eval(script);
    assert.equal(window.document.querySelectorAll('[hidden]').length, 0);
    window.close();
});

test('unavailable storage keeps mode switching functional and explains persistence failure', () => {
    const { window } = setup();
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Unavailable'); } });
    assert.doesNotThrow(() => window.eval(modeScript));
    window.eval(script);
    window.document.querySelector('button').click();
    assert.equal(window.document.documentElement.dataset.mode, 'plain');
    assert.match(window.document.querySelector('[role="status"]').textContent, /cannot save/);
    window.close();
});

test('history navigation changes pages and moves focus to the destination heading', () => {
    const { window } = setup();
    window.eval(script);
    window.history.replaceState({}, '', '/#about');
    window.dispatchEvent(new window.HashChangeEvent('hashchange'));
    assert.equal(window.document.activeElement.textContent, 'About');
    assert.equal(window.document.querySelector('#home').hidden, true);
    window.history.replaceState({}, '', '/#home');
    window.dispatchEvent(new window.HashChangeEvent('hashchange'));
    assert.equal(window.document.activeElement.textContent, 'Home');
    window.close();
});

test('unknown fragments keep a readable home and nested content fragments reveal their page', () => {
    const { window } = setup('#missing');
    window.eval(script);
    assert.equal(window.document.querySelector('#home').hidden, false);
    window.history.replaceState({}, '', '/#nested');
    window.dispatchEvent(new window.HashChangeEvent('hashchange'));
    assert.equal(window.document.querySelector('#about').hidden, false);
    window.close();
});

test('article pages without journal sections still support plain mode', () => {
    const { window } = setup();
    window.document.querySelectorAll('[data-journal-page]').forEach(page => page.remove());
    assert.doesNotThrow(() => window.eval(script));
    window.document.querySelector('button').click();
    assert.equal(window.document.documentElement.dataset.mode, 'plain');
    window.close();
});
