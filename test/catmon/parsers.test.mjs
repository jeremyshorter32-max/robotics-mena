import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PARSERS } from '../../scripts/catmon/vendors/index.mjs';
import { targetReached } from '../../scripts/catmon/decide.mjs';

const F = n => fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', n), 'utf8');
const ctx = { domain: 'roboticsmena.com' };

test('Fortinet: baseline "Not Rated" is UNCATEGORIZED', () => {
  const r = PARSERS.fortinet.parse(F('fortinet-not-rated.html'), ctx);
  assert.equal(r.normalized_status, 'UNCATEGORIZED'); assert.equal(r.current_category, null); assert.match(r.raw_status, /Not Rated/);
});
test('Fortinet: categorized page reads the current category, not the rating history', () => {
  const r = PARSERS.fortinet.parse(F('fortinet-categorized.html'), ctx);
  assert.equal(r.normalized_status, 'CATEGORIZED'); assert.equal(r.current_category, 'Information Technology');
  assert.ok(targetReached(r.normalized_status, r.current_category, 'Information Technology'));
});
test('Fortinet: "Security Check Failed" is BLOCKED (never solved)', () => {
  const r = PARSERS.fortinet.parse(F('fortinet-security-check.html'), ctx);
  assert.equal(r.normalized_status, 'BLOCKED'); assert.match(r.note, /manual check/);
});

test('Symantec: baseline not-yet-rated with pending submission is PENDING', () => {
  const r = PARSERS.symantec.parse(F('symantec-not-rated-pending.html'), ctx);
  assert.equal(r.normalized_status, 'PENDING'); assert.equal(r.note, 'pending submission exists');
});
test('Symantec: not yet rated without a submission is UNCATEGORIZED', () => {
  assert.equal(PARSERS.symantec.parse(F('symantec-not-rated.html'), ctx).normalized_status, 'UNCATEGORIZED');
});
test('Symantec: categorized page reads the category', () => {
  const r = PARSERS.symantec.parse(F('symantec-categorized.html'), ctx);
  assert.equal(r.normalized_status, 'CATEGORIZED'); assert.equal(r.current_category, 'Technology/Internet');
  assert.ok(targetReached(r.normalized_status, r.current_category, 'Technology/Internet'));
});
test('Symantec: the real human-verification interstitial (captured) is BLOCKED', () => {
  const r = PARSERS.symantec.parse(F('symantec-human-check.captured.html'), ctx);
  assert.equal(r.normalized_status, 'BLOCKED'); assert.match(r.note, /human-verification/);
});

test('Symantec: the real lookup form shown to a read-only client (captured) is BLOCKED, not ERROR', () => {
  const r = PARSERS.symantec.parse(F('symantec-lookup-form.captured.html'), ctx);
  assert.equal(r.normalized_status, 'BLOCKED'); assert.match(r.note, /manual check/);
});

test('McAfee: baseline "Uncategorized URL / Unverified" is UNCATEGORIZED', () => {
  const r = PARSERS.mcafee.parse(F('mcafee-uncategorized.html'), ctx);
  assert.equal(r.normalized_status, 'UNCATEGORIZED'); assert.match(r.raw_status, /Uncategorized URL/); assert.match(r.note, /Unverified/);
});
test('McAfee: categorized row lists every category and matches the target', () => {
  const r = PARSERS.mcafee.parse(F('mcafee-categorized.html'), ctx);
  assert.equal(r.normalized_status, 'CATEGORIZED'); assert.equal(r.current_category, 'Technical Information, Education/Reference');
  assert.ok(targetReached(r.normalized_status, r.current_category, 'Technical Information'));
});
test('McAfee: the real 403 page (captured) is BLOCKED', () => {
  assert.equal(PARSERS.mcafee.parse(F('mcafee-403.captured.html'), ctx).normalized_status, 'BLOCKED');
});

test('every parser reports ERROR (not a wrong category) on an unrelated page', () => {
  for (const [id, p] of Object.entries(PARSERS)) {
    const r = p.parse('<html><body><h1>Welcome</h1><p>Nothing to see.</p></body></html>', ctx);
    assert.equal(r.normalized_status, 'ERROR', id);
  }
});
test('a different category does not count as reaching the target', () => {
  assert.equal(targetReached('CATEGORIZED', 'News and Media', 'Information Technology'), false);
  assert.equal(targetReached('UNCATEGORIZED', null, 'Information Technology'), false);
});
