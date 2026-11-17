// Who is calling, and may they do this?
//
// Every request reaches the Worker only after Cloudflare Access has signed the person in (Google, allow-listed emails).
// Access adds a signed JWT in the Cf-Access-Jwt-Assertion header; we verify it ourselves (signature, issuer, audience,
// expiry) so a request that somehow bypasses Access is still refused. The verified email is then mapped to a role from
// the ROLES secret, e.g. {"owner@example.com":"owner","editor@example.com":"editor"}. Unknown emails get nothing.

export const RANK = { viewer: 1, editor: 2, owner: 3 };
const enc = new TextEncoder();

export const b64urlToBytes = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
export const bytesToB64url = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const json = s => JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));

const jwksCache = new Map(); // certsUrl -> { at, keys }
async function getKey(certsUrl, kid, fetchImpl, now) {
  let c = jwksCache.get(certsUrl);
  const stale = !c || now - c.at > 3600e3 || !c.keys.some(k => k.kid === kid);
  if (stale) {
    const r = await fetchImpl(certsUrl);
    if (!r.ok) throw new Error(`could not load Access signing keys (HTTP ${r.status})`);
    c = { at: now, keys: (await r.json()).keys || [] }; jwksCache.set(certsUrl, c);
  }
  const jwk = c.keys.find(k => k.kid === kid);
  if (!jwk) throw new Error('unknown signing key');
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
}

// Returns the verified payload or throws.
export async function verifyAccessJwt(token, { teamDomain, aud, fetchImpl = fetch, now = Date.now() }) {
  if (!token) throw new Error('missing Access token');
  const parts = token.split('.'); if (parts.length !== 3) throw new Error('malformed token');
  const header = json(parts[0]), payload = json(parts[1]);
  if (header.alg !== 'RS256') throw new Error('unexpected algorithm');
  const iss = `https://${teamDomain}`;
  const key = await getKey(`${iss}/cdn-cgi/access/certs`, header.kid, fetchImpl, now);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
  if (!ok) throw new Error('bad signature');
  if (payload.iss !== iss) throw new Error('wrong issuer');
  if (![].concat(payload.aud).includes(aud)) throw new Error('wrong audience');
  const t = Math.floor(now / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < t - 30) throw new Error('token expired');
  if (typeof payload.nbf === 'number' && payload.nbf > t + 30) throw new Error('token not yet valid');
  if (!payload.email) throw new Error('token has no email');
  return payload;
}

export function roleFor(email, rolesJson) {
  let roles = {};
  try { roles = JSON.parse(rolesJson || '{}'); } catch { return null; }
  const r = Object.entries(roles).find(([e]) => e.toLowerCase() === String(email).toLowerCase());
  return r && RANK[r[1]] ? r[1] : null;
}

// Resolves the caller: { email, role } or throws an Error with .status.
export async function identify(request, env, deps = {}) {
  const url = new URL(request.url);
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  let email;
  if (env.DEV_AUTH_EMAIL && local && !env.ACCESS_AUD) email = env.DEV_AUTH_EMAIL; // local development only
  else {
    if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw Object.assign(new Error('Access is not configured'), { status: 500 });
    try { email = (await verifyAccessJwt(request.headers.get('Cf-Access-Jwt-Assertion'), { teamDomain: env.ACCESS_TEAM_DOMAIN, aud: env.ACCESS_AUD, ...deps })).email; }
    catch (e) { throw Object.assign(new Error('Not signed in: ' + e.message), { status: 401 }); }
  }
  const role = roleFor(email, env.ROLES);
  if (!role) throw Object.assign(new Error(`${email} has no access to this portal`), { status: 403 });
  return { email, role };
}

export function requireRole(user, min) {
  if (RANK[user.role] < RANK[min]) throw Object.assign(new Error(`This needs the ${min} role (you are ${user.role})`), { status: 403 });
}

// Cross-site request protection for anything that changes state: same-origin JSON only.
export function checkWrite(request) {
  const origin = request.headers.get('Origin'), self = new URL(request.url).origin;
  if (origin !== self) throw Object.assign(new Error('Cross-site request refused'), { status: 403 });
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) throw Object.assign(new Error('JSON body required'), { status: 415 });
}
