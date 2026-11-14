// The agent must be read-only: it never submits forms, never re-submits categorizations and never touches captchas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { httpGet, browserGet } from '../../scripts/catmon/fetch.mjs';
import { ConfigSchema, loadConfig } from '../../scripts/catmon/config.mjs';
import { PARSERS } from '../../scripts/catmon/vendors/index.mjs';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../scripts/catmon');
const files = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(d, e.name)) : e.name.endsWith('.mjs') ? [path.join(d, e.name)] : []);

test('httpGet only ever sends GET', async () => {
  const seen = [];
  const fakeFetch = async (url, init) => { seen.push(init.method); return { ok: true, status: 200, url, text: async () => 'ok', headers: { get: () => null } }; };
  await httpGet('https://example.org/', { userAgent: 'test-agent/1.0', fetchImpl: fakeFetch });
  assert.deepEqual(seen, ['GET']);
});

test('browserGet aborts every non-GET request the vendor page tries to make', async () => {
  const decisions = [];
  const fakePlaywright = { chromium: { launch: async () => ({
    close: async () => {},
    newContext: async () => ({
      route: async (_p, handler) => {
        for (const method of ['GET', 'POST', 'PUT']) handler({ request: () => ({ method: () => method }), continue: () => decisions.push([method, 'continue']), abort: () => decisions.push([method, 'abort']) });
      },
      newPage: async () => ({ goto: async () => ({ ok: () => true, status: () => 200 }), waitForTimeout: async () => {}, content: async () => '<html></html>' }),
    }),
  }) } };
  const r = await browserGet('https://example.org/#/x', { userAgent: 'test-agent/1.0', playwright: fakePlaywright, settleMs: 0 });
  assert.equal(r.status, 200);
  assert.deepEqual(decisions, [['GET', 'continue'], ['POST', 'abort'], ['PUT', 'abort']]);
});

test('without Playwright the browser strategy reports itself unavailable instead of failing', async () => {
  const r = await browserGet('https://example.org/', { userAgent: 'x', playwright: null });
  assert.equal(r.ok, false); assert.match(r.error, /Playwright is not installed/);
});

test('code review guard: no form filling, clicking, submitting or captcha solving anywhere in the agent', () => {
  const banned = [/\.click\(/, /\.fill\(/, /\.type\(/, /\.press\(/, /\.check\(/, /selectOption/, /setInputFiles/, /\.submit\(/, /requestSubmit/,
    /2captcha|anti-?captcha|capsolver|deathbycaptcha|captcha.?solv/i, /grecaptcha\.execute/i, /stealth/i];
  for (const f of files(DIR)) {
    if (f.endsWith('notify.mjs')) continue; // notifications POST to our own channels (FormSubmit relay, GitHub, webhook), never to vendors
    const src = fs.readFileSync(f, 'utf8');
    for (const re of banned) assert.doesNotMatch(src, re, `${path.relative(DIR, f)} contains ${re}`);
    assert.doesNotMatch(src, /method:\s*['"](POST|PUT|PATCH|DELETE)['"]/i, `${path.relative(DIR, f)} sends a non-GET request`);
  }
});

test('notifications never go to a vendor host', () => {
  const src = fs.readFileSync(path.join(DIR, 'notify.mjs'), 'utf8');
  for (const host of ['fortiguard', 'bluecoat', 'mcafee', 'trellix', 'paloaltonetworks', 'talosintelligence', 'checkpoint']) assert.ok(!src.includes(host), host);
});

test('config: the shipped file is valid, every enabled vendor has a registered parser, login-gated vendors stay disabled', () => {
  const cfg = loadConfig();
  for (const v of cfg.vendors.filter(v => v.enabled)) assert.ok(PARSERS[v.module], v.id);
  assert.deepEqual(cfg.vendors.filter(v => v.requiresLogin).map(v => [v.id, v.enabled]), [['paloalto', false], ['talos', false], ['checkpoint', false]]);
  assert.ok(!cfg.vendors.some(v => /zscaler|netskope/.test(v.id)), 'customer-only vendors are excluded');
});

test('config: enabling a vendor without a parser, or a login-gated vendor, is rejected', () => {
  const base = loadConfig();
  const bad1 = { ...base, vendors: base.vendors.map(v => (v.id === 'talos' ? { ...v, enabled: true } : v)) };
  assert.equal(ConfigSchema.safeParse(bad1).success, false);
  const bad2 = { ...base, vendors: [...base.vendors, { ...base.vendors[0], id: 'newvendor', module: null }] };
  assert.equal(ConfigSchema.safeParse(bad2).success, false);
});
