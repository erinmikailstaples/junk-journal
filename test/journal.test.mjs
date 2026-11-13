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

function addIntroduction(window, section, text) {
    const introduction = window.document.createElement('div');
    introduction.setAttribute('data-reno-introduction', '');
    const paragraph = window.document.createElement('p');
    paragraph.textContent = text;
    introduction.append(paragraph);
    window.document.querySelector(section).append(introduction);
    return introduction;
}

function pointerEvent(window, type, pointerType) {
    const event = new window.Event(type);
    Object.defineProperty(event, 'pointerType', { value: pointerType });
    return event;
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

test('Reno video enhances matching introductions without changing their text', () => {
    for (const text of ['Brooklyn by way of Reno, NV.', 'From Reno Nevada to Brooklyn.', 'From Reno, Nevada to Brooklyn.']) {
        const { window } = setup();
        const introduction = addIntroduction(window, '#home', text);
        window.eval(script);
        const trigger = introduction.querySelector('.reno-video-trigger');
        assert.ok(trigger);
        assert.equal(introduction.querySelector('p').textContent, text);
        assert.equal(trigger.getAttribute('aria-label'), `${trigger.textContent} (play video)`);
        assert.equal(trigger.getAttribute('aria-expanded'), 'false');
        assert.equal(introduction.querySelector('.reno-video-panel').hidden, true);
        assert.equal(introduction.querySelector('iframe').hasAttribute('src'), false);
        window.close();
    }

    const { window } = setup();
    const introduction = addIntroduction(window, '#home', 'A different introduction.');
    window.eval(script);
    assert.equal(introduction.textContent, 'A different introduction.');
    assert.equal(introduction.querySelector('button'), null);
    window.close();
});

test('Reno video opens from hover or activation and stops when closed', () => {
    const { window } = setup();
    const introduction = addIntroduction(window, '#home', 'Brooklyn by way of Reno, NV.');
    window.eval(script);
    const trigger = introduction.querySelector('.reno-video-trigger');
    const panel = introduction.querySelector('.reno-video-panel');
    const frame = panel.querySelector('iframe');

    trigger.dispatchEvent(pointerEvent(window, 'pointerenter', 'touch'));
    assert.equal(panel.hidden, true);
    trigger.dispatchEvent(pointerEvent(window, 'pointerenter', 'mouse'));
    assert.equal(panel.hidden, false);
    const url = new URL(frame.src);
    assert.equal(url.origin + url.pathname, 'https://www.youtube.com/embed/F7F67QGlaaY');
    assert.equal(url.searchParams.get('start'), '107');
    assert.equal(url.searchParams.get('autoplay'), '1');
    assert.equal(url.searchParams.get('mute'), '0');
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    const link = panel.querySelector('a');
    assert.equal(new URL(link.href).searchParams.get('t'), '107s');
    assert.match(link.textContent, /1:47/);

    introduction.dispatchEvent(pointerEvent(window, 'pointerleave', 'mouse'));
    assert.equal(panel.hidden, true);
    assert.equal(frame.hasAttribute('src'), false);
    trigger.dispatchEvent(pointerEvent(window, 'pointerenter', 'mouse'));
    trigger.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }));
    panel.querySelector('.reno-video-close').focus();
    introduction.dispatchEvent(pointerEvent(window, 'pointerleave', 'mouse'));
    assert.equal(panel.hidden, true);
    assert.equal(frame.hasAttribute('src'), false);
    assert.equal(window.document.activeElement, trigger);

    trigger.click();
    introduction.dispatchEvent(pointerEvent(window, 'pointerleave', 'mouse'));
    assert.equal(panel.hidden, false);
    panel.querySelector('.reno-video-close').focus();
    panel.querySelector('.reno-video-close').click();
    assert.equal(panel.hidden, true);
    assert.equal(frame.hasAttribute('src'), false);
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(window.document.activeElement, trigger);
    window.close();
});

test('Reno video stops when its journal page is hidden', () => {
    const { window } = setup();
    const home = addIntroduction(window, '#home', 'From Reno, NV.');
    const about = addIntroduction(window, '#about', 'From Reno, Nevada.');
    window.eval(script);
    assert.notEqual(home.querySelector('.reno-video-panel').id, about.querySelector('.reno-video-panel').id);
    home.querySelector('.reno-video-trigger').click();
    assert.equal(home.querySelector('.reno-video-panel').hidden, false);
    window.history.replaceState({}, '', '/#about');
    window.dispatchEvent(new window.HashChangeEvent('hashchange'));
    assert.equal(home.querySelector('.reno-video-panel').hidden, true);
    assert.equal(home.querySelector('iframe').hasAttribute('src'), false);
    assert.equal(window.document.activeElement.textContent, 'About');
    window.close();
});

