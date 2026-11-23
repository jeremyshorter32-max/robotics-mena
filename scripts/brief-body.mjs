#!/usr/bin/env node
// Robotics MENA weekly brief: Kit body fragment (the robotics-mena-brief skill).
//
//   node scripts/brief-body.mjs stats <YYYY-MM-DD>       Print the live "By the numbers" values for an issue date
//   node scripts/brief-body.mjs build <newsletter/input/week-NN.md>
//        Validates the input, writes newsletter/out/week-NN-body.html and week-NN-subject.txt, then runs the checks.
//   node scripts/brief-body.mjs check <body.html> [subject.txt]
//        Runs the validation checklist on existing files. Exit code 1 if any check fails.
//
// It only writes files. It never sends, schedules or publishes anything.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = path.join(ROOT, '.claude/skills/robotics-mena-brief/assets/body.template.html');
const OUT = path.join(ROOT, 'newsletter', 'out');
const IMG_PREFIX = 'https://roboticsmena.com/media/brief/';
const IMG_WIDTH = 504; // 600px card minus 48px padding each side
const BANNED = ['revolutionary', 'game-changing', 'game changing', 'gamechanging', 'exciting', 'excited', 'groundbreaking', 'cutting-edge', 'disruptive'];
const ALLOWED_CLASSES = ['email-button', 'blockquotes'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const readJson = n => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', n + '.json'), 'utf8'));
const arr = j => Array.isArray(j) ? j : Object.values(j).find(Array.isArray) || [];

// Sentence count that ignores decimals (0.49%), initials and common abbreviations.
export function sentences(text) {
  const t = String(text).replace(/\b(\d)\.(\d)/g, '$1§$2').replace(/\b(e\.g|i\.e|vs|Dr|Mr|Ms|St|No|approx|Inc|Ltd|Co)\./g, '$1§')
    .replace(/\b([A-Z])\.(?=[A-Z]\.)/g, '$1§').replace(/\b(U\.S|U\.K|U\.A\.E)\./g, m => m.replace(/\./g, '§'));
  return t.split(/(?<=[.!?])["'’”)]*\s+(?=[A-Z0-9"'‘“(])/).map(s => s.trim()).filter(Boolean).length;
}

// ---------- stats ----------
function stats(dateIso) {
  const d0 = new Date(dateIso + 'T00:00:00Z'), d90 = new Date(d0.getTime() + 90 * 864e5).toISOString().slice(0, 10);
  const events = arr(readJson('events')).filter(e => (e.end || e.start) >= dateIso && e.start <= d90);
  return {
    companies: arr(readJson('companies')).length,
    deployments: arr(readJson('deployments')).length,
    countries: Object.keys(readJson('countries')).length,
    events_90d: events.length,
  };
}

// ---------- input ----------
// Format (documented in SKILL.md): "## Section" headings; "key: value" lines; "- a | b | c" list items.
// Signals are "## Signal 1" … "## Signal 5".
export function parseInput(md) {
  const doc = { _sections: {} }; let cur = doc;
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (/^#\s/.test(line) || /^<!--/.test(line.trim()) || !line.trim()) continue;
    const h = line.match(/^##\s+(.+)$/);
    if (h) { cur = { _name: h[1].trim(), _items: [] }; doc._sections[h[1].trim().toLowerCase()] = cur; continue; }
    const li = line.match(/^\s*-\s+(.+)$/);
    if (li) { (cur._items ||= []).push(li[1].split(/\s+\|\s+/).map(s => s.trim())); continue; }
    const kv = line.match(/^([a-z_0-9]+):\s*(.*)$/);
    if (kv) { cur[kv[1]] = kv[2].trim(); continue; }
    // continuation of the previous value
    const keys = Object.keys(cur).filter(k => !k.startsWith('_')); const last = keys[keys.length - 1];
    if (last) cur[last] += ' ' + line.trim();
  }
  return doc;
}

function validateInput(doc) {
  const errs = []; const S = doc._sections;
  const need = (o, keys, where) => keys.forEach(k => { if (!o || !String(o[k] ?? '').trim()) errs.push(`${where}: missing "${k}"`); });
  need(doc, ['week', 'dates', 'published', 'standfirst', 'take'], 'header');
  const st = S['by the numbers'];
  if (!st || st._items.length < 3 || st._items.length > 4) errs.push('By the numbers: needs 3–4 items');
  for (let i = 1; i <= 5; i++) {
    const s = S['signal ' + i];
    if (!s) { errs.push(`Signal ${i}: missing`); continue; }
    need(s, ['country', 'iso', 'date', 'headline', 'facts', 'takeaway', 'source', 'url', 'image', 'alt', 'credit'], `Signal ${i}`);
    if (s.iso && !/^[A-Z]{2}$/.test(s.iso)) errs.push(`Signal ${i}: iso must be a 2-letter code`);
    if (s.iso === 'IL' || /israel/i.test(JSON.stringify(s))) errs.push(`Signal ${i}: Israeli companies and the Israeli flag never appear`);
    if (s.date && !/^\d{4}-\d{2}-\d{2}$/.test(s.date)) errs.push(`Signal ${i}: date must be YYYY-MM-DD`);
  }
  if (S['signal 6']) errs.push('Exactly five signals');
  need(S.spotlight, ['title', 'body', 'quote', 'quote_by', 'url'], 'Spotlight');
  const n = (k, lo, hi) => { const x = S[k]?._items.length || 0; if (x < lo || x > hi) errs.push(`${S[k]?._name || k}: needs ${lo}–${hi} items, has ${x}`); };
  n('policy watch', 2, 3); n('on the calendar', 3, 5); n('also noted', 4, 6); n('subjects', 3, 3);
  if (!S.subjects?.preview) errs.push('Subjects: missing "preview"');
  return errs;
}

// ---------- render ----------
const block = (tpl, name) => { const m = tpl.match(new RegExp(`<!-- BEGIN ${name}\\b[^\\n]*?-->\\n([\\s\\S]*?)<!-- END ${name} -->\\n?`)); return m; };
const fill = (s, o) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => o[k] ?? `{{${k}}}`);
const kickDate = iso => { const [y, m, d] = iso.split('-'); return `${d} ${MONTHS[+m - 1]} ${y}`; };

export function render(doc) {
  let tpl = fs.readFileSync(TEMPLATE, 'utf8').replace(/<!--(?! BEGIN| END)[\s\S]*?-->\n?/, '');
  const S = doc._sections;
  const rep = (name, items, joiner = '') => { const m = block(tpl, name); tpl = tpl.replace(m[0], items.map(o => fill(m[1], o)).join(joiner)); };
  rep('stat', S['by the numbers']._items.map(([value, label]) => ({ value: esc(value), label: esc(label) })));
  const signals = [1, 2, 3, 4, 5].map(i => S['signal ' + i]);
  rep('signal', signals.map((s, i) => ({ image: esc(s.image), alt: esc(s.alt), credit: esc(s.credit), nn: String(i + 1).padStart(2, '0'),
    country: esc(s.country.toUpperCase()), date: kickDate(s.date), headline: esc(s.headline), takeaway: esc(s.takeaway), url: esc(s.url), source: esc(s.source) })), '\n<hr>\n\n');
  const li3 = ([text, source, url]) => ({ text: esc(text), source: esc(source), url: esc(url) });
  rep('policy', S['policy watch']._items.map(li3));
  rep('event', S['on the calendar']._items.map(([name, city, dates, url]) => ({ name: esc(name), city: esc(city), dates: esc(dates), url: esc(url) })));
  rep('noted', S['also noted']._items.map(li3));
  const sp = S.spotlight;
  const body = fill(tpl, { week_line: esc(`Week ${doc.week} · ${doc.dates}`), standfirst: esc(doc.standfirst), take: esc(doc.take),
    spotlight_title: esc(sp.title), spotlight_body: esc(sp.body), quote: esc(sp.quote), quote_by: esc(sp.quote_by), spotlight_url: esc(sp.url) });
  return body.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// ---------- checks ----------
const strip = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

export function check(html, subjectTxt) {
  const R = []; const ok = (name, pass, detail = '') => R.push({ name, pass: !!pass, detail });
  ok('No <html>/<head>/<body>/<style> tags', !/<\/?(html|head|body|style)\b/i.test(html));
  // signals: the segment between the "five signals" kicker and the Spotlight kicker, split on <hr>
  const seg = (html.split(/<p><strong>This week(?:'|&#39;|’)s five signals<\/strong><\/p>/)[1] || '').split(/<hr>\s*<p><strong>Spotlight/)[0];
  const sigs = seg.split(/<hr>/).map(s => s.trim()).filter(Boolean);
  const per = sigs.map((s, i) => {
    const c = re => (s.match(re) || []).length;
    const r = { h2: c(/<h2>/g), kicker: c(/<p><strong>\d\d · [A-Z ]+ · \d\d [A-Z]{3} \d{4}<\/strong><\/p>/g), img: c(/<img\b/g),
      credit: c(/<img\b[^>]*>\s*<p>(?!<)[^<]+<\/p>/g), source: c(/<p><a href="[^"]+">Source: [^<]+ →<\/a><\/p>/g) };
    return { i: i + 1, r, good: Object.values(r).every(v => v === 1) };
  });
  ok('Every signal has exactly one h2, kicker, image, credit p and source p', sigs.length === 5 && per.every(p => p.good),
    sigs.length !== 5 ? `found ${sigs.length} signals` : per.filter(p => !p.good).map(p => `signal ${p.i}: ${JSON.stringify(p.r)}`).join('; '));
  const hrefs = [...html.matchAll(/<a\b[^>]*>/g)].map(m => (m[0].match(/href="([^"]*)"/) || [])[1]);
  const badHref = hrefs.filter(h => !h || !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(h) || /example\.|placeholder|\{\{|#$|bit\.ly|t\.co\/|tinyurl|ow\.ly|buff\.ly|lnkd\.in/i.test(h));
  ok('Every <a> has an absolute https href (no bare, placeholder or shortened links)', hrefs.length && !badHref.length, badHref.length ? badHref.join(', ') : `${hrefs.length} links`);
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map(m => m[0]);
  const badImg = imgs.filter(t => !/\balt="[^"]+"/.test(t) || !/\bwidth="\d+"/.test(t) || !(t.match(/src="([^"]+)"/) || [])[1]?.startsWith(IMG_PREFIX));
  ok('Every <img> has alt and width and is on roboticsmena.com/media/brief/', imgs.length && !badImg.length, badImg.join(' ') || `${imgs.length} images`);
  const classes = [...html.matchAll(/class="([^"]*)"/g)].flatMap(m => m[1].split(/\s+/)).filter(c => c && !ALLOWED_CLASSES.includes(c));
  ok('No invented CSS classes', !classes.length, classes.join(', '));
  const styled = [...html.matchAll(/<(?!table|tr|td|tbody)(\w+)\b[^>]*\sstyle="/g)].map(m => m[1]);
  ok('No inline styles outside table structure', !styled.length, styled.join(', '));
  const takes = sigs.map((s, i) => { const t = (s.match(/<\/h2>\s*<p>([^<]+)<\/p>/) || [])[1] || ''; return { i: i + 1, n: sentences(strip(t)) }; });
  ok('Takeaways are exactly 2 sentences', takes.length === 5 && takes.every(t => t.n === 2), takes.map(t => `${t.i}:${t.n}`).join(' '));
  const heads = [...html.matchAll(/<h2>([^<]*)<\/h2>/g)].map(m => strip(m[1]));
  const long = heads.filter(h => h.length > 95);
  ok('Headlines are 95 characters or fewer', heads.length && !long.length, long.length ? long.map(h => `${h.length}: ${h}`).join(' | ') : `longest ${Math.max(...heads.map(h => h.length))}`);
  const kb = Buffer.byteLength(html) / 1024;
  ok('File size under 100KB', kb < 100, `${kb.toFixed(1)} KB`);
  const text = strip(html).toLowerCase() + ' ' + String(subjectTxt || '').toLowerCase();
  const hype = BANNED.filter(w => new RegExp(`\\b${w}\\b`).test(text));
  ok('No banned hype words or exclamation marks', !hype.length && !/!/.test(strip(html) + (subjectTxt || '')), hype.join(', '));
  ok('No background images, flex, grid, position, scripts or web fonts', !/background(-image)?:\s*url|display:\s*(flex|grid)|position:|<script|@font-face|@import|fonts\.googleapis/i.test(html));
  ok('No Israeli companies or flag', !/israel|🇮🇱/i.test(html));
  if (subjectTxt != null) {
    const subj = [...subjectTxt.matchAll(/^Subject \d: (.+)$/gm)].map(m => m[1].trim());
    const prev = (subjectTxt.match(/^Preview: (.+)$/m) || [])[1]?.trim() || '';
    const words = s => new Set(s.toLowerCase().match(/[a-z0-9$%,.]+/g)?.filter(w => w.length > 3) || []);
    const dup = subj.map(s => [...words(s)].filter(w => words(prev).has(w)));
    ok('3 subjects ≤ 55 chars, preview ≤ 90 chars, preview does not repeat a subject',
      subj.length === 3 && subj.every(s => s.length <= 55) && prev && prev.length <= 90 && dup.every(d => d.length <= 1),
      `subjects ${subj.map(s => s.length).join('/')}, preview ${prev.length}` + (dup.some(d => d.length > 1) ? `; shared words: ${dup.map(d => d.join(',')).join(' / ')}` : ''));
  }
  return R;
}

const report = R => { R.forEach(r => console.log(`[${r.pass ? 'x' : ' '}] ${r.name}${r.detail ? '  (' + r.detail + ')' : ''}`)); return R.every(r => r.pass); };

function main() {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === 'stats') { console.log(JSON.stringify(stats(a || new Date().toISOString().slice(0, 10)), null, 2)); return; }
  if (cmd === 'check') { const ok = report(check(fs.readFileSync(a, 'utf8'), b ? fs.readFileSync(b, 'utf8') : null)); process.exit(ok ? 0 : 1); }
  if (cmd === 'build') {
    const doc = parseInput(fs.readFileSync(a, 'utf8'));
    const errs = validateInput(doc);
    if (errs.length) { console.error('Input problems:\n- ' + errs.join('\n- ')); process.exit(1); }
    const nn = String(doc.week).padStart(2, '0');
    const live = stats(doc.published);
    console.log(`Live counts for ${doc.published}: ${JSON.stringify(live)}`);
    const statText = doc._sections["by the numbers"]._items.map(x => x.join(" ")).join(" ");
    const stale = Object.entries(live).filter(([, v]) => !new RegExp(`\\b${v.toLocaleString("en-GB")}\\b`).test(statText));
    if (stale.length) { console.error(`By the numbers does not match the live data: ${stale.map(([k, v]) => `${k}=${v}`).join(", ")}. Update the input.`); process.exit(1); }
    const html = render(doc);
    const S = doc._sections.subjects;
    const subject = S._items.map((s, i) => `Subject ${i + 1}: ${s[0]}`).join('\n') + `\nPreview: ${S.preview}\n`;
    fs.mkdirSync(OUT, { recursive: true });
    const bodyPath = path.join(OUT, `week-${nn}-body.html`), subjPath = path.join(OUT, `week-${nn}-subject.txt`);
    fs.writeFileSync(bodyPath, html); fs.writeFileSync(subjPath, subject);
    console.log(`Wrote ${path.relative(ROOT, bodyPath)} and ${path.relative(ROOT, subjPath)}\n`);
    const ok = report(check(html, subject));
    process.exit(ok ? 0 : 1);
  }
  console.log('Usage: node scripts/brief-body.mjs stats <date> | build <input.md> | check <body.html> [subject.txt]');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
