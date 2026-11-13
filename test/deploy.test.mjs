import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { adminToken, activationUrl, activateTheme } from '../scripts/activate-ghost-theme.mjs';

const apiKey = 'abc123:' + '0f'.repeat(32);

test('admin token is a short-lived HS256 JWT signed with the hex-decoded secret', () => {
    const [header, payload, signature] = adminToken(apiKey, 1_700_000_000_000).split('.');
    assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url')), { alg: 'HS256', typ: 'JWT', kid: 'abc123' });
    assert.deepEqual(JSON.parse(Buffer.from(payload, 'base64url')), { iat: 1_700_000_000, exp: 1_700_000_300, aud: '/admin/' });
    assert.equal(signature, createHmac('sha256', Buffer.from('0f'.repeat(32), 'hex')).update(`${header}.${payload}`).digest('base64url'));
    assert.throws(() => adminToken('content-api-key'), /id:secret/);
});

test('activation URL targets the named theme and requires HTTPS', () => {
    assert.equal(activationUrl('https://site.ghost.io/', 'erin-junk-journal'), 'https://site.ghost.io/ghost/api/admin/themes/erin-junk-journal/activate/');
    assert.equal(activationUrl('https://example.com/blog', 'erin-junk-journal'), 'https://example.com/blog/ghost/api/admin/themes/erin-junk-journal/activate/');
    assert.throws(() => activationUrl('http://site.ghost.io', 'erin-junk-journal'), /HTTPS/);
});

test('activation sends an authenticated PUT and fails unless Ghost reports the theme active', async () => {
    const calls = [];
    const respond = (status, body) => async (url, init) => { calls.push({ url, init }); return { ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) }; };
    const active = await activateTheme({ apiUrl: 'https://site.ghost.io', apiKey, themeName: 'erin-junk-journal', fetchImpl: respond(200, { themes: [{ name: 'erin-junk-journal', active: true }] }) });
    assert.equal(active.name, 'erin-junk-journal');
    assert.equal(calls[0].init.method, 'PUT');
    assert.match(calls[0].init.headers.Authorization, /^Ghost [\w-]+\.[\w-]+\.[\w-]+$/);
    assert.equal(calls[0].init.headers['Accept-Version'], 'v5.0');
    await assert.rejects(activateTheme({ apiUrl: 'https://site.ghost.io', apiKey, themeName: 'erin-junk-journal', fetchImpl: respond(422, { errors: [{ message: 'Theme is invalid' }] }) }), /HTTP 422.*Theme is invalid/);
    await assert.rejects(activateTheme({ apiUrl: 'https://site.ghost.io', apiKey, themeName: 'erin-junk-journal', fetchImpl: respond(200, { themes: [{ name: 'casper', active: true }] }) }), /did not report/);
});

test('main deploys replace and activate one stable theme instead of per-commit uploads', () => {
    const workflow = readFileSync(new URL('../.github/workflows/ghost-theme.yml', import.meta.url), 'utf8');
    assert.match(workflow, /file: dist\/erin-junk-journal\.zip/);
    assert.match(workflow, /node scripts\/activate-ghost-theme\.mjs erin-junk-journal/);
    assert.doesNotMatch(workflow, /erin-junk-journal-\$\{/);
});
