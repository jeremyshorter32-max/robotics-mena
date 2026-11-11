#!/usr/bin/env node
// Weekly brief newsletter: builds the email from the site's data and manages the Kit (kit.com) draft.
//
//   node scripts/newsletter.mjs build      Build newsletter/out/brief.html (the email) and preview.html (for review)
//   node scripts/newsletter.mjs draft      Build, then create or update the draft in Kit (never sends)
//   node scripts/newsletter.mjs schedule   Schedule the current draft for Monday 07:00 Gulf time (03:00 UTC).
//                                          Only run this after the owner has approved the draft.
//   node scripts/newsletter.mjs unschedule Turn a scheduled broadcast back into a draft
//   node scripts/newsletter.mjs status     Show the current draft or scheduled broadcast
//
// The Kit API key is read from KIT_API_KEY. In Claude Code cloud sessions it is injected by the network proxy,
// so the variable can be left unset there. Optional per-issue text lives in data/newsletter.json
// (subject, preview text, editor's note); everything else comes from data/*.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'newsletter', 'out');
const STATE = path.join(ROOT, 'newsletter', 'state.json');
const SITE = 'https://roboticsmena.com';
const API = 'https://api.kit.com/v4';
const read = n => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', n + '.json'), 'utf8'));
const readOpt = n => { try { return read(n); } catch { return {}; } };

const C = { indigo: '#26246E', paper: '#F3F1EC', ink: '#111216', muted: '#5E6070', line: '#DEDBD3', tint: '#E3E2F2' };
const SANS = "'IBM Plex Sans',Helvetica,Arial,sans-serif", MONO = "'IBM Plex Mono',Menlo,Consolas,monospace";
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const D = iso => new Date(iso + 'T12:00:00Z');
const fmt = (iso, o) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...o }).format(D(iso));
const day = iso => fmt(iso, { day: 'numeric', month: 'short' });

// ISO week (Monday to Sunday) of the newest brief item, as on the site.
function weekOf(iso) {
  const d = D(iso), mon = new Date(d - ((d.getUTCDay() + 6) % 7) * 864e5), sun = new Date(+mon + 6 * 864e5), thu = new Date(+mon + 3 * 864e5);
  const wk = 1 + Math.floor((thu - Date.UTC(thu.getUTCFullYear(), 0, 1)) / (7 * 864e5));
  const m = x => x.toISOString().slice(0, 10);
  const sameM = mon.getUTCMonth() === sun.getUTCMonth() && mon.getUTCFullYear() === sun.getUTCFullYear();
  const span = (sameM ? fmt(m(mon), { day: 'numeric' }) : fmt(m(mon), { day: 'numeric', month: 'short' })) + ' – ' + fmt(m(sun), { day: 'numeric', month: 'short', year: 'numeric' });
  return { wk, span, label: `Week ${wk} · ${span}` };
}

