import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../scripts/lib/taxonomy.mjs';
import { xLength, tag, weekOf, weekStart, slotDate, validateQueue, missingSlots, readJson } from '../../scripts/lib/social.mjs';
import { AGENT_BRANCH, PUBLISHABLE_PATH, kindOf } from '../../admin/src/inbox.mjs';

const post = over => ({ id: 'w47-x-a', platform: 'x', format: 'post', pillar: 'signals', slot: '2026-11-16T09:00+04:00', status: 'draft',
  text: 'Fact. Source: X', sources: [{ name: 'Src', url: 'https://example.com/a' }], ...over });
const q = (...posts) => ({ week: '2026-w47', posts });
const errs = qq => validateQueue(qq, { handles: { x: new Set(['roboticsmena', 'rta_dubai']), instagram: new Set(['roboticsmena']) } }).errors;

test('X weighted length: links 23, emoji 2, flags 2, Arabic 1', () => {
  assert.equal(xLength('abc'), 3);
  assert.equal(xLength('see https://roboticsmena.com/database?tab=deployments&id=d03&utm_source=x'), 4 + 23);
  assert.equal(xLength('🤖'), 2);
  assert.equal(xLength('🇦🇪'), 2);
  assert.equal(xLength('روبوت'), 5);
  assert.equal(xLength('👍🏽'), 2);
});

test('utm tagging only for our links and never on Reddit', () => {
  assert.match(tag('https://roboticsmena.com/map', 'x', '2026-w47'), /utm_source=x&utm_medium=social&utm_campaign=2026-w47/);
  assert.equal(tag('https://roboticsmena.com/map', 'reddit', '2026-w47'), 'https://roboticsmena.com/map');
  assert.equal(tag('https://example.com/a', 'x', 'w'), 'https://example.com/a');
});

test('ISO weeks and slots', () => {
  assert.equal(weekStart('2026-w47').toISOString().slice(0, 10), '2026-11-16');
  assert.equal(weekOf(new Date('2026-11-22T12:00Z')), '2026-w47');
  assert.equal(weekOf(new Date('2027-01-01T12:00Z')), '2026-w53');
  assert.equal(slotDate('2026-w47', 'fri', '08:30'), '2026-11-20T08:30+04:00');
});

test('a valid post passes', () => assert.deepEqual(errs(q(post())), []));

test('excluded country, banned phrases and excluded sources are errors', () => {
  assert.ok(errs(q(post({ text: 'Deal with an Israeli startup' }))).some(e => /excluded country/.test(e)));
  assert.ok(errs(q(post({ text: 'شراكة مع إسرائيل' }))).some(e => /excluded country/.test(e)));
  assert.ok(errs(q(post({ text: 'A game-changer for Dubai' }))).some(e => /VOICE/.test(e)));
  assert.ok(errs(q(post({ sources: [{ name: 'x', url: 'https://www.timesofisrael.com/a' }] }))).some(e => /excluded source/.test(e)));
});

test('signals need sources; our links need utm (except Reddit)', () => {
  assert.ok(errs(q(post({ sources: [] }))).some(e => /needs at least one source/.test(e)));
  assert.ok(errs(q(post({ text: 'Map https://roboticsmena.com/map' }))).some(e => /utm_source=x/.test(e)));
  assert.deepEqual(errs(q(post({ text: 'Map https://roboticsmena.com/map?utm_source=x&utm_medium=social&utm_campaign=2026-w47' }))), []);
  const rd = { id: 'w47-rd-a', platform: 'reddit', format: 'text', pillar: 'community', slot: '2026-11-16T18:00+04:00', status: 'draft', subreddit: 'RoboticsMENA', title: 'Q', text: 'https://roboticsmena.com/map?utm_source=reddit' };
  assert.ok(errs(q(rd)).some(e => /no utm tags on Reddit/.test(e)));
});

test('only one Reddit post a week outside our community links to our site', () => {
  const rd = i => ({ id: `w47-rd-${i}`, platform: 'reddit', format: 'text', pillar: 'community', slot: '2026-11-16T18:00+04:00', status: 'draft', subreddit: 'dubai', title: 'Q', text: 'https://roboticsmena.com/map' });
  assert.deepEqual(errs(q(rd(1))), []);
  assert.ok(errs(q(rd(1), rd(2))).some(e => /max 1 a week/.test(e)));
});

