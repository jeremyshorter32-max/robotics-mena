#!/usr/bin/env node
// Finds recent robotics posts by official accounts for the home page's "Latest from X".
//   node scripts/x-candidates.mjs [--days 14] [--json]
// Reads each account in scripts/x-sources.json through X's public timeline embed (the feed websites embed; no login,
// one request per account, read only), keeps posts from the last N days that are about robots, drones, autonomous
// vehicles or physical AI (and, for suppliers, name a MENA place), then confirms each with X's oEmbed endpoint.
// Prints candidates newest first. It never posts, likes, follows or logs in. The editor still picks 5–8 and writes the notes.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const args = process.argv.slice(2);
const days = Number(args[args.indexOf('--days') + 1]) || 14;
const asJson = args.includes('--json');
const { accounts } = JSON.parse(fs.readFileSync(new URL('./x-sources.json', import.meta.url), 'utf8'));

export const ROBOTICS = /\b(robot\w*|humanoid\w*|drones?|uavs?|unmanned|autonomous|driverless|self-driving|robotaxis?|robobus\w*|physical ai|embodied|automat\w+|cobots?|crawlers?|evtol|air taxis?)\b|روبوت|ذاتية القيادة|ذاتي القيادة|بدون سائق|طائرات? بدون طيار|المسي[ّ]?رات?|مسي[ّ]?رة|الأتمتة|التاكسي الجوي/i;
export const MENA = /\b(uae|emirates?|dubai|abu dhabi|sharjah|ajman|ras al khaimah|fujairah|saudi|ksa|riyadh|jeddah|dammam|neom|qatar|doha|egypt|cairo|oman|muscat|bahrain|manama|kuwait|jordan|amman|morocco|casablanca|rabat|tunisia|algeria|mena|middle east|gulf|gcc)\b|الإمارات|دبي|أبوظبي|السعودية|الرياض|جدة|نيوم|قطر|الدوحة|مصر|القاهرة|عُ?مان|البحرين|الكويت|الأردن|المغرب|تونس|الجزائر|الخليج/i;
const EXCLUDE = /israel|إسرائيل|weapon|missile|munition|counter-uas|c-uas|kamikaze|loitering|سلاح|صاروخ/i;

export const postedAt = id => new Date(Number((BigInt(id) >> 22n) + 1288834974657n));

function curl(url, withHeaders = false) {
  const out = execFileSync('curl', ['-sS', '-L', '--max-time', '25', '-A', 'Mozilla/5.0 (compatible; RoboticsMENA-editorial/1.0)', ...(withHeaders ? ['-D', '-'] : []), url], { encoding: 'utf8', maxBuffer: 20e6 });
  if (!withHeaders) return out;
  const cut = out.lastIndexOf('\r\n\r\n'); const head = out.slice(0, cut), body = out.slice(cut + 4);
  const status = Number((head.match(/HTTP\/[\d.]+ (\d{3})(?![\s\S]*HTTP\/[\d.]+ \d{3})/) || [])[1] || 0);
  const reset = Number((head.match(/x-rate-limit-reset:\s*(\d+)/i) || [])[1] || 0);
  return { status, reset, body };
}

// X allows about 30 timeline reads per 15 minutes. On a 429, wait for X's reset time (at most 16 minutes) and retry once.
async function timeline(handle) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = curl(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}`, true);
    if (r.status === 429 && attempt === 0) {
      const waitMs = Math.min(16 * 60e3, Math.max(30e3, (r.reset ? r.reset * 1000 - Date.now() : 15 * 60e3) + 5e3));
      console.error(`Rate limit reached at @${handle}; waiting ${Math.round(waitMs / 60e3)} min as X asks.`);
      await new Promise(res => setTimeout(res, waitMs));
      continue;
    }
    return r.status === 200 ? parseTimeline(r.body) : null;
  }
  return null;
}

export function parseTimeline(html) {
  const m = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!m) return null;
  const entries = JSON.parse(m[1])?.props?.pageProps?.timeline?.entries || [];
  return entries.map(e => e?.content?.tweet).filter(Boolean);
}

export function pick(tweets, account, since) {
  return tweets.filter(t => {
    const text = t.full_text || t.text || '';
    if (t.user?.screen_name?.toLowerCase() !== account.handle.toLowerCase()) return false; // reposts of others
    if (/^RT @/.test(text) || (t.in_reply_to_screen_name && t.in_reply_to_screen_name.toLowerCase() !== account.handle.toLowerCase())) return false;
    if (postedAt(t.id_str) < since) return false;
    if (!ROBOTICS.test(text) || EXCLUDE.test(text)) return false;
    if (!account.mena && !MENA.test(text)) return false;
    return true;
  }).map(t => ({ id: t.id_str, url: `https://x.com/${account.handle}/status/${t.id_str}`, handle: account.handle, author: account.name,
    date: postedAt(t.id_str).toISOString().slice(0, 10), lang: t.lang, text: (t.full_text || t.text || '').replace(/\s+/g, ' ').trim() }));
}

function oembedOk(url) {
  try { const j = JSON.parse(curl(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=1`)); return !!j.html; } catch { return false; }
}

async function main() {
  const since = new Date(Date.now() - days * 864e5), out = [], problems = [];
  for (const a of accounts) {
    try {
      const tweets = await timeline(a.handle);
      if (!tweets) { problems.push(`${a.handle}: no timeline (account missing, protected or rate-limited)`); continue; }
      out.push(...pick(tweets, a, since));
    } catch (e) { problems.push(`${a.handle}: ${String(e.message).split('\n')[0]}`); }
    await new Promise(r => setTimeout(r, 1200)); // be gentle: about one request a second
  }
  // Same story posted twice (English and Arabic): keep both here; the editor chooses one.
  const verified = out.sort((x, y) => y.date.localeCompare(x.date)).filter(c => oembedOk(c.url));
  if (asJson) { console.log(JSON.stringify({ since: since.toISOString().slice(0, 10), candidates: verified, problems }, null, 2)); return; }
  console.log(`Robotics posts by official accounts since ${since.toISOString().slice(0, 10)}: ${verified.length}\n`);
  for (const c of verified) console.log(`${c.date}  @${c.handle}  ${c.url}\n   ${c.text.slice(0, 220)}\n`);
  if (problems.length) console.log('Skipped:\n  ' + problems.join('\n  '));
}

if (import.meta.url === `file://${process.argv[1]}`) main();
