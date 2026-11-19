#!/usr/bin/env node
// Finds recent posts by official X accounts for the daily engagement sheet, each with its direct link, so the owner's
// "Open post" button goes to the post itself.
//   node scripts/social-x-posts.mjs [--days 2] [--json] [--cache <dir>]
// Reads the accounts in social/x-watch.json through X's public timeline embed (the feed websites embed: no login, read only,
// one request per account), keeps robotics posts from the last N days using the same filters as scripts/x-candidates.mjs,
// and confirms each one with X's oEmbed endpoint. X allows about 30 feed reads per 15 minutes, shared with anything else
// reading from the same network. If the limit is reached, the run waits once until the time X gives (16 minutes at most),
// then carries on; at a second limit it stops and reports what it skipped. It never posts, likes, follows or logs in.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { parseTimeline, pick } from './x-candidates.mjs';

const args = process.argv.slice(2);
const opt = (name, d) => (args.includes(name) ? args[args.indexOf(name) + 1] : d);
const days = Number(opt('--days', 2)) || 2, cacheDir = opt('--cache', ''), asJson = args.includes('--json');
const read = f => JSON.parse(fs.readFileSync(new URL(f, import.meta.url), 'utf8'));
const sources = Object.fromEntries(read('./x-sources.json').accounts.map(a => [a.handle.toLowerCase(), a]));
// A watched handle that isn't in x-sources.json is treated as a supplier: its posts must name a MENA place.
export const watchList = (handles, src = sources) => handles.slice(0, 28).map(h => src[h.toLowerCase()] || { handle: h, name: h, mena: false });

function get(url, withStatus = false) {
  const out = execFileSync('curl', ['-sS', '-L', '--max-time', '25', '-A', 'Mozilla/5.0 (compatible; RoboticsMENA-editorial/1.0)', ...(withStatus ? ['-w', '\n%{http_code} %header{x-rate-limit-reset}'] : []), url], { encoding: 'utf8', maxBuffer: 20e6 });
  if (!withStatus) return out;
  const cut = out.lastIndexOf('\n'), [status, reset] = out.slice(cut + 1).trim().split(' ');
  return { status: Number(status), reset: Number(reset) || 0, body: out.slice(0, cut) };
}
function timeline(handle) {
  const cached = cacheDir && `${cacheDir}/${handle}.json`;
  if (cached && fs.existsSync(cached) && Date.now() - fs.statSync(cached).mtimeMs < 6 * 3600e3) return { tweets: JSON.parse(fs.readFileSync(cached, 'utf8')) };
  const r = get(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}`, true);
  if (r.status === 429) return { limited: true, reset: r.reset };
  const tweets = r.status === 200 ? parseTimeline(r.body) : null;
  if (cached && tweets) { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(cached, JSON.stringify(tweets)); }
  return { tweets };
}
const verified = url => { try { return !!JSON.parse(get(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=1`)).html; } catch { return false; } };

async function main() {
  const since = new Date(Date.now() - days * 864e5), accounts = watchList(read('../social/x-watch.json').handles), found = [], problems = [];
  let waited = false;
  for (const [i, a] of accounts.entries()) {
    let t;
    try { t = timeline(a.handle); } catch (e) { problems.push(`${a.handle}: ${String(e.message).split('\n')[0]}`); continue; }
    if (t.limited && !waited) {
      waited = true;
      const waitMs = Math.min(16 * 60e3, Math.max(30e3, (t.reset ? t.reset * 1000 - Date.now() : 15 * 60e3) + 5e3));
      console.error(`X's read limit reached at @${a.handle}; waiting ${Math.ceil(waitMs / 60e3)} min as X asks.`);
      await new Promise(r => setTimeout(r, waitMs));
      try { t = timeline(a.handle); } catch { t = { limited: true }; }
    }
    if (t.limited) { problems.push(`X's read limit reached: not checked today: ${accounts.slice(i).map(x => '@' + x.handle).join(', ')}`); break; }
    if (!t.tweets) { problems.push(`${a.handle}: no feed (account missing or protected)`); continue; }
    found.push(...pick(t.tweets, a, since));
    await new Promise(r => setTimeout(r, 1200));   // about one request a second
  }
  const posts = found.sort((x, y) => y.id.length - x.id.length || (y.id > x.id ? 1 : -1)).filter(p => verified(p.url));
  if (asJson) { console.log(JSON.stringify({ since: since.toISOString().slice(0, 10), posts, problems }, null, 2)); return; }
  console.log(`Robotics posts by watched accounts since ${since.toISOString().slice(0, 10)}: ${posts.length}\n`);
  for (const p of posts) console.log(`${p.date}  @${p.handle}${p.english ? '' : '  (not English)'}\n   ${p.url}\n   ${p.text.slice(0, 240)}\n`);
  if (problems.length) console.log('Problems:\n  ' + problems.join('\n  '));
}
if (import.meta.url === `file://${process.argv[1]}`) main();