test('opening a second Reno video stops the first in plain mode', () => {
    const { window } = setup();
    window.document.documentElement.dataset.mode = 'plain';
    const home = addIntroduction(window, '#home', 'From Reno, NV.');
    const about = addIntroduction(window, '#about', 'From Reno, Nevada.');
    window.eval(script);
    home.querySelector('.reno-video-trigger').click();
    home.querySelector('.reno-video-close').focus();
    about.querySelector('.reno-video-trigger').dispatchEvent(pointerEvent(window, 'pointerenter', 'mouse'));
    assert.equal(home.querySelector('.reno-video-panel').hidden, true);
    assert.equal(home.querySelector('iframe').hasAttribute('src'), false);
    assert.equal(about.querySelector('.reno-video-panel').hidden, false);
    assert.equal(window.document.activeElement, home.querySelector('.reno-video-trigger'));
    window.close();
});

test('New York and Reno triggers preserve the introduction and stop each other', () => {
    const { window } = setup();
    const text = 'Brooklyn, NYC, by way of Reno, NV.';
    const introduction = addIntroduction(window, '#home', text);
    window.eval(script);
    const ny = introduction.querySelector('.new-york-video-trigger');
    const panel = introduction.querySelector('.new-york-video-panel');
    const reno = introduction.querySelector('.reno-video-trigger');
    const frame = panel.querySelector('iframe');
    assert.equal(introduction.querySelector('p').textContent, text);
    assert.equal(ny.textContent, 'Brooklyn, NYC');
    ny.dispatchEvent(pointerEvent(window, 'pointerenter', 'mouse'));
    assert.equal(new URL(frame.src).origin + new URL(frame.src).pathname, 'https://www.youtube-nocookie.com/embed/0K39q4GEeVw');
    assert.equal(window.document.querySelectorAll('.new-york-rain span').length, 20);
    assert.equal(window.document.querySelector('.new-york-rain').getAttribute('aria-hidden'), 'true');
    introduction.dispatchEvent(pointerEvent(window, 'pointerleave', 'mouse'));
    assert.equal(panel.hidden, true);
    assert.equal(frame.hasAttribute('src'), false);
    assert.equal(window.document.querySelector('.new-york-rain'), null);
    ny.click();
    assert.equal(panel.hidden, false);
    reno.click();
    assert.equal(panel.hidden, true);
    assert.equal(window.document.querySelector('.new-york-rain'), null);
    assert.equal(introduction.querySelector('.reno-video-panel').hidden, false);
    ny.click();
    window.dispatchEvent(new window.Event('pagehide'));
    assert.equal(panel.hidden, true);
    assert.equal(window.document.querySelector('.new-york-rain'), null);
    window.close();
});

test('New York player closes on navigation and supports alternate introductions', () => {
    for (const text of ['New York, NY.', 'From Brooklyn.']) {
        const { window } = setup();
        const introduction = addIntroduction(window, '#home', text);
        window.eval(script);
        const trigger = introduction.querySelector('.new-york-video-trigger');
        assert.ok(trigger);
        trigger.click();
        window.history.replaceState({}, '', '/#about');
        window.dispatchEvent(new window.HashChangeEvent('hashchange'));
        assert.equal(introduction.querySelector('.new-york-video-panel').hidden, true);
        assert.equal(window.document.querySelector('.new-york-rain'), null);
        window.close();
    }
});

test('Escape dismisses pinned New York and Reno players without stealing outside focus', () => {
    for (const name of ['new-york', 'reno']) {
        const { window } = setup();
        const introduction = addIntroduction(window, '#home', 'Brooklyn, NYC, by way of Reno, NV.');
        window.eval(script);
        const trigger = introduction.querySelector(`.${name}-video-trigger`);
        const panel = introduction.querySelector(`.${name}-video-panel`);
        const outside = window.document.querySelector('.mode-toggle');
        trigger.focus();
        trigger.click();
        outside.focus();
        window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
        assert.equal(panel.hidden, true);
        assert.equal(panel.querySelector('iframe').hasAttribute('src'), false);
        assert.equal(window.document.querySelector('.new-york-rain'), null);
        assert.equal(window.document.activeElement, outside);

        trigger.click();
        panel.querySelector('.reno-video-close').focus();
        window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
        assert.equal(panel.hidden, true);
        assert.equal(window.document.activeElement, trigger);
        window.close();
    }
});
