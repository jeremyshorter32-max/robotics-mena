#!/usr/bin/env node
// Renders branded social images with Playwright (the same Chromium the report PDFs use).
//   node scripts/social-cards.cjs week <YYYY-wNN|campaign> [postId…]   cards for a week or campaign → social/cards/<name>/
//        <postId>-<n>.png for every card; LinkedIn document posts also get <postId>.pdf; Instagram reels <postId>.mp4
//   node scripts/social-cards.cjs banners                      profile headers and highlight covers → brand/social/
// Card spec (in the queue): { template: cover|signal|stat|bars|list|cta, size: portrait|square|story|landscape,
//   theme?: light|dark, kicker?, title, body?, foot?, value?, label?, rows?: [{label, value, note?}], items?: [..],
//   image?: '/media/…' (rights-cleared site image), image_credit?, lang?: en|ar, page?: '2/6' }
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SIZES = { portrait: [1080, 1350], square: [1080, 1080], story: [1080, 1920], landscape: [1200, 675] };
const SCALE = { portrait: 1, square: 0.92, story: 1.04, landscape: 0.8 };
const svg64 = f => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'brand/logo', f)).toString('base64');
const LOGO = { light: svg64('lockup-horizontal-indigo.svg'), dark: svg64('lockup-horizontal-white.svg'), bilLight: svg64('lockup-bilingual-indigo.svg'),
  bilDark: svg64('lockup-bilingual-white.svg'), symDark: svg64('symbol-white.svg'), symLight: svg64('symbol-indigo.svg') };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
const FONTS = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap">`;

