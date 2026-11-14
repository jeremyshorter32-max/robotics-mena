#!/usr/bin/env node
// Social queue tool. Commands:
//   validate [week|all] [--media]   check a week's queue (all weeks by default); --media also checks rendered files
//   slots <week>                    list the cadence slots for a week and which are still empty
//   preview <week>                  write the posting pack social/out/<week>.html (copy buttons, images, sources)
//   pack <week>                     print the pull-request body (markdown) for a week
//   status <week> <status> [ids…]   set the status of posts (all posts if no ids), e.g. after scheduling them
//   metrics add k=v … [--date D]    record follower counts (linkedin, instagram, x, reddit)
//   metrics report                  growth, milestones and the weekly rate needed to reach the goal
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/taxonomy.mjs';
import { SOCIAL, PLATFORMS, validateQueue, missingSlots, slotDate, readJson, queuePath, cardFiles, extraFiles, xLength, weekStart } from './lib/social.mjs';

const [cmd, ...args] = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const pos = args.filter(a => !a.startsWith('--'));
const cadence = () => readJson(path.join(SOCIAL, 'cadence.json'));
const loadQueue = week => { const f = queuePath(week); if (!fs.existsSync(f)) die(`no queue for ${week} (${path.relative(ROOT, f)})`); return readJson(f); };
const weeks = () => fs.readdirSync(path.join(SOCIAL, 'queue')).filter(f => /^\d{4}-w\d{2}\.json$/.test(f)).map(f => f.slice(0, -5)).sort();
function die(m) { console.error(m); process.exit(1); }
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NAMES = { linkedin: 'LinkedIn', x: 'X', instagram: 'Instagram', reddit: 'Reddit' };
const fmtSlot = s => new Date(s).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' }) + ' GST';

function validate() {
  const list = pos[0] && pos[0] !== 'all' ? [pos[0]] : weeks();
  let bad = 0;
  for (const w of list) {
    const q = loadQueue(w);
    const { errors, warnings } = validateQueue(q, { media: flags.has('--media') });
    const gaps = missingSlots(q, cadence());
    warnings.forEach(x => console.log(`  warn  ${w} ${x}`));
    gaps.forEach(s => console.log(`  warn  ${w}: empty slot ${s.platform} ${s.day} ${s.time} (${s.what})`));
    errors.forEach(x => console.log(`  ERROR ${w} ${x}`));
    console.log(`${errors.length ? '✗' : '✓'} ${w}: ${q.posts.length} posts, ${errors.length} errors, ${warnings.length + gaps.length} warnings`);
    bad += errors.length;
  }
  if (bad) process.exit(1);
}

function slots() {
  const week = pos[0] || die('usage: slots <week>');
  const q = fs.existsSync(queuePath(week)) ? readJson(queuePath(week)) : { week, posts: [] };
  const empty = new Set(missingSlots(q, cadence()));
  for (const s of cadence().slots) console.log(`${empty.has(s) ? '[ ]' : '[x]'} ${slotDate(week, s.day, s.time)}  ${s.platform.padEnd(9)} ${s.format.padEnd(8)} ${s.what}`);
}

function setStatus() {
  const [week, status, ...ids] = pos;
  const q = loadQueue(week);
  q.posts.forEach(p => { if (!ids.length || ids.includes(p.id)) p.status = status; });
  const { errors } = validateQueue(q);
  if (errors.length) die(errors.join('\n'));
  fs.writeFileSync(queuePath(week), JSON.stringify(q, null, 2) + '\n');
  console.log(`${ids.length || q.posts.length} posts → ${status}`);
}

const byTime = q => [...q.posts].sort((a, b) => a.slot.localeCompare(b.slot) || PLATFORMS.indexOf(a.platform) - PLATFORMS.indexOf(b.platform));

