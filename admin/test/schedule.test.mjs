import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../src/index.mjs';
import { formatRunComment, parseRunComment, parseCron, expectedRuns, nextRun, taskHistory, getSchedule, resetScheduleCache, LOG_TITLE } from '../src/schedule.mjs';
import { makeIssuer, ENV, fakeGitHub, req } from './helpers.mjs';

const iss = await makeIssuer();
const T = s => Date.parse(s);
const BRIEF = { id: 'weekly-brief', name: 'Weekly brief draft', cron: 'CRON_TZ=Asia/Dubai 43 13 * * 0', when: 'Sundays 13:43 Gulf time' };
const DAILY = { id: 'daily-engagement', name: 'Daily social engagement', cron: 'CRON_TZ=Asia/Dubai 13 7 * * 1-5' };

test('run comments round-trip, and "--" cannot close the HTML comment early', () => {
  const body = formatRunComment({ task: 'weekly-brief', status: 'succeeded', at: '2026-11-15T09:49:00Z', result: 'https://github.com/a/b/pull/3',
    session: 'https://claude.ai/code/session_01X', summary: 'Five signals -- all UAE --> sourced' });
  const first = body.split('\n')[0];
  assert.ok(first.startsWith('<!-- run {') && first.endsWith('} -->') && first.indexOf('-->') === first.length - 3, 'the machine line closes only at its end');
  assert.ok(!formatRunComment({ task: 'weekly-brief', status: 'failed', summary: 'x <!-- hidden' }).split('\n').slice(1).join('\n').includes('<!--'), 'no comment can open in the visible text');
  const r = parseRunComment(body, { html_url: 'https://github.com/a/b/issues/9#c1' });
  assert.equal(r.status, 'succeeded'); assert.equal(r.result, 'https://github.com/a/b/pull/3');
  assert.equal(r.summary, 'Five signals -- all UAE --> sourced'); assert.equal(r.comment, 'https://github.com/a/b/issues/9#c1');
  assert.equal(parseRunComment('just a human comment'), null);
  assert.equal(parseRunComment('<!-- run {"task":"x","status":"exploded","at":"2026-11-15T00:00:00Z"} -->'), null);
  assert.equal(parseRunComment('<!-- run {"task":"x","status":"failed","at":"2026-11-15T00:00:00Z","result":"javascript:alert(1)"} -->').result, '');
  assert.throws(() => formatRunComment({ task: 'Bad Task', status: 'succeeded' }));
  assert.throws(() => formatRunComment({ task: 'weekly-brief', status: 'done' }));
});

