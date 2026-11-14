// GitHub access through a GitHub App installed on this one repository. The App's private key lives only in the
// Worker's secrets; we mint a short-lived installation token (1 hour) and cache it.
import { bytesToB64url } from './auth.mjs';

const enc = new TextEncoder();

// GitHub hands out PKCS#1 keys ("BEGIN RSA PRIVATE KEY"); WebCrypto needs PKCS#8. Wrap if needed.
export function pemToPkcs8Der(pem) {
  const isPkcs1 = /BEGIN RSA PRIVATE KEY/.test(pem);
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), c => c.charCodeAt(0));
  if (!isPkcs1) return der;
  const len = n => n < 128 ? [n] : n < 256 ? [0x81, n] : n < 65536 ? [0x82, n >> 8, n & 255] : [0x83, n >> 16, (n >> 8) & 255, n & 255];
  const algId = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  const octet = [0x04, ...len(der.length)];
  const body = [0x02, 0x01, 0x00, ...algId, ...octet];
  return Uint8Array.from([0x30, ...len(body.length + der.length), ...body, ...der]);
}

export async function appJwt(appId, privateKeyPem, now = Date.now()) {
  const key = await crypto.subtle.importKey('pkcs8', pemToPkcs8Der(privateKeyPem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const t = Math.floor(now / 1000);
  const h = bytesToB64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const p = bytesToB64url(enc.encode(JSON.stringify({ iat: t - 60, exp: t + 540, iss: String(appId) })));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(`${h}.${p}`));
  return `${h}.${p}.${bytesToB64url(sig)}`;
}

let cached = null; // { token, exp }
export function resetTokenCache() { cached = null; }

export function makeGitHub(env, { fetchImpl = fetch, now = () => Date.now() } = {}) {
  const repo = env.GITHUB_REPO; // "owner/name"
  const base = 'https://api.github.com';
  const headers = t => ({ Authorization: `Bearer ${t}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'robotics-mena-admin' });
  async function token() {
    if (env.GITHUB_TOKEN) return env.GITHUB_TOKEN; // local development with a personal token
    if (cached && cached.exp - now() > 5 * 60e3) return cached.token;
    const jwt = await appJwt(env.GITHUB_APP_ID, env.GITHUB_APP_PRIVATE_KEY, now());
    const r = await fetchImpl(`${base}/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`, { method: 'POST', headers: headers(jwt) });
    if (!r.ok) throw Object.assign(new Error(`GitHub App token failed (HTTP ${r.status})`), { status: 502 });
    const j = await r.json(); cached = { token: j.token, exp: Date.parse(j.expires_at) }; return j.token;
  }
  async function call(method, path, body) {
    const r = await fetchImpl(`${base}${path.replace('{repo}', repo)}`, { method, headers: { ...headers(await token()), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 204) return null;
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(`GitHub: ${j.message || r.status}`), { status: r.status === 404 ? 404 : r.status === 409 || r.status === 405 || r.status === 422 ? 409 : 502 });
    return j;
  }
  return {
    repo,
    get: p => call('GET', p), post: (p, b) => call('POST', p, b), put: (p, b) => call('PUT', p, b), patch: (p, b) => call('PATCH', p, b),
    // Raw file content at a commit (works for files over 1 MB, unlike the JSON contents API). null if absent.
    async fileAt(path, ref) {
      const r = await fetchImpl(`${base}/repos/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`, { headers: { ...headers(await token()), Accept: 'application/vnd.github.raw+json' } });
      if (r.status === 404) return null;
      if (!r.ok) throw Object.assign(new Error(`GitHub: could not read ${path} (HTTP ${r.status})`), { status: 502 });
      return r.text();
    },
  };
}
