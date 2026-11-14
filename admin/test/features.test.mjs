import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../src/index.mjs';
import { parseBacklog } from '../src/backlog.mjs';
import { databaseStats, isoWeek, getMetrics } from '../src/metrics.mjs';
import { makeIssuer, ENV, fakeGitHub, req } from './helpers.mjs';

const iss = await makeIssuer();
const as = email => iss.token({ email });
const MD = `# Development backlog

Intro text.

## Must do before going public

- [x] **Privacy page.** Published.<!-- old note -->
- [ ] **Newsletter on Kit.** Waiting on the owner,
  continued detail line.
- [ ] Plain item without bold

## Nice to have

- [ ] Hide the inbox address.
`;
const b64 = s => Buffer.from(s, 'utf8').toString('base64');

function ghWithBacklog(md = MD) {
  const gh = fakeGitHub(); let content = md; const get0 = gh.get;
  gh.get = async p => { if (p === '/repos/{repo}/contents/BACKLOG.md?ref=main') { gh.calls.push(['GET', p]); return { sha: 'sha1', content: b64(content) }; }
    if (p.startsWith('/repos/{repo}/issues?labels=agent-request')) { gh.calls.push(['GET', p]); return [
      { number: 5, title: '[Check a lead] x', state: 'open', labels: [{ name: 'agent-request' }, { name: 'request:lead' }, { name: 'in-progress' }], comments: 1, created_at: '2026-11-15T00:00:00Z', html_url: '#' },
      { number: 4, title: '[Research report] y', state: 'closed', labels: [{ name: 'agent-request' }, { name: 'request:research' }], comments: 2, created_at: '2026-11-14T00:00:00Z', html_url: '#' },
      { number: 3, title: 'a PR', pull_request: {}, labels: [] }]; }
    return get0(p); };
  const put0 = gh.put;
  gh.put = async (p, b) => { if (p === '/repos/{repo}/contents/BACKLOG.md') { gh.calls.push(['PUT', p, b]); content = Buffer.from(b.content, 'base64').toString('utf8'); return { content: {} }; } return put0(p, b); };
  gh.content = () => content;
  return gh;
}
const call = async (r, gh) => { const res = await handle(r, ENV, { auth: { fetchImpl: iss.fetchImpl }, github: gh, metrics: { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) } }); return { res, body: await res.json() }; };

test('backlog parsing: sections, done state, bold titles, continuation lines, comments stripped', () => {
  const s = parseBacklog(MD);
  assert.deepEqual(s.map(x => x.title), ['Must do before going public', 'Nice to have']);
  assert.deepEqual(s[0].items.map(i => [i.title, i.done]), [['Privacy page', true], ['Newsletter on Kit', false], ['Plain item without bold', false]]);
  assert.match(s[0].items[1].text, /continued detail line/); assert.doesNotMatch(s[0].items[0].text, /old note/);
  assert.equal(new Set(s.flatMap(x => x.items.map(i => i.id))).size, 4);
});

test('ticking an item off commits only BACKLOG.md, with the same sha and attributed to the editor', async () => {
  const gh = ghWithBacklog(), t = await as('editor@example.com');
  const { body } = await call(req('/api/backlog', { token: t }), gh);
  assert.equal(body.open, 3);
  const id = body.sections[0].items[1].id;
  const r = await call(req('/api/backlog/done', { method: 'POST', token: t, body: { id, done: true } }), gh);
  assert.equal(r.res.status, 200);
  const put = gh.calls.find(c => c[0] === 'PUT');
  assert.equal(put[1], '/repos/{repo}/contents/BACKLOG.md'); assert.equal(put[2].sha, 'sha1'); assert.equal(put[2].branch, 'main');
  assert.match(put[2].message, /editor@example\.com/); assert.match(gh.content(), /- \[x\] \*\*Newsletter on Kit\.\*\*/);
  assert.match(gh.content(), /  continued detail line\./, 'continuation lines untouched');
});

test('adding an item puts it at the end of the chosen section; unknown sections and empty text are refused', async () => {
  const gh = ghWithBacklog(), t = await as('owner@example.com');
  assert.equal((await call(req('/api/backlog/add', { method: 'POST', token: t, body: { section: 'Nice to have', text: 'Dark mode for the portal\nsecond line' } }), gh)).res.status, 200);
  const lines = gh.content().split('\n'), at = lines.findIndex(l => l.startsWith('- [ ] Dark mode for the portal second line'));
  assert.ok(at > lines.indexOf('- [ ] Hide the inbox address.')); assert.match(lines[at], /by owner@example\.com/);
  assert.equal((await call(req('/api/backlog/add', { method: 'POST', token: t, body: { section: 'Made up', text: 'x y z' } }), ghWithBacklog())).res.status, 400);
  assert.equal((await call(req('/api/backlog/add', { method: 'POST', token: t, body: { section: 'Nice to have', text: ' ' } }), ghWithBacklog())).res.status, 400);
});

