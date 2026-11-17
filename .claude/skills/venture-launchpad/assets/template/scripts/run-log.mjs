#!/usr/bin/env node
// Records a scheduled-task run on the "Scheduled task log" issue (label agent-runs), which the admin portal's
// Schedule tab reads. Never fails the run: on any error it prints a warning and exits 0.
//   node scripts/run-log.mjs <task> <started|succeeded|failed|nothing-to-do> [--result URL] [--session URL] [--summary "..."] [--repo owner/name]
// <task> is an id from admin/scheduled-tasks.json (weekly-scan, weekly-brief, weekly-social, daily-engagement, portal-requests).
// --session defaults to this Claude session (from CLAUDE_CODE_REMOTE_SESSION_ID) when available.
import { execFileSync } from 'node:child_process';
import { formatRunComment, LOG_TITLE, LOG_LABEL, STATUSES } from '../admin/src/schedule.mjs';

export function parseArgs(argv, env = {}) {
  const [task, status, ...rest] = argv;
  const opt = {};
  for (let i = 0; i < rest.length; i++) {
    const m = /^--(result|session|summary|repo)$/.exec(rest[i]);
    if (!m || rest[i + 1] === undefined) throw new Error(`unexpected argument "${rest[i]}"`);
    opt[m[1]] = rest[++i];
  }
  if (!task || !STATUSES.includes(status)) throw new Error(`usage: run-log.mjs <task> <${STATUSES.join('|')}> [--result URL] [--session URL] [--summary "..."]`);
  const sid = env.CLAUDE_CODE_REMOTE_SESSION_ID || '';
  const session = opt.session || (/^cse_\w+$/.test(sid) ? `https://claude.ai/code/session_${sid.slice(4)}` : '');
  // Agents sometimes wrap values in backticks or quotes from markdown; keep only the URL and plain text.
  const url = v => ((String(v || '').match(/https?:\/\/[^\s`'"<>]+/) || [''])[0]);
  const plain = v => String(v || '').replace(/[`]/g, '').replace(/\s+/g, ' ').trim();
  return { task, status, result: url(opt.result), session: url(session) || session, summary: plain(opt.summary), repo: opt.repo || env.GITHUB_REPO || '{{REPO}}' };
}

const gh = (args, input) => JSON.parse(execFileSync('gh', ['api', ...args], { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }) || 'null');

function main() {
  let a;
  try { a = parseArgs(process.argv.slice(2), process.env); } catch (e) { console.error(e.message); process.exit(2); }
  try {
    const body = formatRunComment({ ...a, at: new Date().toISOString() });
    const issues = gh([`repos/${a.repo}/issues?labels=${LOG_LABEL}&state=all&per_page=20`]) || [];
    let issue = issues.filter(i => !i.pull_request).find(i => i.title === LOG_TITLE);
    if (!issue) issue = gh([`repos/${a.repo}/issues`, '--method', 'POST', '--input', '-'], JSON.stringify({ title: LOG_TITLE, labels: [LOG_LABEL],
      body: 'One comment per scheduled-task run, written by `scripts/run-log.mjs`. The admin portal\'s Schedule tab reads this issue. Keep it open; do not edit the comments.' }));
    if (issue.state === 'closed') gh([`repos/${a.repo}/issues/${issue.number}`, '--method', 'PATCH', '-f', 'state=open']);
    const c = gh([`repos/${a.repo}/issues/${issue.number}/comments`, '--method', 'POST', '--input', '-'], JSON.stringify({ body }));
    console.log(`Logged ${a.task} ${a.status}: ${c.html_url}`);
  } catch (e) {
    console.warn(`run-log: could not record the run (${String(e.message || e).split('\n')[0]}). Carrying on.`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