function pack() {
  const week = pos[0] || die('usage: pack <week>');
  const q = loadQueue(week);
  const out = [`## Social queue ${week}${q.theme ? `: ${q.theme}` : ''}`, '',
    `${q.posts.length} posts: ${PLATFORMS.map(p => `${NAMES[p]} ${q.posts.filter(x => x.platform === p).length}`).join(' · ')}. ` +
    'Approve to merge, then load the week into the scheduler from the posting pack (`node scripts/social.mjs preview ' + week + '`).', '',
    '| When (Gulf) | Platform | Format | Post |', '|---|---|---|---|',
    ...byTime(q).map(p => `| ${fmtSlot(p.slot)} | ${NAMES[p.platform]} | ${p.format} | ${(p.title || p.text || p.thread?.[0] || '').split('\n')[0].slice(0, 90).replace(/\|/g, '/')} |`), ''];
  for (const p of byTime(q)) {
    out.push(`<details><summary><b>${NAMES[p.platform]} · ${fmtSlot(p.slot)} · ${p.format}</b> (${p.id})</summary>`, '');
    if (p.subreddit) out.push(`**r/${p.subreddit}**: ${p.title}`, '');
    if (p.thread) p.thread.forEach((t, i) => out.push(`**${i + 1}/${p.thread.length}** (${xLength(t)})`, '```', t, '```'));
    else if (p.text) out.push('```', p.text, '```');
    if (p.poll) out.push(`Poll: ${p.poll.question} → ${p.poll.options.join(' / ')}`, '');
    if (p.first_comment) out.push('First comment:', '```', p.first_comment, '```');
    const media = [...cardFiles(week, p), ...extraFiles(week, p)];
    if (media.length) out.push('Media: ' + media.map(f => `\`${f}\``).join(', '), '');
    if (p.media_note) out.push(`Media note: ${p.media_note}`, '');
    if (p.sources?.length) out.push('Sources: ' + p.sources.map(s => `[${s.name}](${s.url})`).join(', '), '');
    out.push('</details>', '');
  }
  console.log(out.join('\n'));
}

