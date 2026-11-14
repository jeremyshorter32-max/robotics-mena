// Robotics MENA admin portal: Cloudflare Worker entry point.
// Every route identifies the caller (Cloudflare Access JWT → email → role) before doing anything.
import { identify, requireRole, checkWrite } from './auth.mjs';
import { makeGitHub } from './github.mjs';
import { listInbox, getItem, approve, sendBack, reject } from './inbox.mjs';
import { listRuns, startRun, addLead, WORKFLOWS } from './runs.mjs';
import { page } from './ui.mjs';

const SECURITY = {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains', 'Cross-Origin-Opener-Policy': 'same-origin',
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...SECURITY, 'Content-Type': 'application/json; charset=utf-8' } });

async function body(request) {
  const text = await request.text();
  if (text.length > 20000) throw Object.assign(new Error('Request too large'), { status: 413 });
  try { return text ? JSON.parse(text) : {}; } catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}
const prNumber = s => { const n = Number(s); if (!Number.isInteger(n) || n < 1) throw Object.assign(new Error('Bad item number'), { status: 400 }); return n; };

export async function handle(request, env, deps = {}) {
  const url = new URL(request.url), method = request.method, path = url.pathname;
  try {
    const user = await identify(request, env, deps.auth);
    if (method === 'GET' && path === '/') {
      const nonce = crypto.randomUUID().replace(/-/g, '');
      return new Response(page(nonce), { headers: { ...SECURITY, 'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'` } });
    }
    if (!path.startsWith('/api/')) return json({ error: 'Not found' }, 404);
    if (method !== 'GET') checkWrite(request);
    const gh = deps.github || makeGitHub(env, deps.ghDeps);
    let m;

    if (method === 'GET' && path === '/api/me') return json({ email: user.email, role: user.role, repo: env.GITHUB_REPO, workflows: Object.entries(WORKFLOWS).map(([file, w]) => ({ file, name: w.name, role: w.role })) });
    if (method === 'GET' && path === '/api/inbox') return json(await listInbox(gh));
    if (method === 'GET' && (m = /^\/api\/inbox\/(\d+)$/.exec(path))) return json(await getItem(gh, prNumber(m[1])));
    if (method === 'POST' && (m = /^\/api\/inbox\/(\d+)\/(approve|send-back|reject)$/.exec(path))) {
      requireRole(user, 'editor');
      const b = await body(request), n = prNumber(m[1]);
      const out = m[2] === 'approve' ? await approve(gh, n, { email: user.email, headSha: b.head_sha })
        : m[2] === 'send-back' ? await sendBack(gh, n, { email: user.email, note: b.note }) : await reject(gh, n, { email: user.email, note: b.note });
      console.log(JSON.stringify({ audit: m[2], pr: n, by: user.email, at: new Date().toISOString() }));
      return json(out);
    }
    if (method === 'GET' && path === '/api/runs') return json(await listRuns(gh));
    if (method === 'POST' && (m = /^\/api\/runs\/([a-z0-9-]+\.yml)$/.exec(path))) {
      const wf = WORKFLOWS[m[1]]; if (!wf) return json({ error: 'This workflow cannot be started from the portal' }, 404);
      requireRole(user, wf.role);
      const out = await startRun(gh, m[1], await body(request));
      console.log(JSON.stringify({ audit: 'run', workflow: m[1], by: user.email, at: new Date().toISOString() }));
      return json(out);
    }
    if (method === 'POST' && path === '/api/leads') {
      requireRole(user, 'editor');
      const b = await body(request);
      return json(await addLead(gh, { url: b.url, note: b.note, email: user.email }));
    }
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) console.error(e);
    return json({ error: status >= 500 && !e.status ? 'Something went wrong' : e.message }, status);
  }
}

export default { fetch: (request, env) => handle(request, env) };
