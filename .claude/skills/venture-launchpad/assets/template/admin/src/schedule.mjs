// Schedule tab: the Claude scheduled tasks, when they should run, and what each run reported.
// Runs record themselves as comments on one GitHub issue ("Scheduled task log", label agent-runs) via
// scripts/run-log.mjs. Each comment starts with a machine line:
//   <!-- run {"task":"weekly-brief","status":"succeeded","at":"…","result":"…","session":"…","summary":"…"} -->
// A scheduled time with no record shortly after it is shown as missed (a run that never started or could not report).
import BUNDLED from '../scheduled-tasks.json' with { type: 'json' };

export const LOG_TITLE = 'Scheduled task log';
export const LOG_LABEL = 'agent-runs';
export const STATUSES = ['started', 'succeeded', 'failed', 'nothing-to-do'];
// Minutes east of UTC for an IANA time zone at a given moment. Runs are placed using the offset in force now, so in
// zones with daylight saving the times shown for the week of a clock change can be an hour out.
export function tzOffsetMin(tz, at = Date.now()) {
  if (tz === 'UTC') return 0;
  let parts;
  try { parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(at)); }
  catch { throw new Error(`unsupported time zone ${tz}`); }
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, Number(x.value)]));
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at / 1000) * 1000) / 60000);
}
const STARTED_TIMEOUT_MS = 3 * 3600e3; // "started" with no finish after this long → no result
const MIN = 60e3, DAY = 864e5;