function preview() {
  const week = pos[0] || die('usage: preview <week>');
  const q = loadQueue(week);
  const { errors, warnings } = validateQueue(q, { media: true });
  const rel = f => path.relative(path.join(SOCIAL, 'out'), path.join(ROOT, f));
  const copy = (label, t) => `<div class="copy"><div class="lab">${esc(label)}<button onclick="cp(this)">Copy</button></div><pre>${esc(t)}</pre></div>`;
  const days = {};
  byTime(q).forEach(p => (days[p.slot.slice(0, 10)] ||= []).push(p));
  const posts = Object.entries(days).map(([d, ps]) => `<h2>${new Date(d + 'T12:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>` + ps.map(p => {
    const media = cardFiles(week, p);
    return `<article class="post ${p.platform}"><header><span class="pf">${NAMES[p.platform]}</span><span>${p.slot.slice(11, 16)} GST · ${esc(p.format)}${p.lang ? ' · ' + p.lang : ''}</span><span class="st">${esc(p.status)}</span></header>
${p.subreddit ? copy(`Title for r/${p.subreddit}`, p.title) : ''}
${p.thread ? p.thread.map((t, i) => copy(`Post ${i + 1}/${p.thread.length} · ${xLength(t)}/280`, t)).join('') : p.text ? copy(p.platform === 'x' ? `Post · ${xLength(p.text)}/280` : p.platform === 'instagram' ? 'Caption' : 'Text', p.text) : ''}
${p.poll ? copy('Poll', `${p.poll.question}\n${p.poll.options.join('\n')}`) : ''}
${p.first_comment ? copy('First comment', p.first_comment) : ''}
${media.length ? `<div class="media">${media.map(f => `<a href="${rel(f)}" download><img src="${rel(f)}" loading="lazy" alt=""></a>`).join('')}</div>` : ''}
${extraFiles(week, p).map(f => `<p><a href="${rel(f)}" download>Download ${path.extname(f).slice(1).toUpperCase()}</a></p>`).join('')}
${p.media_note ? `<p class="note">🎬 ${esc(p.media_note)}</p>` : ''}
${p.tags?.length ? `<p class="note">Tag: ${p.tags.map(esc).join(' · ')}</p>` : ''}
${p.sources?.length ? `<p class="src">Sources: ${p.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(' · ')}</p>` : ''}
</article>`;
  }).join('')).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Posting pack ${week}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Sans+Arabic:wght@400;600&display=swap">
<style>:root{--bg:#F3F1EC;--card:#fff;--ink:#111216;--muted:#5E6070;--line:#DEDBD3;--brand:#26246E;--tint:#E3E2F2}
@media (prefers-color-scheme:dark){:root{--bg:#111216;--card:#1B1C22;--ink:#F3F1EC;--muted:#A9AAB6;--line:#2E2F38;--brand:#8F8DC9;--tint:#24233F}}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 'IBM Plex Sans','IBM Plex Sans Arabic',sans-serif}main{max-width:860px;margin:0 auto;padding:24px 16px 80px}
h1{font-size:26px;margin:0 0 4px;color:var(--brand)}h2{margin:36px 0 12px;font-size:18px;border-bottom:1px solid var(--line);padding-bottom:6px}
.post{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--brand);border-radius:8px;padding:14px 16px;margin:0 0 14px}
.post header{display:flex;gap:12px;align-items:center;font:500 12px 'IBM Plex Mono',monospace;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}
.pf{color:var(--brand);font-weight:600}.st{margin-left:auto;background:var(--tint);color:var(--brand);padding:2px 8px;border-radius:99px}
.copy{margin:8px 0}.lab{display:flex;justify-content:space-between;align-items:center;font:500 11px 'IBM Plex Mono',monospace;color:var(--muted)}
.lab button{font:inherit;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:6px;padding:3px 10px;cursor:pointer}
pre{white-space:pre-wrap;word-wrap:break-word;font:14px/1.5 'IBM Plex Sans','IBM Plex Sans Arabic',sans-serif;background:var(--bg);border-radius:6px;padding:10px 12px;margin:4px 0 0;unicode-bidi:plaintext}
.media{display:flex;gap:8px;overflow-x:auto;padding:6px 0}.media img{height:220px;border-radius:6px;border:1px solid var(--line)}
.note,.src{font-size:13px;color:var(--muted);margin:6px 0 0}a{color:var(--brand)}.issues{background:#FCEBEA;color:#7A1F1A;padding:10px 14px;border-radius:8px;font-size:13px}</style></head>
<body><main><h1>Posting pack · ${week}</h1><p style="color:var(--muted);margin:0">${esc(q.theme || '')} · ${q.posts.length} posts · times are Gulf Standard Time (UTC+4). Tap an image to download it.</p>
${errors.length || warnings.length ? `<div class="issues">${[...errors.map(e => '✗ ' + e), ...warnings.map(e => '• ' + e)].map(esc).join('<br>')}</div>` : ''}
${posts}</main><script>function cp(b){navigator.clipboard.writeText(b.closest('.copy').querySelector('pre').innerText).then(()=>{b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1200)})}</script></body></html>`;
  fs.mkdirSync(path.join(SOCIAL, 'out'), { recursive: true });
  const f = path.join(SOCIAL, 'out', `${week}.html`);
  fs.writeFileSync(f, html);
  console.log(path.relative(ROOT, f) + (errors.length ? `  (${errors.length} errors shown at the top)` : ''));
}

function metrics() {
  const f = path.join(SOCIAL, 'metrics.json');
  const m = readJson(f);
  if (pos[0] === 'add') {
    const di = args.indexOf('--date');
    const date = di >= 0 ? args[di + 1] : new Date().toISOString().slice(0, 10);
    const e = { date };
    pos.slice(1).filter(a => a.includes('=')).forEach(a => { const [k, v] = a.split('='); if (!PLATFORMS.includes(k)) die(`unknown platform ${k}`); e[k] = Number(v); if (!Number.isFinite(e[k])) die(`${a} is not a number`); });
    m.entries = m.entries.filter(x => x.date !== date).concat({ ...(m.entries.find(x => x.date === date) || {}), ...e }).sort((a, b) => a.date.localeCompare(b.date));
    fs.writeFileSync(f, JSON.stringify(m, null, 2) + '\n');
    console.log('saved', JSON.stringify(e));
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  console.log(`Goal: ${m.goal.toLocaleString()} followers per platform`);
  for (const p of PLATFORMS) {
    const pts = m.entries.filter(e => Number.isFinite(e[p]));
    const last = pts.at(-1), prev = pts.at(-2);
    const ms = Object.entries(m.milestones).find(([d]) => d >= (last?.date || today));
    const weeksLeft = Math.max(1, (new Date(m.target_dates[p]) - new Date(last?.date || today)) / 6048e5);
    const need = last ? Math.max(0, Math.ceil((m.goal - last[p]) / weeksLeft)) : null;
    const rate = last && prev ? Math.round((last[p] - prev[p]) / Math.max(1, (new Date(last.date) - new Date(prev.date)) / 6048e5)) : null;
    console.log(`${NAMES[p].padEnd(10)} ${last ? String(last[p]).padStart(6) + ` (${last.date})` : '     — no data yet'}` +
      `${rate !== null ? `  ${rate >= 0 ? '+' : ''}${rate}/week` : ''}${ms ? `  next milestone ${ms[1][p]} by ${ms[0]}` : ''}` +
      `${need !== null ? `  needs +${need}/week for 10K by ${m.target_dates[p]}` : ''}${rate !== null && need !== null ? (rate >= need ? '  ✓ on pace' : '  ✗ behind pace') : ''}`);
  }
}

const COMMANDS = { validate, slots, preview, pack, status: setStatus, metrics };
(COMMANDS[cmd] || (() => die(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 10).map(l => l.slice(3)).join('\n'))))();
