#!/usr/bin/env node
// Builds the branded PDF of a Spotlight research report from data/stories.json.
// Usage: node scripts/report-pdf.cjs [story-id] [--lang en|ar|all]
// Output: media/reports/<id>-<lang>.pdf (committed; the site's "Download PDF" button links to it).
// Needs Playwright with Chromium (preinstalled in Claude Code cloud sessions), pdf-lib (npm install)
// and network access to Google Fonts (Inter, Noto Sans Arabic, DM Mono).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const { PDFDocument } = require('pdf-lib');

const ROOT = path.join(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const stories = read('data/stories.json');
const companies = read('data/companies.json');
const args = process.argv.slice(2);
const id = args.find(a => !a.startsWith('--')) || stories[0].id;
const langArg = (args.find(a => a.startsWith('--lang=')) || '--lang=all').split('=')[1];
const st = stories.find(s => s.id === id);
if (!st) { console.error(`No story "${id}" in data/stories.json`); process.exit(1); }
if (!st.report) { console.error(`Story "${id}" has no "report" block`); process.exit(1); }
const R = st.report;

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fileUrl = p => 'file://' + path.join(ROOT, p.replace(/^\//, ''));
const MARK = (stroke, dot = '#D65336', inner = '#12212B') => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="${stroke}" stroke-width="9.6" stroke-linejoin="miter" stroke-linecap="square"><path d="M31 7H61L84 26V37"/><path d="M91 65V73L73 91H59"/><path d="M43 91H31L9 70V59"/><path d="M9 42V29L29 9"/></g><path d="M26 71L49 45L69 56" fill="none" stroke="${stroke}" stroke-width="11" stroke-linejoin="round" stroke-linecap="round"/><path d="M68 56L79 55L85 63M78 56L84 49L91 54" fill="none" stroke="${stroke}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="26" cy="71" r="9" fill="${stroke}"/><circle cx="26" cy="71" r="4.4" fill="${inner}"/><circle cx="49" cy="45" r="9" fill="${stroke}"/><circle cx="49" cy="45" r="4.4" fill="${inner}"/><circle cx="49" cy="69" r="4.1" fill="${dot}"/></svg>`;
const FRAME = (stroke) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${stroke}" stroke-width="9.6" stroke-linejoin="miter" stroke-linecap="square"><path d="M31 7H61L84 26V37"/><path d="M91 65V73L73 91H59"/><path d="M43 91H31L9 70V59"/><path d="M9 42V29L29 9"/></svg>`;

const UI = {
  en: { report: 'Research report', contents: 'Contents', findings: 'Key findings', glance: 'At a glance', chapter: 'Chapter', how: 'How to read this report', howText: 'Every figure is sourced. Headline claims are rated by the strength of the evidence behind them:', attacks: 'Attack and recovery log', timeline: 'ADNOC robotics timeline', fleet: 'Robot fleet', claims: 'Claim check', found: 'What we found', watch: 'Watchlist', asOf: 'as of', providers: 'Providers in this report', inDir: 'In the Robotics MENA directory', fleetIn: 'In the fleet', sources: 'Sources', source: 'Source', where: 'Where', maker: 'Maker', daysLeft: '{n} days left', photo: 'Images are credited to their owners and used for identification and commentary.', about: 'Robotics MENA is an independent, curated record of robotics, physical AI and automation across the Middle East and North Africa.', cta: 'Get the weekly MENA robotics brief and explore the full database at', copyright: '© 2026 Robotics MENA · Ad-free and independent', online: 'Read the interactive version', by: 'By', published: 'Published' },
  ar: { report: 'تقرير بحثي', contents: 'المحتويات', findings: 'أبرز النتائج', glance: 'لمحة سريعة', chapter: 'الفصل', how: 'كيف تقرأ هذا التقرير', howText: 'كل رقم موثّق بمصدر. وتُصنَّف الادعاءات البارزة بحسب قوة الأدلة التي تستند إليها:', attacks: 'سجلّ الهجمات والتعافي', timeline: 'الخط الزمني لروبوتات أدنوك', fleet: 'أسطول الروبوتات', claims: 'تدقيق الادعاءات', found: 'ما وجدناه', watch: 'قائمة المتابعة', asOf: 'حتى', providers: 'المزوّدون في هذا التقرير', inDir: 'في دليل روبوتكس مينا', fleetIn: 'في الأسطول', sources: 'المصادر', source: 'المصدر', where: 'الموقع', maker: 'الصانع', daysLeft: 'متبقٍ {n} يوماً', photo: 'الصور منسوبة لأصحابها وتُستخدم للتعريف والتعليق.', about: 'روبوتكس مينا سجلّ مستقل ومنسّق للروبوتات والذكاء الاصطناعي المادي والأتمتة في الشرق الأوسط وشمال أفريقيا.', cta: 'اشترك في الموجز الأسبوعي لروبوتات المنطقة واستكشف قاعدة البيانات الكاملة على', copyright: '© 2026 روبوتكس مينا · مستقلة وبلا إعلانات', online: 'اقرأ النسخة التفاعلية', by: 'بقلم', published: 'نُشر في' }
};

function build(lang) {
  const ar = lang === 'ar', U = UI[lang];
  const tx = o => o == null ? '' : typeof o === 'string' ? o : (ar ? (o.ar || o.en || '') : (o.en || ''));
  const loc = ar ? 'ar-AE-u-nu-latn' : 'en-GB';
  const df = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const dfm = new Intl.DateTimeFormat(loc, { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const fdate = d => !d ? '' : d.length === 4 ? d : d.length === 7 ? dfm.format(new Date(d + '-15T12:00:00Z')) : df.format(new Date(d + 'T12:00:00Z'));
  const nf = new Intl.NumberFormat(loc);
  const src = n => st.sources[n - 1];
  const srcLink = n => { const x = src(n); return x ? `<a class="src" href="${esc(x.url)}">${esc(U.source)}: ${esc(x.name)}</a>` : ''; };
  const today = new Date().toISOString().slice(0, 10);
  // Countdowns in weeks, matching the site's weekly update cycle.
  const weeksTxt = d => { const w = Math.round(d / 7); if (d <= 7 || w < 1) return ar ? 'هذا الأسبوع' : 'This week'; if (ar) return w === 1 ? 'خلال أسبوع' : w === 2 ? 'خلال أسبوعين' : w <= 10 ? 'خلال ' + nf.format(w) + ' أسابيع' : 'خلال ' + nf.format(w) + ' أسبوعاً'; return 'In ' + nf.format(w) + ' week' + (w === 1 ? '' : 's'); };
  const inSvc = { live: 1, deploying: 1, delivered: 1 };
  const stCol = k => inSvc[k] ? '#166773' : k === 'trial' ? '#52616A' : '#B54127';
  const lvlCol = l => l <= 1 ? '#D65336' : l === 2 ? '#B54127' : '#166773';
  const meter = l => `<span class="meter">${[1, 2, 3, 4].map(k => `<i style="background:${k <= l ? lvlCol(l) : '#D7DCD8'}"></i>`).join('')}</span>`;
  const onlineUrl = `https://roboticsmena.com/spotlight?s=${st.id}`;

  const fig = (src0, cap, credit, alt, narrow) => `<figure class="fig${narrow ? ' narrow' : ''}"><img src="${fileUrl(src0)}" alt="${esc(alt)}"><figcaption><span>${esc(cap)}</span><span>${esc(credit)}</span></figcaption></figure>`;

  const W = {
    compare: () => `<div class="grid2 avoid">${R.compare.map(c => `<div class="box${c.physical ? ' hot' : ''}"><div class="mono small subtle">${esc(tx(c.tag))}</div><div class="h4">${esc(tx(c.title))}</div><div class="muted">${esc(tx(c.sub))}</div><ul class="ticks">${c.items.map(i => `<li>${esc(tx(i))}</li>`).join('')}</ul></div>`).join('')}</div>`,
    attacks: () => { const a = R.attacks; return `<div class="box avoid"><div class="label">${esc(U.attacks)}</div><ol class="log">${a.items.map(i => `<li><span class="mono">${esc(fdate(i.date))}</span><i style="background:${i.recovery ? '#166773' : '#D65336'}"></i><span>${esc(tx(i))} ${srcLink(i.src)}</span></li>`).join('')}</ol><div class="gauge-lbl"><span>${esc(tx(a.gaugeLbl))}</span><span class="mono">${a.now}% → ${a.target}%</span></div><div class="gauge"><b style="width:${a.now}%"></b><u style="inset-inline-start:${a.target}%"></u></div><div class="legend"><span><i style="background:#166773"></i>${esc(tx(a.nowLbl))} ${a.now}%</span><span><i class="dash"></i>${esc(tx(a.targetLbl))} ${a.target}%</span></div></div>`; },
    timeline: () => `<div class="box"><div class="label">${esc(U.timeline)}</div><ol class="tl">${R.timeline.map(m => `<li class="avoid${m.future ? ' future' : ''}"><span class="mono date">${esc(fdate(m.date))}</span><i></i><div><strong>${esc(tx(m.title))}</strong><p>${esc(tx(m))}</p>${srcLink(m.src)}</div></li>`).join('')}</ol></div>`,
    fleet: () => `<div class="label">${esc(U.fleet)}</div><div class="grid2">${R.fleet.map(f => `<div class="box avoid"><div class="status" style="color:${stCol(f.status)}"><i style="background:${stCol(f.status)}"></i>${esc(tx(R.status[f.status]))}</div><div class="h4">${esc(tx(f.name))}</div><div class="muted small">${esc(tx(f.kind))} · ${esc(f.maker)}</div><div class="subtle small">${esc(U.where)}: ${esc(tx(f.where))}</div><p class="small">${esc(tx(f))}</p><div class="fact">${esc(tx(f.fact))}</div>${srcLink(f.src)}</div>`).join('')}</div>`,
    claims: () => `<div class="label">${esc(U.claims)}</div><table class="claims"><tbody>${R.claims.map(c => `<tr class="avoid"><td><strong>${esc(tx(c.claim))}</strong><div class="subtle small">${esc(tx(c.who))}</div><div class="lvl">${meter(c.level)}<span class="mono small">${esc(tx(c.tag))}</span></div></td><td><div class="label o">${esc(U.found)}</div><p class="small">${esc(tx(c))}</p>${srcLink(c.src)}</td></tr>`).join('')}</tbody></table>`,
    watch: () => `<div class="label">${esc(U.watch)} <span class="mono subtle">(${esc(U.asOf)} ${esc(fdate(today))})</span></div><table class="watch"><tbody>${R.watch.map(w => { const d = w.due ? Math.ceil((Date.parse(w.due + 'T23:59:59Z') - Date.parse(today + 'T00:00:00Z')) / 864e5) : null; const c = w.status === 'due' ? '#B54127' : w.status === 'trial' ? '#166773' : '#5D6A71'; return `<tr class="avoid"><td class="status" style="color:${c}"><i style="background:${c}"></i>${esc(tx(R.watchStatus[w.status]))}</td><td>${esc(tx(w))}</td><td class="small subtle">${esc(tx(w.when))}${d != null && d >= 0 ? `<div class="mono o">${esc(weeksTxt(d))}</div>` : ''}</td></tr>`; }).join('')}</tbody></table>`,
    providers: () => `<div class="grid2">${R.providers.map(pv => { const c = companies.find(x => x.id === pv.id); const fl = (pv.fleet || []).map(fid => R.fleet.find(f => f.id === fid)).filter(Boolean); const name = c ? (ar ? (c.name_ar || c.name) : c.name) : pv.id; const logo = c && c.logo ? `<img class="logo" src="${fileUrl(c.logo)}" alt="">` : `<span class="logo mono">${esc(name.slice(0, 2).toUpperCase())}</span>`; const url = `https://roboticsmena.com/database?tab=companies&id=${pv.id}`; return `<div class="box avoid"><div class="prov">${logo}<div><div class="h4">${esc(name)}</div><div class="subtle small">${c && c.website ? esc(c.website.replace(/^https?:\/\/(www\.)?|\/$/g, '')) : ''}</div></div></div><p>${esc(tx(pv))}</p><p class="small muted">${c ? esc(ar ? (c.summary_ar || c.summary) : c.summary) : ''}</p>${fl.length ? `<div class="small"><span class="subtle">${esc(U.fleetIn)}:</span> ${fl.map(f => `<span class="chip"><i style="background:${stCol(f.status)}"></i>${esc(tx(f.name))}</span>`).join(' ')}</div>` : ''}<a class="src" href="${esc(url)}">${esc(U.inDir)} ↗</a></div>`; }).join('')}</div>`
  };

  const block = b => {
    if (b.t === 'p') return b.lead ? `<p class="lead">${esc(tx(b))}</p>` : `<p>${esc(tx(b))}</p>`;
    if (b.t === 'h') return `<h3>${esc(tx(b))}</h3>`;
    if (b.t === 'quote') return `<blockquote class="avoid"><p>${esc(tx(b))}</p><cite>${esc(tx(b.who))}</cite></blockquote>`;
    if (b.t === 'img') return fig(b.src, tx(b.cap), tx(b.credit), tx(b.alt), !!b.maxw);
    if (b.t === 'stats') return `<div class="stats avoid">${b.items.map(i => `<div><b>${esc(i.v)}</b><span>${esc(tx(i))}</span></div>`).join('')}</div>`;
    if (b.t === 'list') return `<ul class="ticks">${b.items.map(i => `<li>${esc(tx(i))}</li>`).join('')}</ul>`;
    if (b.t === 'w') return W[b.w] ? W[b.w]() : '';
    return '';
  };

  const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=block">`;
  const base = `
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;padding:0}
body{font-family:${ar ? "'Noto Sans Arabic','Inter'" : "'Inter','Noto Sans Arabic'"},sans-serif;color:#12212B;font-size:10.2pt;line-height:${ar ? 1.75 : 1.6};font-variant-numeric:tabular-nums}
.mono{font-family:'DM Mono',${ar ? "'Noto Sans Arabic'," : ''}monospace}
a{color:inherit}
`;
  const glance = R.glance.map(g => `<div><b>${esc(tx(g.pre))}${nf.format(g.n)}${esc(tx(g.suf))}</b><span>${esc(tx(g))}</span></div>`).join('');

  const coverHtml = `<!doctype html><html lang="${lang}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">${fonts}<style>${base}
@page{size:A4;margin:0}
.pg{width:210mm;height:297mm;position:relative;overflow:hidden;background:#12212B;color:#F7F5EF;break-after:page;padding:16mm 16mm 14mm;display:flex;flex-direction:column}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(146,212,203,.20) .5mm,transparent .6mm);background-size:5.5mm 5.5mm;-webkit-mask-image:linear-gradient(${ar ? 'to left' : 'to right'},#000,transparent 70%);z-index:0}
.frame{position:absolute;width:150mm;height:150mm;bottom:-60mm;${ar ? 'right' : 'left'}:-45mm;opacity:1;z-index:0}
.pg>*{position:relative;z-index:1}
.pg>.dots,.pg>.frame,.back .fine{position:absolute}.pg>.dots,.pg>.frame{z-index:0}.frame svg{width:100%;height:100%;display:block}
.top{display:flex;justify-content:space-between;align-items:center}
.brand{display:flex;align-items:center;gap:4mm}.brand svg{width:13mm;height:13mm}.brand .rule{width:.5mm;height:12mm;background:#D65336}.brand .names{display:flex;flex-direction:column;line-height:1.15}.brand .en{font:700 15pt 'Inter',sans-serif;letter-spacing:-.02em}.brand .arn{font:700 12.5pt 'Noto Sans Arabic',sans-serif}
.chip{display:inline-flex;align-items:center;gap:2mm;height:7mm;padding:0 3.2mm;background:#C24A2F;color:#fff;font:500 8pt/1 'DM Mono',${ar ? "'Noto Sans Arabic'," : ''}monospace;letter-spacing:${ar ? 0 : '.12em'};text-transform:${ar ? 'none' : 'uppercase'}}.chip i{width:1.6mm;height:1.6mm;background:#fff;transform:rotate(45deg)}
.kicker{margin-top:14mm;font:500 8.5pt 'DM Mono',${ar ? "'Noto Sans Arabic'," : ''}monospace;letter-spacing:${ar ? 0 : '.12em'};text-transform:${ar ? 'none' : 'uppercase'};color:#92D4CB}
h1{margin:4mm 0 0;font-size:${ar ? 29 : 33}pt;line-height:${ar ? 1.3 : 1.07};letter-spacing:${ar ? 0 : '-.03em'};font-weight:600;max-width:170mm}
.dek{margin:5mm 0 0;font-size:12pt;line-height:1.55;color:#B8C7CB;max-width:160mm}
.meta{margin-top:5mm;display:flex;gap:6mm;font:400 8.5pt 'DM Mono',${ar ? "'Noto Sans Arabic'," : ''}monospace;color:#93A6AC}
.hero{margin-top:8mm;height:96mm;overflow:hidden;background:#1B303B}.hero img{width:100%;height:100%;object-fit:cover;display:block}
.cap{margin-top:2mm;display:flex;justify-content:space-between;gap:4mm;font:400 7pt 'DM Mono',${ar ? "'Noto Sans Arabic'," : ''}monospace;color:#93A6AC}
.glance{margin-top:auto;display:grid;grid-template-columns:repeat(4,1fr);border-top:.3mm solid rgba(146,212,203,.25)}
.glance div{padding:5mm 4mm 0 0;padding-inline:0 4mm;display:flex;flex-direction:column;gap:1.5mm}
.glance b{font:500 21pt/1.1 'DM Mono',${ar ? "'Noto Sans Arabic'," : ''}monospace;color:#F28B70;letter-spacing:-.02em}
.glance span{font-size:7.8pt;line-height:1.4;color:#B8C7CB}
.foot{margin-top:7mm;display:flex;justify-content:space-between;font:400 7.5pt 'DM Mono',monospace;color:#93A6AC}
.back{justify-content:center;align-items:center;text-align:center;gap:7mm}
.back svg.big{width:34mm;height:34mm}
.back .about{max-width:130mm;font-size:12pt;line-height:1.6;color:#F7F5EF}
.back .cta{max-width:120mm;font-size:10pt;color:#B8C7CB}
.back .url{display:inline-block;margin-top:2mm;padding:3mm 6mm;background:#D65336;color:#fff;font:600 11pt 'Inter',sans-serif;text-decoration:none}
.back .fine{position:absolute;bottom:14mm;left:16mm;right:16mm;display:flex;flex-direction:column;gap:1.5mm;font-size:7.5pt;color:#93A6AC}
</style></head><body>
<section class="pg"><div class="dots"></div><div class="frame">${FRAME('rgba(146,212,203,.08)')}</div>
  <div class="top"><div class="brand">${MARK('#F7F5EF')}<span class="rule"></span><span class="names"><span class="en">Robotics MENA</span><span class="arn">روبوتكس مينا</span></span></div><span class="chip"><i></i>${esc(U.report)}</span></div>
  <div class="kicker">${esc(tx(st.kicker))}</div>
  <h1>${esc(tx(st.title))}</h1>
  <p class="dek">${esc(tx(st.dek))}</p>
  <div class="meta"><span>${esc(tx(st.by))}</span><span>${esc(fdate(st.date))}</span></div>
  <div class="hero"><img src="${fileUrl(st.hero.src)}" alt=""></div>
  <div class="cap"><span>${esc(tx(st.hero.cap))}</span><span>${esc(tx(st.hero.credit))}</span></div>
  <div class="glance">${glance}</div>
  <div class="foot"><span>roboticsmena.com · contact@roboticsmena.com</span><span>${esc(U.online)}: roboticsmena.com/spotlight?s=${esc(st.id)}</span></div>
</section>
<section class="pg back"><div class="dots"></div><div class="frame">${FRAME('rgba(146,212,203,.08)')}</div>
  <svg class="big" viewBox="0 0 100 100">${MARK('#F7F5EF').replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>
  <div class="brand" style="justify-content:center"><span class="names" style="align-items:center"><span class="en" style="font-size:20pt">Robotics MENA</span><span class="arn" style="font-size:16pt">روبوتكس مينا</span></span></div>
  <p class="about">${esc(U.about)}</p>
  <p class="cta">${esc(U.cta)}</p>
  <a class="url" href="https://roboticsmena.com">roboticsmena.com</a>
  <a class="url" href="mailto:contact@roboticsmena.com" style="font-size:11pt;margin-top:4pt">contact@roboticsmena.com</a>
  <div class="fine"><span>${esc(U.photo)}</span><span>${esc(U.copyright)}</span></div>
</section>
</body></html>`;

  const chapters = R.chapters.map(c => `<section class="chapter"><header class="ch"><div class="num"><span class="n">${esc(c.n)}</span><span class="label">${esc(U.chapter)} ${esc(c.n)}</span></div><h2>${esc(tx(c.title))}</h2><span class="rule"></span></header>${c.blocks.map(block).join('\n')}</section>`).join('\n');
  const levels = R.levels.map((l, i) => `<li>${meter(i + 1)}<span>${esc(tx(l))}</span></li>`).join('');
  const bodyHtml = `<!doctype html><html lang="${lang}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">${fonts}<style>${base}
.dummy{height:10mm;break-after:page}
h2{margin:2mm 0 0;font-size:${ar ? 21 : 23}pt;line-height:1.2;letter-spacing:${ar ? 0 : '-.025em'};font-weight:600}
h3{margin:4mm 0 0;font-size:13pt}
p{margin:0 0 3.2mm;orphans:3;widows:3}
.label{font:500 7.8pt/1.4 'DM Mono',${ar ? "'Noto Sans Arabic'," : ''}monospace;letter-spacing:${ar ? 0 : '.12em'};text-transform:${ar ? 'none' : 'uppercase'};color:#5D6A71;margin-bottom:2.5mm}
.label.o,.o{color:#B54127}
.small{font-size:8.6pt;line-height:1.5}.muted{color:#52616A}.subtle{color:#5D6A71}
.h4{font-size:12pt;font-weight:600;line-height:1.3;margin:1mm 0}
.avoid,figure,blockquote,.box,tr{break-inside:avoid}
.chapter{break-before:page}
.ch{margin-bottom:6mm}.ch .num{display:flex;align-items:baseline;gap:3mm}.ch .n{font:600 34pt/1 'DM Mono',monospace;color:transparent;-webkit-text-stroke:.35mm #B54127;letter-spacing:-.04em}
.ch .rule{display:block;margin-top:3mm;height:.6mm;background:linear-gradient(${ar ? 'to left' : 'to right'},#D65336,#D7DCD8 35%)}
.lead{font-size:13.5pt;line-height:1.55;font-weight:500;padding-inline-start:5mm;border-inline-start:.9mm solid #D65336;margin:2mm 0 5mm}
blockquote{margin:3mm 0 5mm;padding:5mm 6mm;background:#F7F5EF;border-inline-start:.9mm solid #D65336}blockquote p{font-size:13pt;line-height:1.45;font-weight:500;margin:0 0 2mm}cite{font-style:normal;font-size:8.5pt;color:#5D6A71}
.fig{margin:3mm 0 5mm}.fig img{width:100%;max-height:100mm;object-fit:cover;display:block;border:.2mm solid #D7DCD8}.fig.narrow img{width:60mm;max-height:none}
figcaption{margin-top:1.8mm;display:flex;justify-content:space-between;gap:4mm;font:400 7.2pt/1.45 'DM Mono',${ar ? "'Noto Sans Arabic'," : ''}monospace;color:#5D6A71}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin:2mm 0 5mm}.stats div{padding:4mm;background:#F7F5EF;border-top:.8mm solid #D65336;display:flex;flex-direction:column;gap:1.5mm}.stats b{font:500 17pt/1.1 'DM Mono',${ar ? "'Noto Sans Arabic'," : ''}monospace;color:#B54127}.stats span{font-size:8pt;line-height:1.4;color:#52616A}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:3.5mm;margin:2mm 0 5mm}
.box{padding:4.5mm;border:.25mm solid #BEC7C3;background:#fff;margin:2mm 0 5mm}.grid2 .box{margin:0}.box.hot{border-color:#D65336;background:rgba(214,83,54,.06)}
.ticks{list-style:none;margin:2mm 0 0;padding:0;display:flex;flex-direction:column;gap:1.8mm}.ticks li{position:relative;padding-inline-start:5mm}.ticks li:before{content:"";position:absolute;inset-inline-start:0;top:2.2mm;width:1.7mm;height:1.7mm;background:#D65336;transform:rotate(45deg)}
.log{list-style:none;margin:0;padding:0}.log li{display:grid;grid-template-columns:24mm 4mm 1fr;gap:3mm;padding-bottom:2.5mm;font-size:9.3pt}.log i{width:2.6mm;height:2.6mm;border-radius:50%;margin-top:1.5mm}.log .mono{font-size:8pt;color:#52616A}
.gauge-lbl{display:flex;justify-content:space-between;font-size:8.5pt;color:#52616A;margin:2mm 0 1.5mm}.gauge{position:relative;height:3.2mm;background:#D7DCD8}.gauge b{position:absolute;top:0;bottom:0;inset-inline-start:0;background:#166773}.gauge u{position:absolute;top:-1.2mm;bottom:-1.2mm;border-inline-start:.5mm dashed #D65336}
.legend{display:flex;gap:6mm;margin-top:2mm;font-size:7.8pt;color:#5D6A71}.legend span{display:inline-flex;align-items:center;gap:1.5mm}.legend i{width:2.4mm;height:2.4mm}.legend i.dash{height:0;border-top:.5mm dashed #D65336}
.tl{list-style:none;margin:0;padding:0}.tl li{display:grid;grid-template-columns:24mm 4mm 1fr;gap:3mm;padding-bottom:3mm}.tl .date{font-size:8pt;color:#B54127;padding-top:.5mm}.tl i{width:2.8mm;height:2.8mm;border-radius:50%;background:#12212B;margin-top:1.2mm}.tl li.future i{background:#fff;border:.4mm dashed #5D6A71}.tl strong{font-size:10pt}.tl p{margin:.8mm 0 1mm;font-size:8.8pt;line-height:1.5;color:#52616A}
.status{display:inline-flex;align-items:center;gap:1.6mm;font:500 7.8pt 'DM Mono',${ar ? "'Noto Sans Arabic'," : ''}monospace}.status i{width:2mm;height:2mm;border-radius:50%}
.fact{margin:2mm 0;padding:2mm 2.5mm;background:rgba(214,83,54,.08);font-size:8.4pt}
.src{display:inline-block;font-size:7.6pt;color:#52616A;text-decoration:none;border-bottom:.2mm solid #BEC7C3}
.meter{display:inline-grid;grid-template-columns:repeat(4,4.5mm);gap:.6mm;vertical-align:middle}.meter i{height:1.4mm}
.lvl{display:flex;align-items:center;gap:2.5mm;margin-top:2mm}
table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:3mm 0;border-bottom:.25mm solid #D7DCD8}
.claims td:first-child{width:44%;padding-inline-end:5mm}.claims strong{font-size:10pt}
.watch{border-top:.4mm solid #12212B}.watch td:first-child{width:28mm}.watch td:last-child{width:36mm;padding-inline-start:4mm}
.prov{display:flex;align-items:center;gap:3mm;margin-bottom:2mm}.logo{width:13mm;height:13mm;border:.25mm solid #BEC7C3;object-fit:contain;display:grid;place-items:center;font-size:9pt}
.chip{display:inline-flex;align-items:center;gap:1.4mm;padding:.6mm 2.4mm;border:.25mm solid #D7DCD8;border-radius:3mm;font-size:7.8pt;margin:.6mm 0}.chip i{width:1.8mm;height:1.8mm;border-radius:50%}
.intro{display:grid;grid-template-columns:1fr;gap:6mm}
.toc{list-style:none;margin:0;padding:0;border-top:.4mm solid #12212B}.toc li{display:grid;grid-template-columns:12mm 1fr;padding:2.4mm 0;border-bottom:.25mm solid #D7DCD8;font-size:10.5pt}.toc .mono{color:#B54127}
.finds{display:grid;grid-template-columns:1fr 1fr;gap:3.5mm}.finds div{padding:4.5mm;background:#F7F5EF;border-top:.8mm solid #D65336;break-inside:avoid}.finds b{display:block;font:500 9pt 'DM Mono',monospace;color:#B54127;margin-bottom:1.5mm}.finds strong{display:block;font-size:11pt;line-height:1.3;margin-bottom:1.5mm}.finds span{font-size:8.8pt;line-height:1.5;color:#52616A}
.how{padding:4.5mm;border:.25mm solid #BEC7C3}.how ul{list-style:none;margin:2mm 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:2mm 6mm;font-size:8.5pt}.how li{display:flex;align-items:center;gap:2.5mm}
.sources{break-before:page}.sources ol{margin:0;padding:0;list-style:none;columns:2;column-gap:7mm}.sources li{break-inside:avoid;display:grid;grid-template-columns:7mm 1fr;font-size:8pt;line-height:1.45;margin-bottom:2.4mm}.sources a{text-decoration:none;border-bottom:.2mm solid #BEC7C3}.sources .u{display:block;color:#5D6A71;font-size:6.8pt;word-break:break-all}
</style></head><body>
<div class="dummy"></div>
<section class="intro">
  <div><div class="label">${esc(U.contents)}</div><ol class="toc">${R.chapters.map(c => `<li><span class="mono">${esc(c.n)}</span><span>${esc(tx(c.title))}</span></li>`).join('')}<li><span class="mono">—</span><span>${esc(U.sources)}</span></li></ol></div>
  <div><div class="label">${esc(U.findings)}</div><div class="finds">${R.findings.map((f, i) => `<div><b>${String(i + 1).padStart(2, '0')}</b><strong>${esc(tx(f.title))}</strong><span>${esc(tx(f))}</span></div>`).join('')}</div></div>
  <div class="how"><div class="label">${esc(U.how)}</div><div class="small muted">${esc(U.howText)}</div><ul>${levels}</ul></div>
</section>
${chapters}
<section class="sources"><header class="ch"><h2>${esc(U.sources)}</h2><span class="rule"></span></header><ol>${st.sources.map((x, i) => `<li><span class="mono subtle">${i + 1}</span><span><a href="${esc(x.url)}">${esc(x.title)}</a> · ${esc(x.name)} · ${esc(fdate(x.date))}<span class="u">${esc(x.url)}</span></span></li>`).join('')}</ol></section>
</body></html>`;

  const shortTitle = tx(st.title).length > 70 ? tx(st.title).slice(0, 68) + '…' : tx(st.title);
  const header = `<div style="width:100%;margin:0 16mm;padding-bottom:2mm;border-bottom:0.6px solid #D7DCD8;display:flex;justify-content:space-between;align-items:center;font-family:Inter,Arial,sans-serif;font-size:7px;color:#5D6A71;-webkit-print-color-adjust:exact"><span style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:11px;height:11px">${MARK('#12212B', '#D65336', '#FFFFFF')}</span><b style="color:#12212B;font-weight:700">Robotics MENA</b><span style="color:#D65336">|</span><span>Research report</span></span><span>${ar ? '' : esc(shortTitle)}</span></div>`;
  const footer = `<div style="width:100%;margin:0 16mm;display:flex;justify-content:space-between;align-items:center;font-family:Inter,Arial,sans-serif;font-size:7px;color:#5D6A71;-webkit-print-color-adjust:exact"><span>roboticsmena.com · contact@roboticsmena.com</span><span style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:14px;height:2px;background:#D65336"></span><span class="pageNumber" style="color:#12212B;font-weight:600"></span></span></div>`;
  return { coverHtml, bodyHtml, header, footer, title: tx(st.title), subject: tx(st.dek) };
}

(async () => {
  const outDir = path.join(ROOT, 'media', 'reports');
  fs.mkdirSync(outDir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rm-report-'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const render = async (html, name, opts) => {
    const f = path.join(tmp, name + '.html'); fs.writeFileSync(f, html);
    await page.goto('file://' + f, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every(i => i.complete));
    const missing = await page.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src));
    if (missing.length) throw new Error('Images failed to load: ' + missing.join(', '));
    return page.pdf(Object.assign({ format: 'A4', printBackground: true, preferCSSPageSize: false }, opts));
  };
  for (const lang of langArg === 'all' ? ['en', 'ar'] : [langArg]) {
    const b = build(lang);
    const cover = await render(b.coverHtml, `cover-${lang}`, { margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    const body = await render(b.bodyHtml, `body-${lang}`, { displayHeaderFooter: true, headerTemplate: b.header, footerTemplate: b.footer, margin: { top: '22mm', bottom: '18mm', left: '16mm', right: '16mm' } });
    const out = await PDFDocument.create();
    const cv = await PDFDocument.load(cover), bd = await PDFDocument.load(body);
    const [front] = await out.copyPages(cv, [0]); out.addPage(front);
    const bodyIdx = bd.getPageIndices().slice(1); // first body page is a spacer so numbering starts at 2
    for (const p of await out.copyPages(bd, bodyIdx)) out.addPage(p);
    const [back] = await out.copyPages(cv, [1]); out.addPage(back);
    out.setTitle(b.title); out.setSubject(b.subject); out.setAuthor('Robotics MENA'); out.setCreator('Robotics MENA'); out.setProducer('Robotics MENA'); out.setLanguage(lang === 'ar' ? 'ar-AE' : 'en-GB');
    out.setKeywords(['Robotics MENA', 'research report', st.id]);
    const file = path.join(outDir, `${st.id}-${lang}.pdf`);
    fs.writeFileSync(file, await out.save());
    console.log(`Wrote ${path.relative(ROOT, file)} (${out.getPageCount()} pages, ${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
  }
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
