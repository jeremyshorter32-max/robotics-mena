import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handle } from '../src/index.mjs';
import { recordDiff } from '../src/inbox.mjs';
import { makeIssuer, ENV, fakeGitHub, req } from './helpers.mjs';

const iss = await makeIssuer();
const as = async email => iss.token({ email });
const call = async (r, github = fakeGitHub()) => { const res = await handle(r, ENV, { auth: { fetchImpl: iss.fetchImpl }, github }); return { res, body: res.headers.get('Content-Type').includes('json') ? await res.json() : await res.text(), github }; };

test('no Access token → 401; signed-in but not on the list → 403', async () => {
  assert.equal((await call(req('/api/me'))).res.status, 401);
  assert.equal((await call(req('/api/me', { token: await as('stranger@example.com') }))).res.status, 403);
  assert.equal((await call(req('/', { token: 'garbage' }))).res.status, 401, 'even the page itself needs a valid token');
});

test('the page is served with a strict CSP (per-request script nonce, no framing) and no-store caching', async () => {
  const { res, body } = await call(req('/', { token: await as('viewer@example.com') }));
  assert.equal(res.status, 200);
  const csp = res.headers.get('Content-Security-Policy'), nonce = /'nonce-([a-f0-9]+)'/.exec(csp)[1];
  assert.ok(body.includes(`<script nonce="${nonce}">`)); assert.match(csp, /frame-ancestors 'none'/); assert.match(csp, /default-src 'none'/);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  assert.ok(!/innerHTML|insertAdjacentHTML|eval\(|new Function/.test(fs.readFileSync(new URL('../src/ui.mjs', import.meta.url), 'utf8')), 'UI never injects HTML');
});

test('inbox lists agent PRs; an item shows record-level changes', async () => {
  const t = await as('viewer@example.com');
  const list = (await call(req('/api/inbox', { token: t }))).body;
  assert.equal(list[0].kind, 'Weekly scan'); assert.equal(list[0].agent, true);
  const it = (await call(req('/api/inbox/7', { token: t }))).body;
  assert.equal(it.approvable, true); assert.equal(it.data[0].added[0].label, 'NewCo Robotics'); assert.equal(it.data[0].added[0].country, 'AE');
});

test('an editor can approve: squash-merge pinned to the reviewed commit, attributed to them', async () => {
  const { res, body, github } = await call(req('/api/inbox/7/approve', { method: 'POST', token: await as('editor@example.com'), body: { head_sha: 'abc123' } }));
  assert.equal(res.status, 200); assert.equal(body.merged, true);
  const merge = github.calls.find(c => c[0] === 'PUT');
  assert.equal(merge[1], '/repos/{repo}/pulls/7/merge'); assert.equal(merge[2].merge_method, 'squash'); assert.equal(merge[2].sha, 'abc123');
  assert.match(merge[2].commit_message, /editor@example\.com/);
});

test('approval is refused if the PR changed since it was reviewed', async () => {
  const { res, github } = await call(req('/api/inbox/7/approve', { method: 'POST', token: await as('owner@example.com'), body: { head_sha: 'old999' } }));
  assert.equal(res.status, 409); assert.ok(!github.calls.some(c => c[0] === 'PUT'));
});

test('the portal can never publish code: non-agent branches and non-data files are refused', async () => {
  const t = await as('owner@example.com');
  for (const gh of [fakeGitHub({ branch: 'feature/x' }), fakeGitHub({ files: [{ filename: 'src/logic.js', status: 'modified', additions: 1, deletions: 0 }] }),
    fakeGitHub({ files: [{ filename: '.github/workflows/deploy.yml', status: 'modified', additions: 1, deletions: 0 }] }), fakeGitHub({ mergeable: false })]) {
    const { res, body } = await call(req('/api/inbox/7/approve', { method: 'POST', token: t, body: { head_sha: 'abc123' } }), gh);
    assert.equal(res.status, 409, JSON.stringify(body)); assert.ok(!gh.calls.some(c => c[0] === 'PUT'));
  }
});

test('viewers cannot approve, send back, reject, run agents or add leads', async () => {
  const t = await as('viewer@example.com');
  for (const [p, b] of [['/api/inbox/7/approve', { head_sha: 'abc123' }], ['/api/inbox/7/send-back', { note: 'x' }], ['/api/inbox/7/reject', {}], ['/api/runs/scan.yml', { days: 7 }], ['/api/leads', { url: 'https://example.com' }]]) {
    const { res, github } = await call(req(p, { method: 'POST', token: t, body: b }));
    assert.equal(res.status, 403, p); assert.equal(github.calls.filter(c => c[0] !== 'GET').length, 0, p);
  }
});

test('only the owner can start agent runs, and only allow-listed workflows with validated inputs', async () => {
  const e = await as('editor@example.com'), o = await as('owner@example.com');
  assert.equal((await call(req('/api/runs/scan.yml', { method: 'POST', token: e, body: { days: 7 } }))).res.status, 403);
  const ok = await call(req('/api/runs/scan.yml', { method: 'POST', token: o, body: { days: 14 } }));
  assert.equal(ok.res.status, 200);
  assert.deepEqual(ok.github.calls.find(c => c[0] === 'POST')[2], { ref: 'main', inputs: { days: '14' } });
  assert.equal((await call(req('/api/runs/deploy.yml', { method: 'POST', token: o, body: {} }))).res.status, 404);
  assert.equal((await call(req('/api/runs/scan.yml', { method: 'POST', token: o, body: { days: 999 } }))).res.status, 400);
});

test('cross-site and non-JSON writes are refused before anything happens', async () => {
  const t = await as('owner@example.com');
  for (const r of [req('/api/inbox/7/reject', { method: 'POST', token: t, body: {}, origin: 'https://evil.example' }),
    req('/api/inbox/7/reject', { method: 'POST', token: t, body: {}, origin: null }), req('/api/inbox/7/reject', { method: 'POST', token: t, body: {}, ctype: 'text/plain' })]) {
    const { res, github } = await call(r); assert.ok([403, 415].includes(res.status)); assert.equal(github.calls.length, 0);
  }
});

test('send back needs a note; reject comments and closes; leads become labelled issues', async () => {
  const t = await as('editor@example.com');
  assert.equal((await call(req('/api/inbox/7/send-back', { method: 'POST', token: t, body: { note: '  ' } }))).res.status, 400);
  const sb = await call(req('/api/inbox/7/send-back', { method: 'POST', token: t, body: { note: 'Source 2 is a paywall; find the press release.' } }));
  assert.equal(sb.res.status, 200); assert.ok(sb.github.calls.some(c => c[1] === '/repos/{repo}/issues/7/labels'));
  const rj = await call(req('/api/inbox/7/reject', { method: 'POST', token: t, body: { note: 'Duplicate' } }));
  assert.deepEqual(rj.github.calls.find(c => c[0] === 'PATCH')[2], { state: 'closed' });
  const lead = await call(req('/api/leads', { method: 'POST', token: t, body: { url: 'https://example.com/news', note: 'New AMR plant in Jeddah' } }));
  assert.equal(lead.body.number, 99); assert.deepEqual(lead.github.calls.find(c => c[1] === '/repos/{repo}/issues')[2].labels, ['lead']);
  assert.equal((await call(req('/api/leads', { method: 'POST', token: t, body: { url: 'javascript:alert(1)' } }))).res.status, 400);
});

test('recordDiff finds added, removed and changed records (with the changed fields)', () => {
  const a = JSON.stringify([{ id: 'a', name: 'A', country: 'AE' }, { id: 'b', name: 'B' }]);
  const b = JSON.stringify([{ id: 'a', name: 'A', country: 'SA' }, { id: 'c', name: 'C' }]);
  const d = recordDiff(a, b);
  assert.deepEqual(d.added.map(r => r.key), ['c']); assert.deepEqual(d.removed.map(r => r.key), ['b']);
  assert.deepEqual(d.changed[0].fields, ['country']); assert.deepEqual(d.changed[0].after, { country: 'SA' });
  assert.equal(recordDiff('{"AE":{"x":1}}', '{"AE":{"x":2},"SA":{}}').kind, 'object');
});