test('viewers can read the backlog but not change it', async () => {
  const gh = ghWithBacklog(), t = await as('viewer@example.com');
  assert.equal((await call(req('/api/backlog', { token: t }), gh)).res.status, 200);
  assert.equal((await call(req('/api/backlog/done', { method: 'POST', token: t, body: { id: 'x', done: true } }), gh)).res.status, 403);
  assert.equal(gh.calls.filter(c => c[0] === 'PUT').length, 0);
});

test('requests become labelled issues; research and scans are owner-only; list shows status and skips PRs', async () => {
  const gh = ghWithBacklog();
  const e = await as('editor@example.com'), o = await as('owner@example.com');
  assert.equal((await call(req('/api/requests', { method: 'POST', token: e, body: { kind: 'research', text: 'Saudi humanoids' } }), gh)).res.status, 403);
  const ok = await call(req('/api/requests', { method: 'POST', token: o, body: { kind: 'research', text: 'Saudi humanoid deployments\nmore', link: 'https://example.com/a' } }), gh);
  assert.equal(ok.res.status, 200);
  const issue = gh.calls.find(c => c[1] === '/repos/{repo}/issues')[2];
  assert.deepEqual(issue.labels, ['agent-request', 'request:research']); assert.match(issue.title, /^\[Research report\] Saudi humanoid deployments$/);
  assert.match(issue.body, /owner@example\.com/);
  assert.equal((await call(req('/api/requests', { method: 'POST', token: o, body: { kind: 'lead', link: 'ftp://x' } }), gh)).res.status, 400);
  assert.equal((await call(req('/api/requests', { method: 'POST', token: o, body: { kind: 'nope', text: 'x' } }), gh)).res.status, 400);
  const list = (await call(req('/api/requests', { token: e }), gh)).body;
  assert.deepEqual(list.map(r => [r.number, r.status, r.kind]), [[5, 'in progress', 'lead'], [4, 'done', 'research']]);
});

test('ISO weeks and database growth per week', () => {
  assert.equal(isoWeek('2026-11-13'), '2026-W46'); assert.equal(isoWeek('2027-01-01'), '2026-W53');
  const now = Date.parse('2026-11-14T12:00:00Z');
  const d = databaseStats({ companies: [{ name: 'A', added: '2026-11-13' }, { name: 'B', added: '2026-11-02' }, { name: 'C' }], deployments: [{ title: 'D', added: '2026-11-13', country: 'SA' }], events: [{ date: '2026-12-08' }, { date: '2026-01-01' }] }, now);
  assert.deepEqual(d.totals, { companies: 3, deployments: 1, events: 2, upcomingEvents: 1 });
  assert.equal(d.weekly.companies.at(-1).count, 1); assert.equal(d.weekly.companies.at(-2).count, 1); assert.equal(d.weekly.deployments.at(-1).count, 1);
  assert.equal(d.recent[0].added, '2026-11-13');
});

test('metrics never fail as a whole: unconfigured or failing sources are reported per source', async () => {
  const gh = fakeGitHub(); gh.fileAt = async p => (p === 'data/companies.json' ? '[{"name":"A","added":"2026-11-13"}]' : null);
  const m = await getMetrics(gh, {}, { fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal(m.traffic.configured, false); assert.equal(m.waitlist.configured, false); assert.equal(m.database.totals.companies, 1);
  const m2 = await getMetrics(gh, { GOATCOUNTER_TOKEN: 't', SHEET_STATS_URL: 'https://s', SHEET_STATS_KEY: 'k' }, { fetchImpl: async () => { throw new Error('offline'); } });
  assert.ok(m2.waitlist.error); assert.ok(m2.traffic.errors.length >= 1);
});

test('GoatCounter figures are read with the token as a bearer header and mapped', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => { seen.push([url, init.headers.Authorization]); const p = new URL(url).pathname;
    const body = p.endsWith('/total') ? { total: 120, stats: [{ day: '2026-11-13', daily: 40 }] } : p.endsWith('/hits') ? { hits: [{ path: '/database', title: 'Database', count: 50 }] } : { stats: [{ name: 'linkedin.com', count: 9 }] };
    return { ok: true, json: async () => body }; };
  const m = await getMetrics(fakeGitHub(), { GOATCOUNTER_TOKEN: 'secret-token' }, { fetchImpl, now: Date.parse('2026-11-14T00:00:00Z') });
  assert.equal(m.traffic.visits30, 120); assert.equal(m.traffic.pages[0].path, '/database'); assert.equal(m.traffic.referrers[0].name, 'linkedin.com');
  assert.ok(seen.every(([u, a]) => u.startsWith('https://roboticsmena.goatcounter.com/api/v0/') && a === 'Bearer secret-token'));
});
