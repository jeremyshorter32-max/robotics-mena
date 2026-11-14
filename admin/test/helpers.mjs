// Test helpers: a fake Cloudflare Access issuer (real RS256 signatures) and a fake GitHub API.
import { generateKeyPairSync } from 'node:crypto';
import { bytesToB64url } from '../src/auth.mjs';

export const TEAM = 'roboticsmena.cloudflareaccess.com', AUD = 'test-aud-123';
export const ROLES = JSON.stringify({ 'owner@example.com': 'owner', 'editor@example.com': 'editor', 'viewer@example.com': 'viewer' });
export const ENV = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD, ROLES, GITHUB_REPO: 'acme/robotics-mena', GITHUB_TOKEN: 'test' };

const enc = new TextEncoder();
export async function makeIssuer() {
  const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  const fetchImpl = async url => (url === `https://${TEAM}/cdn-cgi/access/certs` ? { ok: true, json: async () => ({ keys: [jwk] }) } : { ok: false, status: 404 });
  async function token(claims = {}, header = {}) {
    const now = Math.floor(Date.now() / 1000);
    const h = bytesToB64url(enc.encode(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT', ...header })));
    const p = bytesToB64url(enc.encode(JSON.stringify({ iss: `https://${TEAM}`, aud: [AUD], email: 'owner@example.com', iat: now, exp: now + 3600, ...claims })));
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, enc.encode(`${h}.${p}`));
    return `${h}.${p}.${bytesToB64url(sig)}`;
  }
  return { token, fetchImpl };
}

export function pkcs1Pem() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return { pem: privateKey.export({ type: 'pkcs1', format: 'pem' }), publicKey };
}

// Minimal in-memory GitHub with one open agent PR.
export function fakeGitHub({ branch = 'scan/2026-11-16-1', files = null, headSha = 'abc123', base = '[]', head = null, mergeable = true } = {}) {
  const calls = [];
  const added = { id: 'newco', name: 'NewCo Robotics', country: 'AE', source_url: 'https://example.com/newco', added: '2026-11-16' };
  const fileList = files || [{ filename: 'data/companies.json', status: 'modified', additions: 10, deletions: 0 }];
  const pr = { number: 7, state: 'open', title: 'Weekly scan: new database entries', body: 'Summary', draft: false, mergeable,
    base: { ref: 'main', sha: 'base000' }, head: { ref: branch, sha: headSha }, html_url: 'https://github.com/acme/robotics-mena/pull/7', created_at: '2026-11-16T05:00:00Z', user: { login: 'bot' } };
  const gh = {
    calls,
    get: async p => { calls.push(['GET', p]);
      if (p.startsWith('/repos/{repo}/pulls?')) return [pr];
      if (p === '/repos/{repo}/pulls/7') return pr;
      if (p.startsWith('/repos/{repo}/pulls/7/files')) return fileList;
      if (p.startsWith('/repos/{repo}/actions/runs')) return { workflow_runs: [{ id: 1, name: 'Deploy site', event: 'push', status: 'completed', conclusion: 'success', created_at: '2026-11-16T05:00:00Z', html_url: 'https://x' }] };
      throw Object.assign(new Error('not found'), { status: 404 }); },
    post: async (p, b) => { calls.push(['POST', p, b]); return p === '/repos/{repo}/issues' ? { number: 99, html_url: 'https://github.com/acme/robotics-mena/issues/99' } : {}; },
    put: async (p, b) => { calls.push(['PUT', p, b]); return { merged: true, sha: 'merged1' }; },
    patch: async (p, b) => { calls.push(['PATCH', p, b]); return {}; },
    fileAt: async (path, ref) => (ref === 'base000' ? base : head ?? JSON.stringify([added])),
  };
  return gh;
}

export const req = (path, { method = 'GET', token, body, origin = 'https://admin.example.workers.dev', ctype = 'application/json', host = 'https://admin.example.workers.dev' } = {}) =>
  new Request(host + path, { method, headers: { ...(token ? { 'Cf-Access-Jwt-Assertion': token } : {}), ...(method !== 'GET' && origin ? { Origin: origin } : {}), ...(method !== 'GET' && ctype ? { 'Content-Type': ctype } : {}) }, body: body ? JSON.stringify(body) : undefined });