export function build() {
  const brief = read('brief'), stories = read('stories'), deps = read('deployments'), events = read('events'), countries = read('countries');
  const extra = readOpt('newsletter');
  const cn = Object.fromEntries(countries.map(c => [c.code, c.name]));
  const newest = brief.map(b => b.date).sort().pop();
  const W = weekOf(newest);
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  const newDeps = deps.filter(d => d.is_new && d.added && d.added >= since).sort((a, b) => b.date.localeCompare(a.date));
  const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const soon = events.filter(e => !e.tentative && (e.end || e.start) >= today && e.start <= in30).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4);
  const story = stories[0];
  const subject = extra.subject || `The Brief, week ${W.wk}: ${brief[0].title}`;
  const preview = extra.preview_text || brief.slice(1, 3).map(b => b.title).join(' · ');

  const label = t => `<div style="font:500 11px/16px ${MONO};letter-spacing:.12em;text-transform:uppercase;color:${C.muted};margin:0 0 12px">${esc(t)}</div>`;
  const rule = `<tr><td style="padding:0 32px"><div style="border-top:1px solid ${C.line};height:1px;line-height:1px;font-size:0">&nbsp;</div></td></tr>`;
  const sec = html => `<tr><td style="padding:28px 32px">${html}</td></tr>`;

  const signals = brief.map((b, i) => `
    <tr><td style="padding:0 0 22px">
      <div style="font:500 12px/16px ${MONO};color:${C.muted};margin:0 0 6px">${String(i + 1).padStart(2, '0')} · ${esc(cn[b.country] || b.country)} · ${esc(day(b.date))}</div>
      <div style="font:600 18px/1.3 ${SANS};color:${C.ink};margin:0 0 6px">${esc(b.title)}</div>
      <div style="font:400 15px/1.55 ${SANS};color:${C.muted};margin:0 0 6px">${esc(b.takeaway)}</div>
      ${b.source_url ? `<a href="${esc(b.source_url)}" style="font:500 13px/18px ${SANS};color:${C.indigo};text-decoration:underline">Source: ${esc(b.source)}</a>` : ''}
    </td></tr>`).join('');

  const spot = story ? sec(`${label('This week’s Spotlight')}
      <div style="font:600 20px/1.3 ${SANS};color:${C.ink};margin:0 0 8px">${esc(story.title.en)}</div>
      <div style="font:400 15px/1.55 ${SANS};color:${C.muted};margin:0 0 14px">${esc(story.dek.en)}</div>
      <a href="${SITE}/spotlight?s=${esc(story.id)}" style="display:inline-block;background:${C.indigo};color:${C.paper};font:600 14px/1 ${SANS};padding:12px 18px;border-radius:6px;text-decoration:none">Read the report</a>`) : '';

  const map = newDeps.length ? sec(`${label(`On the map · ${newDeps.length} new`)}
      ${newDeps.map(d => `<div style="padding:0 0 10px"><a href="${SITE}/database?tab=deployments&amp;id=${esc(d.id)}" style="font:600 15px/1.4 ${SANS};color:${C.ink};text-decoration:none">${esc(d.title)}</a><div style="font:400 13px/1.45 ${SANS};color:${C.muted}">${esc(d.operator)} · ${esc(cn[d.country] || d.country)}</div></div>`).join('')}
      <a href="${SITE}/map" style="font:500 13px/18px ${SANS};color:${C.indigo}">Open the map</a>`) : '';

  const ev = soon.length ? sec(`${label('Coming up')}
      ${soon.map(e => `<div style="padding:0 0 10px"><span style="font:500 13px/1.4 ${MONO};color:${C.indigo}">${esc(e.dates_confirmed ? (e.end && e.end !== e.start ? (e.start.slice(0, 7) === e.end.slice(0, 7) ? fmt(e.start, { day: 'numeric' }) : day(e.start)) + '–' + day(e.end) : day(e.start)) : fmt(e.start, { month: 'long' }) + ' (TBC)')}</span>
        <div style="font:600 15px/1.4 ${SANS};color:${C.ink}">${e.url ? `<a href="${esc(e.url)}" style="color:${C.ink};text-decoration:none">${esc(e.name)}</a>` : esc(e.name)}</div>
        <div style="font:400 13px/1.45 ${SANS};color:${C.muted}">${esc([e.venue, e.city].filter(Boolean).join(', '))}</div></div>`).join('')}
      <a href="${SITE}/events" style="font:500 13px/18px ${SANS};color:${C.indigo}">All events</a>`) : '';

  const note = extra.intro ? sec(`<div style="font:400 16px/1.6 ${SANS};color:${C.ink}">${esc(extra.intro)}</div>`) + rule : '';

  const html = `<!-- Robotics MENA weekly brief · ${W.label} -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid ${C.line}">
  <tr><td style="background:${C.indigo};padding:24px 32px">
    <a href="${SITE}"><img src="${SITE}/brand/logo/png/lockup-horizontal-white-2x.png" width="134" height="50" alt="Robotics MENA" style="display:block;border:0;height:50px;width:auto"></a>
    <div style="font:500 12px/16px ${MONO};letter-spacing:.12em;text-transform:uppercase;color:${C.tint};margin:18px 0 0">The Brief · ${esc(W.label)}</div>
    <div style="font:600 24px/1.25 ${SANS};color:${C.paper};margin:6px 0 0">Five signals from MENA robotics this week</div>
  </td></tr>
  ${note}
  ${sec(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${signals}</table>`)}
  ${spot ? rule + spot : ''}
  ${map ? rule + map : ''}
  ${ev ? rule + ev : ''}
  ${rule}
  ${sec(`<div style="font:400 13px/1.55 ${SANS};color:${C.muted}">Every item links to its primary source. Spotted an error or have a tip? Reply to this email or write to contact@roboticsmena.com.<br><br>You are receiving this because you signed up at <a href="${SITE}" style="color:${C.indigo}">roboticsmena.com</a>. We never sell or share your email. <a href="${SITE}/privacy" style="color:${C.indigo}">Privacy policy</a></div>`)}
