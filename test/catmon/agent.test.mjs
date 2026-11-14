import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAgent } from '../../scripts/catmon/agent.mjs';
import { memoryStore } from '../../scripts/catmon/store.mjs';
import { ConfigSchema } from '../../scripts/catmon/config.mjs';

const F = n => fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', n), 'utf8');
const BASE = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../monitoring/categorization/config.json'), 'utf8'));
const cfg = ConfigSchema.parse({ ...BASE, notifications: [{ type: 'console' }] });

// Fake network: robots.txt allows everything; each vendor page comes from a fixture the test can swap.
function fakeNet(pages) {
  const calls = [];
  const http = async (url) => {
    calls.push({ url, method: 'GET' });
    if (url.endsWith('/robots.txt')) return { ok: false, status: 404, body: '', url };
    const host = new URL(url).hostname;
    const p = pages[host]; if (p instanceof Error) return { ok: false, status: 0, body: '', url, error: p.message };
    return { ok: p.status === 200, status: p.status, body: p.body, url };
  };
  const browser = async (url) => { calls.push({ url, method: 'GET', browser: true }); const p = pages[new URL(url).hostname]; return { ok: true, status: 200, body: p.body, url }; };
  return { http, browser, calls };
}
const mockNotifier = (delivered = true) => { const sent = []; return { sent, send: async n => { sent.push(n); return [{ channel: 'mock', ok: delivered, delivered }]; } }; };
const clock = start => { let t = Date.parse(start); return { now: () => new Date(t), advance: h => { t += h * 3600e3; } }; };
const baseline = () => memoryStore(JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../monitoring/categorization/state.json'), 'utf8')));
const pagesAt = (forti, syma, mcaf) => ({
  'www.fortiguard.com': { status: 200, body: F(forti) }, 'sitereview.bluecoat.com': { status: 200, body: F(syma) }, 'sitelookup.mcafee.com': { status: 200, body: F(mcaf) },
});

test('baseline states produce a CheckResult per enabled vendor and no alerts', async () => {
  const net = fakeNet(pagesAt('fortinet-not-rated.html', 'symantec-not-rated-pending.html', 'mcafee-uncategorized.html'));
  const store = baseline(), n = mockNotifier(), c = clock('2026-11-15T06:00:00Z');
  const out = await runAgent(cfg, { store, notifier: n, now: c.now, wait: async () => {}, http: net.http, browser: net.browser });
  assert.deepEqual(out.results.map(r => [r.vendor, r.normalized_status]), [['fortinet', 'UNCATEGORIZED'], ['symantec', 'PENDING'], ['mcafee', 'UNCATEGORIZED']]);
  assert.equal(n.sent.length, 0);
  assert.equal(store.history.length, 3);
  for (const r of store.history) for (const k of ['vendor', 'domain', 'checked_at', 'raw_status', 'normalized_status', 'current_category', 'target_category', 'target_reached', 'note']) assert.ok(k in r, k);
});

test('a transition to the target sends exactly one notification, then none while unchanged', async () => {
  const pages = pagesAt('fortinet-not-rated.html', 'symantec-not-rated-pending.html', 'mcafee-uncategorized.html');
  const net = fakeNet(pages), store = baseline(), n = mockNotifier(), c = clock('2026-11-15T06:00:00Z');
  const run = () => runAgent(cfg, { store, notifier: n, now: c.now, wait: async () => {}, http: net.http, browser: net.browser, force: true });
  await run();
  pages['www.fortiguard.com'].body = F('fortinet-categorized.html');
  c.advance(12); const out = await run();
  assert.equal(n.sent.length, 1);
  assert.equal(n.sent[0].kind, 'target-reached'); assert.match(n.sent[0].subject, /Information Technology/);
  assert.equal(out.results.find(r => r.vendor === 'fortinet').target_reached, true);
  assert.equal(store.state.entries['fortinet|roboticsmena.com'].target_reached, true);
  c.advance(12); await run(); c.advance(12); await run();
  assert.equal(n.sent.length, 1, 'no duplicate alerts while the state is unchanged');
});

test('a CAPTCHA-blocked or unreachable vendor never throws; persistent blocking alerts once', async () => {
  const pages = pagesAt('fortinet-security-check.html', 'symantec-human-check.captured.html', 'mcafee-403.captured.html');
  pages['sitelookup.mcafee.com'] = new Error('getaddrinfo ENOTFOUND sitelookup.mcafee.com');
  const net = fakeNet(pages), store = baseline(), n = mockNotifier(), c = clock('2026-11-15T06:00:00Z');
  for (let i = 0; i < 5; i++) {
    const out = await runAgent(cfg, { store, notifier: n, now: c.now, wait: async () => {}, http: net.http, browser: net.browser, force: true });
    assert.equal(out.results.length, 3);
    assert.deepEqual(out.results.map(r => r.normalized_status), ['BLOCKED', 'BLOCKED', 'ERROR']);
    c.advance(24);
  }
  assert.equal(n.sent.length, 3, 'one needs-manual-check alert per vendor, after 3 failed runs');
  assert.ok(n.sent.every(x => x.kind === 'needs-manual-check'));
});

test('a parser crash only affects its own vendor', async () => {
  const net = fakeNet(pagesAt('fortinet-not-rated.html', 'symantec-not-rated-pending.html', 'mcafee-uncategorized.html'));
  const { PARSERS } = await import('../../scripts/catmon/vendors/index.mjs');
  const orig = PARSERS.symantec; PARSERS.symantec = { parse() { throw new Error('selector broke'); } };
  try {
    const out = await runAgent(cfg, { store: baseline(), notifier: mockNotifier(), now: () => new Date('2026-11-15T06:00:00Z'), wait: async () => {}, http: net.http, browser: net.browser });
    assert.deepEqual(out.results.map(r => r.normalized_status), ['UNCATEGORIZED', 'ERROR', 'UNCATEGORIZED']);
    assert.match(out.results[1].note, /selector broke/);
  } finally { PARSERS.symantec = orig; }
});

test('cadence: Fortinet every 12h, others daily, weekly once the target is reached', async () => {
  const pages = pagesAt('fortinet-not-rated.html', 'symantec-not-rated-pending.html', 'mcafee-uncategorized.html');
  const net = fakeNet(pages), store = memoryStore(), c = clock('2026-11-15T06:00:00Z');
  const run = () => runAgent(cfg, { store, notifier: mockNotifier(), now: c.now, wait: async () => {}, http: net.http, browser: net.browser });
  assert.equal((await run()).results.length, 3);
  c.advance(12); assert.deepEqual((await run()).results.map(r => r.vendor), ['fortinet']);
  c.advance(12); assert.equal((await run()).results.length, 3);
  pages['www.fortiguard.com'].body = F('fortinet-categorized.html');
  c.advance(12); await run();
  c.advance(12); assert.ok(!(await run()).results.some(r => r.vendor === 'fortinet'), 'target reached: Fortinet drops to weekly');
  c.advance(24 * 6); assert.ok(!(await run()).results.some(r => r.vendor === 'fortinet'), 'still within the week');
  c.advance(12); assert.ok((await run()).results.some(r => r.vendor === 'fortinet'), 'one week after the target was reached');
});

test('an undelivered alert is retried on the next run instead of being lost', async () => {
  const pages = pagesAt('fortinet-categorized.html', 'symantec-not-rated-pending.html', 'mcafee-uncategorized.html');
  const net = fakeNet(pages), store = baseline(), c = clock('2026-11-15T06:00:00Z');
  const failing = mockNotifier(false), working = mockNotifier(true);
  await runAgent(cfg, { store, notifier: failing, now: c.now, wait: async () => {}, http: net.http, browser: net.browser, force: true });
  c.advance(12); await runAgent(cfg, { store, notifier: working, now: c.now, wait: async () => {}, http: net.http, browser: net.browser, force: true });
  c.advance(12); await runAgent(cfg, { store, notifier: working, now: c.now, wait: async () => {}, http: net.http, browser: net.browser, force: true });
  assert.equal(failing.sent.length, 1); assert.equal(working.sent.length, 1);
});

test('dry run prints results but saves nothing and notifies nobody', async () => {
  const net = fakeNet(pagesAt('fortinet-categorized.html', 'symantec-not-rated-pending.html', 'mcafee-uncategorized.html'));
  const store = baseline(), n = mockNotifier();
  const out = await runAgent(cfg, { store, notifier: n, dryRun: true, now: () => new Date('2026-11-15T06:00:00Z'), wait: async () => {}, http: net.http, browser: net.browser });
  assert.equal(out.results.length, 3); assert.equal(n.sent.length, 0); assert.equal(store.history.length, 0);
  assert.equal(store.state.entries['fortinet|roboticsmena.com'].normalized_status, 'UNCATEGORIZED');
});

test('robots.txt is honoured: a disallowed lookup is recorded, not fetched', async () => {
  const calls = [];
  const http = async (url) => { calls.push(url); if (url.endsWith('/robots.txt')) return { ok: true, status: 200, body: 'User-agent: *\nDisallow: /*?*\n', url }; return { ok: true, status: 200, body: F('fortinet-not-rated.html'), url }; };
  const out = await runAgent(cfg, { store: memoryStore(), notifier: mockNotifier(), vendors: ['fortinet'], now: () => new Date('2026-11-15T06:00:00Z'), wait: async () => {}, http });
  assert.equal(out.results[0].normalized_status, 'BLOCKED'); assert.match(out.results[0].note, /Disallow: \/\*\?\*/);
  assert.deepEqual(calls, ['https://www.fortiguard.com/robots.txt']);
});

test('multiple domains get one check per vendor per domain', async () => {
  const net = fakeNet(pagesAt('fortinet-not-rated.html', 'symantec-not-rated-pending.html', 'mcafee-uncategorized.html'));
  const out = await runAgent(cfg, { store: memoryStore(), notifier: mockNotifier(), domains: ['roboticsmena.com', 'example.org'], now: () => new Date('2026-11-15T06:00:00Z'), wait: async () => {}, http: net.http, browser: net.browser });
  assert.equal(out.results.length, 6);
  assert.equal(net.calls.filter(c => !c.url.endsWith('/robots.txt')).length, 6);
});
