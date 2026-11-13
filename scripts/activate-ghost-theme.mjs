import { createHmac } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const base64url = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

export function adminToken(apiKey, now = Date.now()) {
    const [id, secret] = String(apiKey).split(':');
    if (!id || !secret || !/^[0-9a-f]+$/i.test(secret)) throw new Error('GHOST_ADMIN_API_KEY must be the "id:secret" Admin API key from a Ghost custom integration.');
    const iat = Math.floor(now / 1000);
    const unsigned = `${base64url({ alg: 'HS256', typ: 'JWT', kid: id })}.${base64url({ iat, exp: iat + 300, aud: '/admin/' })}`;
    const signature = createHmac('sha256', Buffer.from(secret, 'hex')).update(unsigned).digest('base64url');
    return `${unsigned}.${signature}`;
}

export function activationUrl(apiUrl, themeName) {
    const url = new URL(apiUrl);
    if (url.protocol !== 'https:') throw new Error('GHOST_ADMIN_API_URL must use HTTPS.');
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/ghost/api/admin/themes/${encodeURIComponent(themeName)}/activate/`;
    return url.href;
}

export async function activateTheme({ apiUrl, apiKey, themeName, version = 'v5.0', fetchImpl = fetch }) {
    const response = await fetchImpl(activationUrl(apiUrl, themeName), {
        method: 'PUT',
        headers: { Authorization: `Ghost ${adminToken(apiKey)}`, 'Accept-Version': version }
    });
    if (!response.ok) throw new Error(`Ghost refused to activate "${themeName}" (HTTP ${response.status}): ${(await response.text()).slice(0, 500)}`);
    const body = await response.json();
    const active = body?.themes?.find(theme => theme.active);
    if (active?.name !== themeName) throw new Error(`Ghost did not report "${themeName}" as the active theme.`);
    return active;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    const { GHOST_ADMIN_API_URL: apiUrl, GHOST_ADMIN_API_KEY: apiKey } = process.env;
    const themeName = process.argv[2] ?? 'erin-junk-journal';
    try {
        await activateTheme({ apiUrl, apiKey, themeName });
        console.log(`Activated Ghost theme "${themeName}".`);
    } catch (error) {
        console.error(`::error::${error.message}`);
        process.exit(1);
    }
}