</table></td></tr></table>`;

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'brief.html'), html);
  fs.writeFileSync(path.join(OUT, 'preview.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"></head><body style="margin:0;background:${C.paper}"><div style="max-width:600px;margin:16px auto 0;padding:0 12px;font:400 13px/1.5 ${SANS};color:${C.muted}"><b style="color:${C.ink}">Subject:</b> ${esc(subject)}<br><b style="color:${C.ink}">Preview text:</b> ${esc(preview)}</div>${html}</body></html>`);
  return { subject, preview, html, week: W, counts: { signals: brief.length, newDeps: newDeps.length, events: soon.length } };
}

// ---- Kit API -------------------------------------------------------------------------------------------
async function kit(method, p, body) {
  const r = await fetch(API + p, { method, headers: { 'X-Kit-Api-Key': process.env.KIT_API_KEY || 'injected-by-proxy', 'Content-Type': 'application/json', Accept: 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 400) }; }
  if (!r.ok) throw new Error(`Kit ${method} ${p}: ${r.status} ${JSON.stringify(j).slice(0, 400)}`);
  return j;
}
const loadState = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return {}; } };
const saveState = s => { fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(s, null, 2) + '\n'); };
// Next Monday 03:00 UTC (07:00 Gulf Standard Time). If it is already Monday after 03:00, the following Monday.
export function nextSend(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 0, 0));
  let add = (8 - d.getUTCDay()) % 7; if (add === 0 && now >= d) add = 7;
  return new Date(+d + add * 864e5);
}

async function main() {
  const cmd = process.argv[2] || 'build';
  if (cmd === 'build') { const b = build(); console.log(`Built newsletter/out/brief.html · "${b.subject}" · ${JSON.stringify(b.counts)}`); return; }
  const st = loadState();
  if (cmd === 'draft') {
    const b = build();
    const body = { subject: b.subject, preview_text: b.preview, content: b.html, description: 'Weekly brief · ' + b.week.label, public: false, send_at: null };
    const isOpen = st.id && st.week === b.week.label && st.status !== 'scheduled';
    const r = isOpen ? await kit('PUT', `/broadcasts/${st.id}`, body) : await kit('POST', '/broadcasts', body);
    saveState({ id: r.broadcast.id, week: b.week.label, subject: b.subject, status: 'draft', updated: new Date().toISOString() });
    console.log(`${isOpen ? 'Updated' : 'Created'} Kit draft ${r.broadcast.id} · "${b.subject}"`); return;
  }
  if (!st.id) throw new Error('No draft yet: run "draft" first.');
  if (cmd === 'schedule') {
    const when = process.argv[3] ? new Date(process.argv[3]) : nextSend();
    const r = await kit('PUT', `/broadcasts/${st.id}`, { public: true, send_at: when.toISOString() });
    saveState({ ...st, status: 'scheduled', send_at: r.broadcast.send_at || when.toISOString() });
    console.log(`Scheduled Kit broadcast ${st.id} for ${when.toISOString()} (07:00 Gulf time)`); return;
  }
  if (cmd === 'unschedule') { await kit('PUT', `/broadcasts/${st.id}`, { public: false, send_at: null }); saveState({ ...st, status: 'draft', send_at: null }); console.log(`Broadcast ${st.id} is a draft again`); return; }
  if (cmd === 'status') { const r = await kit('GET', `/broadcasts/${st.id}`); const x = r.broadcast; console.log(JSON.stringify({ id: x.id, subject: x.subject, send_at: x.send_at, public: x.public, local: st }, null, 2)); return; }
  throw new Error('Unknown command: ' + cmd);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e.message); process.exit(1); });