test('cron in Gulf time: next run and expected slots', () => {
  // Sunday 13:43 Gulf = 09:43 UTC. From Sat 14 Nov, the next is Sun 15 Nov 09:43Z.
  assert.equal(new Date(nextRun(BRIEF.cron, T('2026-11-14T12:00:00Z'))).toISOString(), '2026-11-15T09:43:00.000Z');
  assert.equal(new Date(nextRun(BRIEF.cron, T('2026-11-15T10:00:00Z'))).toISOString(), '2026-11-22T09:43:00.000Z');
  // Weekdays 07:13 Gulf = 03:13 UTC, Mon–Fri only.
  const week = expectedRuns(DAILY.cron, T('2026-11-15T00:00:00Z'), T('2026-11-22T00:00:00Z')).map(t => new Date(t).toISOString().slice(0, 10));
  assert.deepEqual(week, ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']);
  assert.throws(() => parseCron('CRON_TZ=Mars/Olympus 1 2 * * *'));
  assert.throws(() => parseCron('61 2 * * *'));
});

test('history: missed slots, running, no result, and collapsed started→finished runs', () => {
  const now = T('2026-11-22T12:00:00Z'), opts = { now, trackingSince: T('2026-11-15T00:00:00Z'), missedAfterMin: 30 };
  // 15 Nov: nothing recorded (missed). 22 Nov: started then succeeded.
  const recs = [
    { task: 'weekly-brief', status: 'started', at: '2026-11-22T09:44:00Z', result: '', session: 'https://claude.ai/code/session_1', summary: '' },
    { task: 'weekly-brief', status: 'succeeded', at: '2026-11-22T09:52:00Z', result: 'https://github.com/a/b/pull/7', session: '', summary: 'Five signals' },
  ];
  const h = taskHistory(BRIEF, recs, opts);
  assert.deepEqual(h.map(r => r.status), ['succeeded', 'missed']);
  assert.equal(h[0].started_at, '2026-11-22T09:44:00Z'); assert.equal(h[0].session, 'https://claude.ai/code/session_1'); assert.equal(h[0].result, 'https://github.com/a/b/pull/7');
  assert.equal(h[1].at, '2026-11-15T09:43:00.000Z');
  // Within the grace period a slot is not yet missed; a fresh "started" is running; an old one has no result.
  assert.deepEqual(taskHistory(BRIEF, [], { ...opts, now: T('2026-11-22T09:50:00Z') }).map(r => r.status), ['missed']);
  assert.equal(taskHistory(BRIEF, [recs[0]], { ...opts, now: T('2026-11-22T10:00:00Z') })[0].status, 'running');
  assert.equal(taskHistory(BRIEF, [recs[0]], { ...opts, now: T('2026-11-22T14:00:00Z') })[0].status, 'no-result');
  // Slots before tracking started are never flagged.
  assert.deepEqual(taskHistory(BRIEF, [], { ...opts, now: T('2026-11-14T12:00:00Z') }), []);
});

function ghWithLog(comments) {
  const gh = fakeGitHub(); const get0 = gh.get;
  gh.get = async p => {
    if (p.startsWith('/repos/{repo}/issues?labels=agent-runs')) { gh.calls.push(['GET', p]); return comments ? [{ number: 50, title: LOG_TITLE, comments: comments.length, html_url: 'https://github.com/acme/robotics-mena/issues/50' }] : []; }
    if (p.startsWith('/repos/{repo}/issues/50/comments')) { gh.calls.push(['GET', p]); return comments; }
    return get0(p);
  };
  gh.fileAt = async path => (path === 'admin/scheduled-tasks.json' ? JSON.stringify({ tracking_since: '2026-11-15T00:00:00Z', tasks: [BRIEF, DAILY] }) : null);
  return gh;
}
const call = async (gh, now) => { resetScheduleCache(); const res = await handle(req('/api/schedule', { token: await iss.token({ email: 'viewer@example.com' }) }), ENV,
  { auth: { fetchImpl: iss.fetchImpl }, github: gh, schedule: { now: T(now) } }); return { res, body: await res.json() }; };

test('GET /api/schedule with no log issue yet: tasks listed, nothing missed before tracking, next runs shown', async () => {
  const { res, body } = await call(ghWithLog(null), '2026-11-14T20:00:00Z');
  assert.equal(res.status, 200); assert.equal(body.log, null); assert.equal(body.source, 'repo');
  assert.deepEqual(body.tasks.map(t => [t.id, t.state, t.next]), [['weekly-brief', 'waiting', '2026-11-15T09:43:00.000Z'], ['daily-engagement', 'waiting', '2026-11-16T03:13:00.000Z']]);
});

test('GET /api/schedule reads run records from the log issue and flags missed runs', async () => {
  const c = formatRunComment({ task: 'daily-engagement', status: 'succeeded', at: '2026-11-16T03:20:00Z', result: 'https://github.com/acme/robotics-mena/issues/60#c' });
  const { body } = await call(ghWithLog([{ body: 'chatter' }, { body: c, html_url: 'https://github.com/acme/robotics-mena/issues/50#issuecomment-1' }]), '2026-11-16T06:00:00Z');
  const by = Object.fromEntries(body.tasks.map(t => [t.id, t]));
  assert.equal(by['weekly-brief'].state, 'missed');
  assert.equal(by['daily-engagement'].state, 'succeeded');
  assert.equal(by['daily-engagement'].last.result, 'https://github.com/acme/robotics-mena/issues/60#c');
  assert.equal(body.log.url, 'https://github.com/acme/robotics-mena/issues/50');
});

test('schedule falls back to the bundled task list and caches briefly', async () => {
  const gh = ghWithLog(null); gh.fileAt = async () => null; resetScheduleCache();
  const a = await getSchedule(gh, { now: T('2026-11-16T06:00:00Z') });
  assert.equal(a.source, 'bundled'); assert.ok(a.tasks.some(t => t.id === 'weekly-social'));
  const n = gh.calls.length;
  const b = await getSchedule(gh, { now: T('2026-11-16T06:00:10Z') });
  assert.equal(b.cached, true); assert.equal(gh.calls.length, n, 'served from cache');
});

test('the page has a Schedule tab', async () => {
  const res = await handle(req('/', { token: await iss.token({ email: 'viewer@example.com' }) }), ENV, { auth: { fetchImpl: iss.fetchImpl }, github: fakeGitHub() });
  const html = await res.text();
  assert.match(html, /data-tab="schedule"/); assert.match(html, /\/api\/schedule/);
});
