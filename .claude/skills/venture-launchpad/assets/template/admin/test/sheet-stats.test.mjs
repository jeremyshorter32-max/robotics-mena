// The Google Sheet script's stats() (integrations/google-sheets/Code.gs), run against a fake spreadsheet:
// counts by source and the Resources archive's own counts, never names or emails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { getMetrics } from '../src/metrics.mjs';

function loadSheetScript(rows) {
  const head = ['Received', 'Status', 'Notes', 'email', 'signed_up_from', 'page'];
  const sheet = { getLastRow: () => rows.length + 1, getLastColumn: () => head.length,
    getRange: (r, c, nr) => ({ getValues: () => (r === 1 ? [head] : rows.slice(0, nr)) }) };
  const ctx = {
    SpreadsheetApp: (b => ({ openById: () => b, getActiveSpreadsheet: () => b }))({ getSheetByName: n => (n === 'Sign-ups' ? sheet : null) }),
    Utilities: { formatDate: d => `2026-W${String(Math.ceil((d.getUTCDate()) / 7)).padStart(2, '0')}` },
    PropertiesService: {}, ContentService: {}, LockService: {}, UrlFetchApp: {},
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL('../../integrations/google-sheets/Code.gs', import.meta.url), 'utf8'), ctx);
  return ctx;
}

test('Sheet stats count sign-ups by source and give the Resources archive its own counts', () => {
  const d = new Date();
  const rows = [
    [d, 'New', '', 'a@x.com', 'Resources archive', '/resources'],
    [d, 'Repeat', '', 'A@x.com', 'Resources archive', '/resources'],
    [d, 'New', '', 'b@x.com', 'Spotlight: ADNOC', '/spotlight'],
    [d, 'New', '', 'c@x.com', 'Home page newsletter', '/'],
    [d, 'New', '', 'd@x.com', 'Join the waitlist pop-up on the map page', '/map'],
    [d, 'New', '', 'e@x.com', '', '/'],
  ];
  const s = loadSheetScript(rows).stats();
  assert.equal(s.signups.total, 6);
  assert.equal(s.signups.unique, 5);
  assert.deepEqual({ ...s.signups.bySource }, { 'Resources archive': 2, 'Spotlight reports': 1, 'Home page': 1, 'Waitlist pop-up': 1, 'Not recorded': 1 });
  assert.equal(s.resources.total, 2);
  assert.equal(s.resources.unique, 1);
  assert.equal(Object.values(s.resources.weekly).reduce((a, b) => a + b, 0), 2);
  assert.ok(!JSON.stringify(s).includes('@'), 'no email addresses in the stats');
});

test('portal metrics pass the Resources archive and source counts through', async () => {
  const gh = { fileAt: async () => null, get: async () => ({ workflow_runs: [] }) };
  const stats = { tabs: { signup: 3 }, signups: { total: 3, unique: 3, weekly: {}, bySource: { 'Resources archive': 2, 'Home page': 1 } }, resources: { total: 2, unique: 2, weekly: { '2026-W47': 2 } } };
  const m = await getMetrics(gh, { SHEET_STATS_URL: 'https://s', SHEET_STATS_KEY: 'k' }, { fetchImpl: async () => ({ ok: true, json: async () => ({ ok: true, stats }) }) });
  assert.equal(m.waitlist.resources.unique, 2);
  assert.equal(m.waitlist.signups.bySource['Resources archive'], 2);
});