test('X posts over 280, short threads and unchecked handles fail', () => {
  assert.ok(errs(q(post({ text: 'a'.repeat(281) }))).some(e => /weighted characters/.test(e)));
  assert.ok(errs(q(post({ format: 'thread', text: undefined, thread: ['one'] }))).some(e => /at least 2/.test(e)));
  assert.ok(errs(q(post({ text: 'Thanks @SomeoneUnknown' }))).some(e => /not a checked x handle/.test(e)));
  assert.deepEqual(errs(q(post({ text: 'Per @rta_dubai. Mail us at contact@roboticsmena.com' }))), []);
});

test('platform formats: LinkedIn poll and document, Instagram carousel', () => {
  const li = { id: 'w47-li-a', platform: 'linkedin', format: 'poll', pillar: 'community', slot: '2026-11-20T08:30+04:00', status: 'draft', text: 'Hook', poll: { question: 'Q?', options: ['A'] } };
  assert.ok(errs(q(li)).some(e => /2 to 4 options/.test(e)));
  assert.ok(errs(q({ ...li, format: 'document', poll: undefined, cards: [{ template: 'cover', size: 'portrait', title: 'T' }] })).some(e => /at least 3 cards/.test(e)));
  const ig = { id: 'w47-ig-a', platform: 'instagram', format: 'carousel', pillar: 'community', slot: '2026-11-16T19:30+04:00', status: 'draft', text: 'Cap', cards: [{ template: 'cover', size: 'portrait', title: 'T' }] };
  assert.ok(errs(q(ig)).some(e => /2 to 20 cards/.test(e)));
  assert.ok(errs(q({ ...ig, cards: [...ig.cards, { template: 'signal', size: 'portrait', title: 'T', image: '/media/press/x.jpg' }] })).some(e => /rights-cleared/.test(e)));
});

test('every committed campaign validates', () => {
  const dir = path.join(ROOT, 'social/campaigns');
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')) : []) assert.deepEqual(validateQueue(readJson(path.join(dir, f))).errors, [], f);
});

test('placeholders only in templates, never on cards', () => {
  assert.ok(errs(q(post({ text: 'Day [[N]] at GITEX' }))).some(e => /placeholders/.test(e)));
  assert.deepEqual(errs(q(post({ text: 'Day [[N]] at GITEX', template: true }))), []);
  assert.ok(errs(q(post({ template: true, cards: [{ template: 'cover', size: 'landscape', title: 'Day [[N]]' }] }))).some(e => /not allowed on cards/.test(e)));
});

test('a campaign needs no week and no cadence', () => {
  const c = { campaign: 'launch-2026', posts: [post({ slot: '2026-12-07T10:00+04:00' })], kit: [{ id: 'k1', title: 'T', text: 'Hello' }] };
  assert.deepEqual(errs(c), []);
  assert.deepEqual(missingSlots(c, readJson(path.join(ROOT, 'social/cadence.json'))), []);
  assert.ok(errs({ ...c, kit: [{ id: 'k2', title: 'T', text: 'An Israeli startup' }] }).some(e => /excluded/.test(e)));
});

test('every committed queue validates and fills the cadence', () => {
  const cadence = readJson(path.join(ROOT, 'social/cadence.json'));
  for (const f of fs.readdirSync(path.join(ROOT, 'social/queue')).filter(f => f.endsWith('.json'))) {
    const qq = readJson(path.join(ROOT, 'social/queue', f));
    assert.deepEqual(validateQueue(qq).errors, [], f);
    assert.deepEqual(missingSlots(qq, cadence).map(s => `${s.platform} ${s.day} ${s.time}`), [], f);
  }
});

test('the portal can approve social/ pull requests', () => {
  assert.ok(AGENT_BRANCH.test('social/2026-w47'));
  assert.equal(kindOf('social/2026-w47'), 'Social posts');
  assert.ok(PUBLISHABLE_PATH.test('social/queue/2026-w47.json'));
  assert.ok(!PUBLISHABLE_PATH.test('scripts/social.mjs'));
});
