import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pick, postedAt, parseTimeline, isEnglish } from '../../scripts/x-candidates.mjs';

const id = d => String((BigInt(Date.parse(d)) - 1288834974657n) << 22n);
const tw = (screen, text, d, extra = {}) => ({ id_str: id(d), full_text: text, user: { screen_name: screen }, lang: 'en', ...extra });
const since = new Date('2026-11-03T00:00:00Z');

test('post ids decode to the time they were posted', () => {
  assert.equal(postedAt('2118279593908142426').toISOString().slice(0, 10), '2026-11-05');
});

test('keeps recent robotics posts from MENA accounts and drops old, off-topic, reposts and replies', () => {
  const gov = { handle: 'rta_dubai', name: 'RTA', mena: true };
  const got = pick([
    tw('rta_dubai', 'RTA launches driverless robotaxi trials in Jumeirah', '2026-11-10T08:00:00Z'),
    tw('rta_dubai', 'Traffic diversion on Sheikh Zayed Road', '2026-11-10T08:00:00Z'),
    tw('rta_dubai', 'Autonomous pods at Bluewaters', '2026-10-01T08:00:00Z'),
    tw('someone', 'RT @x robot news', '2026-11-10T08:00:00Z'),
    tw('rta_dubai', 'Robot reply', '2026-11-10T08:00:00Z', { in_reply_to_screen_name: 'other' }),
    tw('rta_dubai', 'تجربة مركبات ذاتية القيادة في دبي', '2026-11-12T08:00:00Z'),
  ], gov, since);
  assert.deepEqual(got.map(g => g.text.slice(0, 12)), ['RTA launches', 'تجربة مركبات']);
  assert.equal(got[0].url, `https://x.com/rta_dubai/status/${got[0].id}`);
  assert.equal(got[0].date, '2026-11-10');
});

test("a supplier's posts must name a MENA place; weapons and Israel are excluded", () => {
  const sup = { handle: 'WeRide_ai', name: 'WeRide', mena: false };
  const got = pick([
    tw('WeRide_ai', 'Our robotaxi fleet grows in Singapore', '2026-11-10T08:00:00Z'),
    tw('WeRide_ai', 'Our robotaxi fleet grows in Abu Dhabi', '2026-11-10T08:00:00Z'),
  ], sup, since);
  assert.equal(got.length, 1);
  const gov = { handle: 'x', name: 'x', mena: true };
  assert.equal(pick([tw('x', 'Counter-UAS drone weapon demo', '2026-11-10T08:00:00Z')], gov, since).length, 0);
});

test('parses the embed feed page', () => {
  const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { timeline: { entries: [{ content: { tweet: { id_str: '1' } } }] } } } })}</script>`;
  assert.deepEqual(parseTimeline(html), [{ id_str: '1' }]);
  assert.equal(parseTimeline('<html></html>'), null);
});

test('Arabic posts are kept and flagged for translation', () => {
  const gov = { handle: 'AutonomousAD', name: 'Abu Dhabi Autonomous', mena: true };
  const got = pick([
    tw('AutonomousAD', 'تجربة لنقل البضائع باستخدام الطائرات بدون طيار في أبوظبي', '2026-11-13T08:00:00Z', { lang: 'ar' }),
    tw('AutonomousAD', 'Abu Dhabi Mobility trials drone cargo delivery with noon and Lood', '2026-11-13T08:00:00Z', { lang: 'en' }),
  ], gov, since);
  assert.equal(got.length, 2);
  assert.deepEqual(got.map(g => g.english), [false, true]);
});