function cardHtml(c) {
  const [W, H] = SIZES[c.size] || SIZES.portrait;
  const u = SCALE[c.size] || 1;
  const dark = c.theme ? c.theme === 'dark' : ['cover', 'cta'].includes(c.template);
  const ar = c.lang === 'ar';
  const pad = (c.size === 'story' ? 96 : 80) * u, padTop = (c.size === 'story' ? 150 : 72) * u;
  let main = '';
  if (c.template === 'stat') {
    main = `${c.kicker ? `<div class="kicker">${esc(c.kicker)}</div>` : ''}<div class="value fit">${esc(c.value)}</div><div class="label fit">${md(c.label || c.title)}</div>${c.body ? `<div class="body fit">${md(c.body)}</div>` : ''}`;
  } else if (c.template === 'bars') {
    const max = Math.max(...c.rows.map(r => r.value));
    main = `${c.kicker ? `<div class="kicker">${esc(c.kicker)}</div>` : ''}<h1 class="fit sm">${md(c.title)}</h1><div class="bars">${c.rows.map((r, i) =>
      `<div class="row"><div class="rl">${esc(r.label)}</div><div class="track"><div class="bar${i === 0 ? ' top' : ''}" style="width:${Math.max(2, r.value / max * 100)}%"></div></div><div class="rv">${esc(r.note ?? r.value)}</div></div>`).join('')}</div>${c.body ? `<div class="body fit">${md(c.body)}</div>` : ''}`;
  } else if (c.template === 'list') {
    main = `${c.kicker ? `<div class="kicker">${esc(c.kicker)}</div>` : ''}<h1 class="fit sm">${md(c.title)}</h1><ol class="items fit">${(c.items || []).map(x => `<li><span>${md(x)}</span></li>`).join('')}</ol>`;
  } else if (c.template === 'cta') {
    main = `<img class="sym" src="${dark ? LOGO.symDark : LOGO.symLight}" alt=""><h1 class="fit">${md(c.title || 'Follow the MENA robotics desk')}</h1>${c.body ? `<div class="body fit">${md(c.body)}</div>` : ''}<div class="handles">${esc(c.handles || '@roboticsmena · roboticsmena.com')}</div>`;
  } else {
    // cover and signal
    main = `${c.image ? `<div class="photo" style="background-image:url('${'file://' + path.join(ROOT, c.image)}')"><span>${esc(c.image_credit || '')}</span></div>` : ''}
${c.kicker ? `<div class="kicker">${esc(c.kicker)}</div>` : ''}<h1 class="fit${c.template === 'cover' ? ' big' : ''}">${md(c.title)}</h1>${c.body ? `<div class="body fit">${md(c.body)}</div>` : ''}`;
  }
  const logo = c.template === 'cta' ? '' : `<img class="logo" src="${dark ? (ar ? LOGO.bilDark : LOGO.dark) : (ar ? LOGO.bilLight : LOGO.light)}" alt="">`;
  return `<!doctype html><html lang="${ar ? 'ar' : 'en'}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">${FONTS}<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:${dark ? '#26246E' : '#F3F1EC'};--ink:${dark ? '#F3F1EC' : '#111216'};--muted:${dark ? '#C9C8E6' : '#5E6070'};--accent:${dark ? '#FFFFFF' : '#26246E'};--tint:${dark ? 'rgba(255,255,255,.12)' : '#E3E2F2'};--line:${dark ? 'rgba(255,255,255,.22)' : '#DEDBD3'}}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:var(--bg);color:var(--ink);font-family:${ar ? "'IBM Plex Sans Arabic','IBM Plex Sans'" : "'IBM Plex Sans','IBM Plex Sans Arabic'"},sans-serif;-webkit-font-smoothing:antialiased}
.card{position:relative;width:100%;height:100%;padding:${padTop}px ${pad}px ${pad * 0.8}px;display:flex;flex-direction:column}
${dark ? `.card:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 85% 12%,rgba(143,141,201,.35),transparent 45%);pointer-events:none}` : `.card:before{content:'';position:absolute;${ar ? 'left' : 'right'}:0;top:0;width:${14 * u}px;height:100%;background:#26246E}`}
.top{display:flex;align-items:center;justify-content:space-between;position:relative}
.logo{height:${50 * u}px;width:auto}.page{font:600 ${24 * u}px 'IBM Plex Mono',monospace;color:var(--muted);letter-spacing:.08em}
.main{flex:1;display:flex;flex-direction:column;justify-content:${c.template === 'cta' ? 'center' : c.image ? 'flex-start' : 'center'};gap:${30 * u}px;position:relative;min-height:0;padding:${36 * u}px 0}
.kicker{align-self:flex-start;font:600 ${25 * u}px 'IBM Plex Mono',${ar ? "'IBM Plex Sans Arabic'," : ''}monospace;letter-spacing:${ar ? 0 : '.14em'};text-transform:${ar ? 'none' : 'uppercase'};color:var(--accent);background:var(--tint);padding:${10 * u}px ${18 * u}px}
h1{font-weight:600;font-size:${76 * u}px;line-height:${ar ? 1.35 : 1.08};letter-spacing:${ar ? 0 : '-.025em'};color:var(--ink)}
h1.big{font-size:${96 * u}px}h1.sm{font-size:${60 * u}px}h1 b{color:var(--accent);font-weight:700}
.body{font-size:${36 * u}px;line-height:${ar ? 1.7 : 1.42};color:var(--muted)}.body b{color:var(--ink);font-weight:600}
.value{font:700 ${230 * u}px/0.95 'IBM Plex Sans',sans-serif;letter-spacing:-.04em;color:var(--accent)}
.label{font-size:${52 * u}px;line-height:1.2;font-weight:600}
.bars{display:flex;flex-direction:column;gap:${16 * u}px}.row{display:grid;grid-template-columns:${230 * u}px 1fr ${90 * u}px;align-items:center;gap:${18 * u}px;font-size:${30 * u}px}
.rl{font-weight:500}.rv{font:600 ${30 * u}px 'IBM Plex Mono',monospace;text-align:${ar ? 'left' : 'right'}}.track{height:${34 * u}px;background:var(--tint)}.bar{height:100%;background:${dark ? '#8F8DC9' : '#8F8DC9'}}.bar.top{background:var(--accent)}
.items{list-style:none;counter-reset:i;display:flex;flex-direction:column;gap:${22 * u}px;font-size:${34 * u}px;line-height:1.35}
.items li{counter-increment:i;display:grid;grid-template-columns:${70 * u}px 1fr;padding-bottom:${20 * u}px;border-bottom:1px solid var(--line)}.items li:before{content:counter(i,decimal-leading-zero);font:600 ${26 * u}px 'IBM Plex Mono',monospace;color:var(--accent);padding-top:${6 * u}px}
.items li b{font-weight:600}
.photo{height:${c.size === 'landscape' ? 0 : 520 * u}px;background-size:cover;background-position:center;position:relative;flex:none;margin-bottom:${8 * u}px}
.photo span{position:absolute;${ar ? 'left' : 'right'}:${12 * u}px;bottom:${10 * u}px;font:500 ${18 * u}px 'IBM Plex Mono',monospace;color:#fff;background:rgba(17,18,22,.6);padding:${4 * u}px ${10 * u}px}
.sym{width:${200 * u}px;height:auto;align-self:${c.size === 'landscape' ? 'flex-start' : 'center'}}
${c.template === 'cta' ? `.main{align-items:center;text-align:center}h1{font-size:${80 * u}px}.handles{font:600 ${30 * u}px 'IBM Plex Mono',monospace;letter-spacing:.06em;color:var(--accent);border:2px solid var(--line);padding:${16 * u}px ${28 * u}px}` : ''}
.foot{display:flex;justify-content:space-between;align-items:flex-end;gap:${24 * u}px;border-top:2px solid var(--line);padding-top:${22 * u}px;font:500 ${22 * u}px 'IBM Plex Mono',${ar ? "'IBM Plex Sans Arabic'," : ''}monospace;color:var(--muted);position:relative}
.foot .url{color:var(--accent);font-weight:600;white-space:nowrap}
</style></head><body><div class="card"><div class="top">${logo}${c.page ? `<span class="page">${esc(c.page)}</span>` : ''}</div>
<div class="main">${main}</div>
<div class="foot"><span>${md(c.foot || '')}</span><span class="url">roboticsmena.com</span></div></div>
<script>
// Shrink text until everything fits the card (titles of any length stay inside the frame).
window.fit = () => { const m = document.querySelector('.main'); const els = [...document.querySelectorAll('.fit')]; let k = 1;
  for (let i = 0; i < 40 && m.scrollHeight > m.clientHeight + 1; i++) { k *= 0.95; els.forEach(e => { e.style.fontSize = (parseFloat(getComputedStyle(e).fontSize) * 0.95) + 'px'; }); } return k; };
</script></body></html>`;
}

async function shoot(page, html, size, out) {
  const [W, H] = SIZES[size] || SIZES.portrait;
  await page.setViewportSize({ width: W, height: H });
  const tmp = out + '.tmp.html';
  fs.writeFileSync(tmp, html);
  await page.goto('file://' + tmp, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.fit && window.fit());
  await page.screenshot({ path: out, type: 'png' });
  fs.unlinkSync(tmp);
}

async function makePdf(pngs, out) {
  const { PDFDocument } = require('pdf-lib');
  const doc = await PDFDocument.create();
  for (const f of pngs) {
    const img = await doc.embedPng(fs.readFileSync(f));
    const p = doc.addPage([img.width, img.height]);
    p.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  doc.setTitle('Robotics MENA'); doc.setAuthor('Robotics MENA');
  fs.writeFileSync(out, await doc.save());
}

// Slideshow with cross-fades. Instagram adds the audio track (chosen in the app, so it can be a trending one).
function makeReel(pngs, out, secs = 3) {
  const fade = 0.5, n = pngs.length;
  const inputs = pngs.flatMap(f => ['-loop', '1', '-t', String(secs + fade), '-i', f]);
  let chain = '', last = '[0:v]';
  for (let i = 1; i < n; i++) { const o = i === n - 1 ? '[v]' : `[x${i}]`; chain += `${last}[${i}:v]xfade=transition=fade:duration=${fade}:offset=${(secs * i).toFixed(2)}${o};`; last = o; }
  const filter = n > 1 ? chain + '[v]format=yuv420p,fps=30[out]' : '[0:v]format=yuv420p,fps=30[out]';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-map', '[out]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-movflags', '+faststart', out]);
}

async function renderWeek(week, only) {
  const q = JSON.parse(fs.readFileSync(path.join(ROOT, 'social', /^\d{4}-w\d{2}$/.test(week) ? 'queue' : 'campaigns', week + '.json'), 'utf8'));
  const dir = path.join(ROOT, 'social/cards', week);
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let n = 0;
  for (const p of q.posts.filter(p => (p.cards || []).length && (!only.length || only.includes(p.id)))) {
    const files = [];
    for (const [i, c] of p.cards.entries()) {
      const spec = { lang: p.lang === 'ar' ? 'ar' : 'en', ...c, page: c.page ?? (p.cards.length > 1 ? `${String(i + 1).padStart(2, '0')} / ${String(p.cards.length).padStart(2, '0')}` : '') };
      const out = path.join(dir, `${p.id}-${i + 1}.png`);
      await shoot(page, cardHtml(spec), spec.size, out);
      files.push(out); n++;
    }
    if (p.platform === 'linkedin' && p.format === 'document') await makePdf(files, path.join(dir, `${p.id}.pdf`));
    if (p.format === 'reel') makeReel(files, path.join(dir, `${p.id}.mp4`), p.reel_seconds || 3);
    console.log(`✓ ${p.id}: ${files.length} card${files.length > 1 ? 's' : ''}${p.format === 'document' ? ' + pdf' : ''}${p.format === 'reel' ? ' + mp4' : ''}`);
  }
  await browser.close();
  console.log(`${n} images in social/cards/${week}/`);
}

const TAG_EN = 'Verified robot deployments, companies, policy and events across the Middle East & North Africa';
function bannerHtml(kind) {
  const B = { x: [1500, 500], linkedin: [1128, 191], reddit: [1920, 384] }[kind];
  const [W, H] = B;
  const lockH = { x: 92, linkedin: 52, reddit: 84 }[kind];
  // X puts the avatar over the bottom-left, so keep the content right of centre there.
  const justify = kind === 'x' ? 'flex-end' : 'space-between';
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>*{margin:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#26246E;font-family:'IBM Plex Sans','IBM Plex Sans Arabic',sans-serif}
.b{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:${justify};gap:${H * 0.18}px;padding:0 ${H * 0.28}px;
background:radial-gradient(circle at 80% 20%,rgba(143,141,201,.45),transparent 50%),linear-gradient(90deg,#1C1A55,#26246E)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:${H / 5}px ${H / 5}px}
img{height:${lockH}px;position:relative}.t{position:relative;color:#F3F1EC;max-width:${kind === 'linkedin' ? 520 : 640}px}
.t p{font:500 ${kind === 'linkedin' ? 17 : 26}px/1.35 'IBM Plex Sans';color:#E3E2F2}.t .m{font:600 ${kind === 'linkedin' ? 13 : 18}px 'IBM Plex Mono';letter-spacing:.14em;text-transform:uppercase;color:#8F8DC9;margin-bottom:${kind === 'linkedin' ? 6 : 12}px}
.t .ar{font:500 ${kind === 'linkedin' ? 15 : 22}px 'IBM Plex Sans Arabic';color:#C9C8E6;margin-top:6px;direction:rtl}</style></head><body><div class="b"><div class="grid"></div>
<img src="${LOGO.bilDark}" alt=""><div class="t"><div class="m">The MENA robotics desk</div><p>${TAG_EN}</p>${kind !== 'linkedin' ? '<p class="ar">كل الروبوتات العاملة في الشرق الأوسط وشمال أفريقيا، موثّقة</p>' : ''}</div></div></body></html>`;
}
function highlightHtml(label, glyph) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>*{margin:0}html,body{width:1080px;height:1920px;background:#26246E;overflow:hidden}
.c{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:620px;height:620px;border-radius:50%;background:#F3F1EC;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
.g{font:600 190px/1 'IBM Plex Mono';color:#26246E}.l{font:600 54px 'IBM Plex Mono';letter-spacing:.12em;text-transform:uppercase;color:#26246E}</style></head>
<body><div class="c"><div class="g">${glyph}</div><div class="l">${label}</div></div></body></html>`;
}

async function renderBanners() {
  const out = path.join(ROOT, 'brand/social');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const k of ['x', 'linkedin', 'reddit']) {
    const [W, H] = { x: [1500, 500], linkedin: [1128, 191], reddit: [1920, 384] }[k];
    await page.setViewportSize({ width: W, height: H });
    await page.setContent(bannerHtml(k), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, `banner-${k}.png`) });
    console.log(`✓ brand/social/banner-${k}.png`);
  }
  await page.setViewportSize({ width: 1080, height: 1920 });
  for (const [label, glyph] of [['Brief', '05'], ['Data', '%'], ['Deploy', '◎'], ['Events', '▦'], ['About', 'RM']]) {
    await page.setContent(highlightHtml(label, glyph), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, `ig-highlight-${label.toLowerCase()}.png`) });
  }
  console.log('✓ brand/social/ig-highlight-*.png');
  await browser.close();
}

const [cmd, ...rest] = process.argv.slice(2);
(cmd === 'week' && rest[0] ? renderWeek(rest[0], rest.slice(1)) : cmd === 'banners' ? renderBanners()
  : Promise.reject(new Error('usage: social-cards.cjs week <YYYY-wNN> [postId…] | banners'))).catch(e => { console.error(e.message); process.exit(1); });

module.exports = { cardHtml };