// ---- Run records ---------------------------------------------------------------------------------------------
// Keep the first http(s) URL in the value (agents sometimes wrap it in backticks or quotes).
const httpUrl = v => (typeof v === 'string' ? (v.match(/https?:\/\/[^\s`'"<>]+/) || [''])[0] : '');

export function formatRunComment({ task, status, at, result = '', session = '', summary = '' }) {
  if (!/^[a-z0-9-]{1,40}$/.test(task || '')) throw new Error(`task "${task}" must be a short id like weekly-brief`);
  if (!STATUSES.includes(status)) throw new Error(`status must be one of ${STATUSES.join(', ')}`);
  const rec = { task, status, at: at || new Date().toISOString(), result: httpUrl(result), session: httpUrl(session), summary: String(summary || '').replace(/\s+/g, ' ').trim().slice(0, 300) };
  // "--" can't appear inside an HTML comment; - keeps the JSON identical once parsed.
  const machine = JSON.stringify(rec).replace(/--/g, '-\\u002d');
  const when = new Date(rec.at).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const links = [rec.result && `[result](${rec.result})`, rec.session && `[session](${rec.session})`].filter(Boolean).join(' · ');
  const visible = rec.summary.replace(/<!--/g, '<!-');
  return `<!-- run ${machine} -->\n**${task}** ${status.replace(/-/g, ' ')} · ${when}${links ? ' · ' + links : ''}${visible ? `\n\n${visible}` : ''}`;
}

export function parseRunComment(body, { created_at = '', html_url = '' } = {}) {
  const m = /<!--\s*run\s+(\{[\s\S]*?\})\s*-->/.exec(String(body || ''));
  if (!m) return null;
  let j; try { j = JSON.parse(m[1]); } catch { return null; }
  if (!j || typeof j.task !== 'string' || !STATUSES.includes(j.status)) return null;
  const at = Number.isFinite(Date.parse(j.at)) ? new Date(j.at).toISOString() : created_at || null;
  if (!at) return null;
  return { task: j.task, status: j.status, at, result: httpUrl(j.result), session: httpUrl(j.session), summary: String(j.summary || '').replace(/`/g, '').replace(/\s+/g, ' ').trim().slice(0, 300), comment: httpUrl(html_url) };
}

// ---- Cron (minute hour day-of-month month day-of-week, optional CRON_TZ=…) ---------------------------------------
function field(spec, lo, hi) {
  const out = new Set();
  for (const part of String(spec).split(',')) {
    const [range, stepS] = part.split('/'); const step = stepS ? Number(stepS) : 1;
    let [a, b] = range === '*' ? [lo, hi] : range.split('-').map(Number);
    if (b === undefined) b = stepS ? hi : a;
    if (![a, b, step].every(Number.isInteger) || a < lo || b > hi || a > b || step < 1) throw new Error(`bad cron field "${spec}"`);
    for (let v = a; v <= b; v += step) out.add(v);
  }
  return out;
}

export function parseCron(expr) {
  let tz = 'UTC', rest = String(expr || '').trim();
  const m = /^CRON_TZ=(\S+)\s+(.*)$/.exec(rest); if (m) { tz = m[1]; rest = m[2]; }
  const f = rest.split(/\s+/); if (f.length !== 5) throw new Error(`cron "${expr}" needs 5 fields`);
  const dow = field(f[4], 0, 7); if (dow.has(7)) dow.add(0);
  return { tz, offsetMin: tzOffsetMin(tz), minutes: field(f[0], 0, 59), hours: field(f[1], 0, 23), dom: field(f[2], 1, 31), month: field(f[3], 1, 12), dow, domAny: f[2] === '*', dowAny: f[4] === '*' };
}

// Every scheduled time (as UTC ms) in (from, to], ascending.
export function expectedRuns(cron, from, to) {
  const c = typeof cron === 'string' ? parseCron(cron) : cron, off = c.offsetMin * MIN, out = [];
  const startDay = Math.floor((from + off) / DAY) * DAY;
  for (let day = startDay; day <= to + off; day += DAY) {
    const d = new Date(day);
    const domOk = c.dom.has(d.getUTCDate()), dowOk = c.dow.has(d.getUTCDay());
    const dayOk = c.month.has(d.getUTCMonth() + 1) && (c.domAny && c.dowAny ? true : c.domAny ? dowOk : c.dowAny ? domOk : domOk || dowOk);
    if (!dayOk) continue;
    for (const h of [...c.hours].sort((a, b) => a - b)) for (const mi of [...c.minutes].sort((a, b) => a - b)) {
      const t = day + h * 3600e3 + mi * MIN - off;
      if (t > from && t <= to) out.push(t);
    }
  }
  return out;
}
export const nextRun = (cron, now) => expectedRuns(cron, now, now + 9 * DAY)[0] ?? null;

// ---- Per-task status -----------------------------------------------------------------------------------------
// Groups a task's records into runs (one per scheduled slot, plus unscheduled runs), adds missed slots, newest first.
export function taskHistory(task, records, { now, trackingSince = 0, missedAfterMin = 30, limit = 10 }) {
  const grace = missedAfterMin * MIN, windowStart = Math.max(trackingSince, now - 14 * DAY);
  const slots = expectedRuns(task.cron, windowStart - 1, now + MIN);
  const mine = records.filter(r => r.task === task.id).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const groups = new Map(); // key → records
  for (const r of mine) {
    const t = Date.parse(r.at);
    const slot = [...slots].reverse().find(s => s - 15 * MIN <= t);
    const next = slot !== undefined ? slots[slots.indexOf(slot) + 1] : undefined;
    const key = slot !== undefined && (next === undefined || t < next - 15 * MIN) ? 's' + slot : 'r' + t;
    if (!groups.has(key)) groups.set(key, []); groups.get(key).push(r);
  }
  const runs = [...groups.values()].map(g => {
    const last = g[g.length - 1], started = g.find(r => r.status === 'started');
    let status = last.status;
    if (status === 'started') status = now - Date.parse(last.at) > STARTED_TIMEOUT_MS ? 'no-result' : 'running';
    return { status, at: last.at, started_at: started ? started.at : null, result: [...g].reverse().find(r => r.result)?.result || '',
      session: [...g].reverse().find(r => r.session)?.session || '', summary: last.summary || (status === 'no-result' ? 'Started but never reported a result.' : ''), comment: last.comment };
  });
  for (const s of slots) {
    if (s > now - grace || s < trackingSince) continue;
    if (!groups.has('s' + s)) runs.push({ status: 'missed', at: new Date(s).toISOString(), started_at: null, result: '', session: '', comment: '',
      summary: 'No run was recorded for this scheduled time: the task did not start, or it could not save and report its work.' });
  }
  return runs.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
}

// ---- GitHub ----------------------------------------------------------------------------------------------------
async function loadConfig(gh) {
  try { const txt = await gh.fileAt('admin/scheduled-tasks.json', 'main'); if (txt) return { config: JSON.parse(txt), source: 'repo' }; } catch { /* fall back */ }
  return { config: BUNDLED, source: 'bundled' };
}

async function loadRecords(gh) {
  const issues = await gh.get(`/repos/{repo}/issues?labels=${LOG_LABEL}&state=all&per_page=20`);
  const issue = (issues || []).filter(i => !i.pull_request).find(i => i.title === LOG_TITLE) || (issues || []).find(i => !i.pull_request);
  if (!issue) return { issue: null, records: [] };
  const pages = Math.max(1, Math.ceil((issue.comments || 0) / 100));
  const want = [...new Set([pages - 1, pages].filter(p => p >= 1))]; // the newest 100–200 comments
  const comments = (await Promise.all(want.map(p => gh.get(`/repos/{repo}/issues/${issue.number}/comments?per_page=100&page=${p}`)))).flat();
  const records = comments.map(c => parseRunComment(c.body, c)).filter(Boolean);
  return { issue: { number: issue.number, url: issue.html_url }, records };
}

let cache = null; // { at, value }
export function resetScheduleCache() { cache = null; }

export async function getSchedule(gh, { now = Date.now(), maxAgeMs = 30e3 } = {}) {
  if (cache && now - cache.at < maxAgeMs) return { ...cache.value, cached: true };
  const [{ config, source }, log] = await Promise.all([loadConfig(gh), loadRecords(gh).catch(e => ({ issue: null, records: [], error: e.message }))]);
  const trackingSince = Date.parse(config.tracking_since || '') || 0, missedAfterMin = config.missed_after_minutes || 30;
  const tasks = (config.tasks || []).map(t => {
    let next = null, history = [], error = null;
    try { next = nextRun(t.cron, now); history = taskHistory(t, log.records, { now, trackingSince, missedAfterMin }); } catch (e) { error = e.message; }
    const last = history[0] || null;
    return { id: t.id, name: t.name, when: t.when, cron: t.cron, trigger: t.trigger, produces: t.produces, results: t.results,
      next: next ? new Date(next).toISOString() : null, state: error ? 'config-error' : last ? last.status : 'waiting', last, history, error };
  });
  const value = { generated: new Date(now).toISOString(), source, log: log.issue, logError: log.error || null, tasks };
  cache = { at: now, value };
  return value;
}
