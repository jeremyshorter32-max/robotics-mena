import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../../scripts/run-log.mjs';
import { parseRunComment, formatRunComment } from '../../admin/src/schedule.mjs';

test('run-log arguments, with the session taken from the environment', () => {
  const a = parseArgs(['weekly-brief', 'succeeded', '--result', 'https://github.com/x/y/pull/1', '--summary', 'Five signals'], { CLAUDE_CODE_REMOTE_SESSION_ID: 'cse_01ABC' });
  assert.deepEqual(a, { task: 'weekly-brief', status: 'succeeded', result: 'https://github.com/x/y/pull/1', session: 'https://claude.ai/code/session_01ABC', summary: 'Five signals', repo: '{{REPO}}' });
  assert.equal(parseArgs(['weekly-scan', 'nothing-to-do', '--session', 'https://claude.ai/code/session_X'], {}).session, 'https://claude.ai/code/session_X');
  assert.throws(() => parseArgs(['weekly-brief', 'done'], {}));
  assert.throws(() => parseArgs(['weekly-brief', 'failed', '--colour', 'red'], {}));
  assert.throws(() => parseArgs([], {}));
});

test('what run-log writes is what the portal reads', () => {
  const a = parseArgs(['weekly-social', 'failed', '--summary', 'Push refused (403)'], {});
  const r = parseRunComment(formatRunComment({ ...a, at: '2026-11-15T11:39:00Z' }));
  assert.deepEqual([r.task, r.status, r.at, r.summary], ['weekly-social', 'failed', '2026-11-15T11:39:00.000Z', 'Push refused (403)']);
});
