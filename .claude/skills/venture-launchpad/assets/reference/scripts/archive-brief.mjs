#!/usr/bin/env node
// Keeps every weekly brief: writes data/briefs/<YYYY>-w<NN>.json from data/brief.json (or from an older git version of it),
// so past briefs stay available for the resources page after data/brief.json is replaced each week.
//   node scripts/archive-brief.mjs                        archive the current data/brief.json
//   node scripts/archive-brief.mjs --from <git rev>       archive data/brief.json as it was at that commit (back-fill)
//   --published YYYY-MM-DD                                date the brief went out (default: kept if the file exists, else today)
// The week is the ISO week (Monday to Sunday) of the newest item, the same rule the home page uses for its "Week NN" label.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, ISO_DATE } from './lib/taxonomy.mjs';

export const BRIEFS = path.join(ROOT, 'data', 'briefs');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ISO week of a YYYY-MM-DD date, with that week's Monday and Sunday.
export function briefWeek(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  const mon = new Date(d - ((d.getUTCDay() + 6) % 7) * 864e5), sun = new Date(+mon + 6 * 864e5), thu = new Date(+mon + 3 * 864e5);
  const wk = 1 + Math.floor((thu - Date.UTC(thu.getUTCFullYear(), 0, 1)) / (7 * 864e5));
  const day = x => x.toISOString().slice(0, 10);
  const span = mon.getUTCMonth() === sun.getUTCMonth()
    ? `${mon.getUTCDate()} – ${sun.getUTCDate()} ${MONTHS[sun.getUTCMonth()]} ${sun.getUTCFullYear()}`
    : `${mon.getUTCDate()} ${MONTHS[mon.getUTCMonth()]} – ${sun.getUTCDate()} ${MONTHS[sun.getUTCMonth()]} ${sun.getUTCFullYear()}`;
  return { week: `${thu.getUTCFullYear()}-w${String(wk).padStart(2, '0')}`, covers: [day(mon), day(sun)], label: `Week ${wk} · ${span}` };
}

export function archiveRecord(items, published, previous) {
  if (!Array.isArray(items) || !items.length) throw new Error('the brief has no items');
  const newest = items.map(b => b.date).filter(Boolean).sort().pop();
  if (!ISO_DATE.test(newest || '')) throw new Error('brief items need dates');
  const w = briefWeek(newest);
  return { week: w.week, label: w.label, covers: w.covers, published: published || previous?.published || new Date().toISOString().slice(0, 10), items };
}

function main() {
  const args = process.argv.slice(2);
  const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const from = opt('--from'), published = opt('--published');
  if (published && !ISO_DATE.test(published)) throw new Error('--published must be YYYY-MM-DD');
  const items = JSON.parse(from ? execFileSync('git', ['show', `${from}:data/brief.json`], { cwd: ROOT, encoding: 'utf8' }) : fs.readFileSync(path.join(ROOT, 'data', 'brief.json'), 'utf8'));
  const probe = archiveRecord(items, published || '2000-01-01');
  const file = path.join(BRIEFS, `${probe.week}.json`);
  const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  const rec = archiveRecord(items, published, previous);
  fs.mkdirSync(BRIEFS, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(rec, null, 2) + '\n');
  console.log(`${previous ? 'updated' : 'wrote'} ${path.relative(ROOT, file)}: ${rec.label}, ${rec.items.length} items, published ${rec.published}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { main(); } catch (e) { console.error(e.message); process.exit(1); }
}
