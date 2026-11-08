// Checks data/*.json before every build and in scanner pull requests. Exits non-zero on any problem,
// so a bad entry can never reach the live site.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SECTORS, ROBOT_TYPES, COMPANY_CATEGORIES, STAGES, EVENT_TYPES, MENA, EXCLUDED_COUNTRIES, ISO_DATE, readData } from './lib/taxonomy.mjs';

const errors = [];
const D = Object.fromEntries(['companies', 'deployments', 'events', 'countries', 'brief'].map(n => [n, readData(n)]));
const countryCodes = new Set(D.countries.map(c => c.code));
const need = (rec, where, keys) => keys.forEach(k => { if (rec[k] === undefined || rec[k] === null || rec[k] === '') errors.push(`${where}: missing "${k}"`); });
const oneOf = (v, dictObj, where, field) => { if (!(v in dictObj)) errors.push(`${where}: ${field} "${v}" is not one of ${Object.keys(dictObj).join(', ')}`); };
const date = (v, where, field, optional) => { if ((v || !optional) && !ISO_DATE.test(v || '')) errors.push(`${where}: ${field} "${v}" is not a YYYY-MM-DD date`); };
const url = (v, where, field) => { if (v && !/^https?:\/\/[^\s]+$/.test(v)) errors.push(`${where}: ${field} is not a valid URL`); };
const logo = (v, where) => { if (!v) return; if (!/^\/media\/logos\/[a-z0-9._-]+\.(png|svg|jpg|jpeg|webp)$/.test(v)) errors.push(`${where}: logo "${v}" must look like /media/logos/name.png|svg|jpg|webp`); else if (!fs.existsSync(path.join(ROOT, v))) errors.push(`${where}: logo file ${v} does not exist`); };
const uniq = (rows, key, file) => { const seen = new Set(); rows.forEach(r => { if (seen.has(r[key])) errors.push(`${file}: duplicate ${key} "${r[key]}"`); seen.add(r[key]); }); };

D.countries.forEach((c, i) => { const w = `countries[${i}] ${c.code}`; need(c, w, ['code', 'name']); if (!(c.code in MENA)) errors.push(`${w}: not a MENA country code`); });
uniq(D.countries, 'code', 'countries');

D.companies.forEach((c, i) => {
  const w = `companies[${i}] ${c.id}`;
  need(c, w, ['id', 'name', 'country', 'category', 'stage', 'summary', 'added']);
  oneOf(c.category, COMPANY_CATEGORIES, w, 'category'); oneOf(c.stage, STAGES, w, 'stage');
  if (!countryCodes.has(c.country)) errors.push(`${w}: country "${c.country}" is not in countries.json`);
  date(c.added, w, 'added'); url(c.website, w, 'website'); logo(c.logo, w); url(c.source_url, w, 'source_url');
  if ([c.country, c.hq, ...(c.mena_countries || [])].some(x => EXCLUDED_COUNTRIES.has(x))) errors.push(`${w}: companies based in or listed under an excluded country are not allowed`);
  if (c.image) { if (!/^\/media\/companies\/[a-z0-9._-]+\.(jpg|jpeg|png|webp)$/.test(c.image)) errors.push(`${w}: image must be a file in /media/companies/`); else if (!fs.existsSync(path.join(ROOT, c.image))) errors.push(`${w}: image file ${c.image} does not exist`); if (!c.image_credit) errors.push(`${w}: image needs image_credit`); }
  if (c.hq !== undefined && !/^[A-Z]{2}$/.test(c.hq)) errors.push(`${w}: hq "${c.hq}" must be a 2-letter ISO country code`);
  if (c.mena_countries !== undefined) { if (!Array.isArray(c.mena_countries) || !c.mena_countries.length) errors.push(`${w}: mena_countries must be a non-empty list`); else c.mena_countries.forEach(cc => { if (!(cc in MENA)) errors.push(`${w}: mena_countries "${cc}" is not a MENA country`); }); if (Array.isArray(c.mena_countries) && !c.mena_countries.includes(c.country)) errors.push(`${w}: mena_countries must include its listed country "${c.country}"`); }
  if (c.hq && !(c.hq in MENA)) {
    // International supplier: must say why it is in a MENA directory
    if (!c.mena_link || !c.mena_link.en || !c.mena_link.ar) errors.push(`${w}: international company (HQ ${c.hq}) needs mena_link.en and mena_link.ar`);
    if (!c.mena_source_url) errors.push(`${w}: international company needs mena_source_url`); else url(c.mena_source_url, w, 'mena_source_url');
    date(c.mena_date, w, 'mena_date', true);
    if (!fs.existsSync(path.join(ROOT, 'media', 'flags', c.hq.toLowerCase() + '.svg'))) errors.push(`${w}: missing flag file media/flags/${c.hq.toLowerCase()}.svg`);
  }
});
uniq(D.companies, 'id', 'companies');

D.deployments.forEach((d, i) => {
  const w = `deployments[${i}] ${d.id}`;
  need(d, w, ['id', 'title', 'operator', 'type', 'sector', 'country', 'site', 'lat', 'lon', 'date', 'source']);
  oneOf(d.type, ROBOT_TYPES, w, 'type'); oneOf(d.sector, SECTORS, w, 'sector');
  if (!countryCodes.has(d.country)) errors.push(`${w}: country "${d.country}" is not in countries.json`);
  if (!(typeof d.lat === 'number' && d.lat > 5 && d.lat < 45 && typeof d.lon === 'number' && d.lon > -20 && d.lon < 65)) errors.push(`${w}: lat/lon ${d.lat},${d.lon} is outside the MENA map area`);
  date(d.date, w, 'date'); date(d.added, w, 'added', true); logo(d.logo, w);
  if (d.kind && !['rollout', 'deployment', 'entrant'].includes(d.kind)) errors.push(`${w}: kind "${d.kind}" must be rollout, deployment or entrant`); url(d.source_url, w, 'source_url');
});
uniq(D.deployments, 'id', 'deployments');

D.events.forEach((e, i) => {
  const w = `events[${i}] ${e.id}`;
  need(e, w, ['id', 'name', 'type', 'city', 'start']);
  oneOf(e.type, EVENT_TYPES, w, 'type'); date(e.start, w, 'start'); date(e.end, w, 'end', true);
  if (e.country && !countryCodes.has(e.country)) errors.push(`${w}: country "${e.country}" is not in countries.json`);
  if (e.end && e.end < e.start) errors.push(`${w}: ends before it starts`);
  url(e.url, w, 'url'); logo(e.logo, w);
  if (e.relevance && e.relevance.length > 220) errors.push(`${w}: relevance line is too long (keep it to one sentence)`);
});
uniq(D.events, 'id', 'events');

D.brief.forEach((b, i) => {
  const w = `brief[${i}] ${b.id}`;
  need(b, w, ['id', 'country', 'date', 'title', 'takeaway', 'source']);
  if (!countryCodes.has(b.country)) errors.push(`${w}: country "${b.country}" is not in countries.json`);
  date(b.date, w, 'date'); url(b.source_url, w, 'source_url');
  if (b.image) { if (!/^\/media\/brief\/[a-z0-9._-]+\.(jpg|jpeg|png|webp)$/.test(b.image)) errors.push(`${w}: image must look like /media/brief/name.jpg`); else if (!fs.existsSync(path.join(ROOT, b.image))) errors.push(`${w}: image file ${b.image} does not exist`); if (!b.image_credit) errors.push(`${w}: image needs an image_credit`); }
});
uniq(D.brief, 'id', 'brief');

// Spotlight research reports (data/stories.json): see .claude/skills/research-report/SKILL.md
const stories = fs.existsSync(path.join(ROOT, 'data', 'stories.json')) ? readData('stories') : [];
const coIds = new Set(D.companies.map(c => c.id));
const bi = o => o && typeof o === 'object' && o.en ? true : false;
const media = (v, w, dir) => { if (!v) return; if (!new RegExp(`^/media/${dir}/[a-z0-9._-]+\\.(jpg|jpeg|png|webp|pdf)$`).test(v)) errors.push(`${w}: "${v}" must be a file in /media/${dir}/`); else if (!fs.existsSync(path.join(ROOT, v))) errors.push(`${w}: file ${v} does not exist`); };
stories.forEach((s, si) => {
  const w = `stories[${si}] ${s.id}`;
  need(s, w, ['id', 'date', 'title', 'dek', 'kicker', 'by', 'hero', 'sources', 'report']);
  date(s.date, w, 'date');
  ['title', 'dek', 'kicker', 'by'].forEach(k => { if (s[k] && !bi(s[k])) errors.push(`${w}: ${k} needs {en, ar}`); else if (s[k] && !s[k].ar) errors.push(`${w}: ${k} is missing Arabic`); });
  if (s.hero) { media(s.hero.src, `${w} hero`, 'spotlight'); if (!s.hero.credit) errors.push(`${w}: hero needs a credit`); }
  if (s.pdf) ['en', 'ar'].forEach(l => media(s.pdf[l], `${w} pdf.${l}`, 'reports'));
  const nSrc = (s.sources || []).length;
  (s.sources || []).forEach((x, i) => { need(x, `${w} sources[${i}]`, ['name', 'title', 'url']); url(x.url, `${w} sources[${i}]`, 'url'); date(x.date, `${w} sources[${i}]`, 'date', true); });
  const R = s.report; if (!R) return;
  const srcRef = (n, where) => { if (n != null && !(Number.isInteger(n) && n >= 1 && n <= nSrc)) errors.push(`${where}: src ${n} is not a valid source number (1–${nSrc})`); };
  const widgets = { compare: 'compare', attacks: 'attacks', timeline: 'timeline', fleet: 'fleet', claims: 'claims', watch: 'watch', providers: 'providers' };
  if (!Array.isArray(R.chapters) || !R.chapters.length) errors.push(`${w}: report.chapters is empty`);
  (R.chapters || []).forEach((c, ci) => {
    const cw = `${w} chapter ${c.id || ci}`;
    need(c, cw, ['id', 'n', 'title', 'blocks']);
    (c.blocks || []).forEach((b, bj) => {
      const bw = `${cw} block ${bj}`;
      if (!['p', 'h', 'quote', 'img', 'stats', 'list', 'w'].includes(b.t)) errors.push(`${bw}: unknown block type "${b.t}"`);
      if (['p', 'h', 'quote'].includes(b.t) && !(b.en && b.ar)) errors.push(`${bw}: needs en and ar text`);
      if (b.t === 'img') { media(b.src, bw, 'spotlight'); if (!b.credit) errors.push(`${bw}: image needs a credit`); }
      if (b.t === 'w') { if (!widgets[b.w]) errors.push(`${bw}: unknown widget "${b.w}"`); else if (!R[b.w]) errors.push(`${bw}: widget "${b.w}" used but report.${b.w} is missing`); }
    });
  });
  (R.attacks ? R.attacks.items : []).forEach((a, i) => { date(a.date, `${w} attacks[${i}]`, 'date'); srcRef(a.src, `${w} attacks[${i}]`); });
  (R.timeline || []).forEach((m, i) => { if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(m.date || '')) errors.push(`${w} timeline[${i}]: date must be YYYY, YYYY-MM or YYYY-MM-DD`); srcRef(m.src, `${w} timeline[${i}]`); if (m.img) media(m.img, `${w} timeline[${i}]`, 'spotlight'); });
  (R.fleet || []).forEach((f, i) => { if (!(R.status || {})[f.status]) errors.push(`${w} fleet[${i}]: status "${f.status}" is not in report.status`); srcRef(f.src, `${w} fleet[${i}]`); if (f.img) media(f.img, `${w} fleet[${i}]`, 'spotlight'); if (f.co && !coIds.has(f.co)) errors.push(`${w} fleet[${i}]: company "${f.co}" is not in companies.json`); });
  (R.claims || []).forEach((c, i) => { if (!(c.level >= 1 && c.level <= 4)) errors.push(`${w} claims[${i}]: level must be 1–4`); srcRef(c.src, `${w} claims[${i}]`); });
  (R.providers || []).forEach((p, i) => { if (!coIds.has(p.id)) errors.push(`${w} providers[${i}]: "${p.id}" is not in companies.json (add the company first)`); });
  (R.watch || []).forEach((x, i) => { if (!(R.watchStatus || {})[x.status]) errors.push(`${w} watch[${i}]: status "${x.status}" is not in report.watchStatus`); if (x.due) date(x.due, `${w} watch[${i}]`, 'due'); });
});
uniq(stories, 'id', 'stories');

// Policy dossiers (data/policy.json): one per country, shown on the Policy page
const SCOPES = ['robotics', 'autonomy', 'industry', 'ai', 'compute', 'digital'];
const policy = fs.existsSync(path.join(ROOT, 'data', 'policy.json')) ? readData('policy') : {};
const pair = (v, w) => { if (!Array.isArray(v) || v.length < 2 || !v[0] || !v[1]) errors.push(`${w}: needs [English, Arabic]`); };
Object.entries(policy).forEach(([cc, P]) => {
  const w = `policy ${cc}`;
  if (!countryCodes.has(cc)) errors.push(`${w}: country is not in countries.json`);
  if (EXCLUDED_COUNTRIES.has(cc)) errors.push(`${w}: excluded country`);
  pair(P.sum, `${w} sum`);
  if (!Array.isArray(P.robo) || ![0, 1, 2].includes(P.robo[2])) errors.push(`${w}: robo must be [en, ar, 0|1|2]`);
  (P.progs || []).forEach((g, i) => {
    const gw = `${w} progs[${i}]`;
    if (!g[0] || !g[1] || !g[2] || !g[3]) errors.push(`${gw}: needs name and agency in English and Arabic`);
    if (!SCOPES.includes(g[5])) errors.push(`${gw}: scope "${g[5]}" is not one of ${SCOPES.join(', ')}`);
    (g[6] || []).forEach((k, j) => { if (!k[0] || !k[2] || !k[3]) errors.push(`${gw} kpi ${j}: needs value and what it measures (en, ar)`); if (k[4] !== null && k[4] !== undefined && !Number.isInteger(k[4]) && !(Array.isArray(k[4]) && k[4][0] && k[4][1])) errors.push(`${gw} kpi ${j}: due must be a year, null, or a period as [en, ar]`); });
  });
  if (!P.progs || !P.progs.length) errors.push(`${w}: no programmes`);
  if (P.head && !(P.progs[P.head[0]] && (P.progs[P.head[0]][6] || [])[P.head[1]])) errors.push(`${w}: head points at a missing target`);
  if (P.feat) { pair(P.feat.name, `${w} feat.name`); pair(P.feat.why, `${w} feat.why`); }
  const AREAS = ['av', 'drone', 'sandbox', 'incentive', 'ai', 'data', 'robot'], STATUS = ['in_force', 'draft', 'pilot', 'announced', 'suspended'];
  (P.regs || []).forEach((r, i) => { const rw = `${w} regs[${i}]`; if (!AREAS.includes(r.area)) errors.push(`${rw}: area "${r.area}" is not one of ${AREAS.join(', ')}`); if (!STATUS.includes(r.status)) errors.push(`${rw}: status "${r.status}" is not one of ${STATUS.join(', ')}`); if (!r.title || !r.title.en || !r.title.ar) errors.push(`${rw}: needs title.en and title.ar`); if (!r.summary || !r.summary.en || !r.summary.ar) errors.push(`${rw}: needs summary.en and summary.ar`); if (!r.url) errors.push(`${rw}: needs a source URL`); else url(r.url, rw, 'url'); });
  const depIds = new Set(D.deployments.map(d => d.id));
  (P.progs || []).forEach((g, i) => (g[7] || []).forEach(id => { if (!depIds.has(id)) errors.push(`${w} progs[${i}]: linked deployment "${id}" does not exist`); }));
  (P.deadlines || []).forEach((x, i) => { const dw = `${w} deadlines[${i}]`; date(x.date, dw, 'date'); if (!x.en || !x.ar) errors.push(`${dw}: needs en and ar`); if (!x.url) errors.push(`${dw}: needs a source URL`); else url(x.url, dw, 'url'); });
  if (P.score) ['av_law', 'robotaxi', 'drones', 'sandbox', 'incentives', 'ai_rules'].forEach(k => { const x = P.score[k], sw = `${w} score.${k}`; if (!x) { errors.push(`${sw}: missing`); return; } if (![0, 1, 2].includes(x.v)) errors.push(`${sw}: v must be 0, 1 or 2`); if (!x.note || !x.note.en || !x.note.ar) errors.push(`${sw}: needs note.en and note.ar`); if (!x.url) errors.push(`${sw}: needs a source URL`); else url(x.url, sw, 'url'); });
  (P.pubs || []).forEach((x, i) => { if (!x[0] || !x[1]) errors.push(`${w} pubs[${i}]: needs a title in English and Arabic`); if (!x[7]) errors.push(`${w} pubs[${i}] "${x[0]}": needs a source URL`); else url(x[7], `${w} pubs[${i}]`, 'url'); });
});

// Excluded countries anywhere in the data, and their flag files
const flagFiles = fs.readdirSync(path.join(ROOT, 'media', 'flags'));
EXCLUDED_COUNTRIES.forEach(cc => { if (flagFiles.includes(cc.toLowerCase() + '.svg')) errors.push(`media/flags/${cc.toLowerCase()}.svg must not be in the site`); });
['deployments', 'events', 'countries', 'brief'].forEach(n => D[n].forEach((r, i) => { if (EXCLUDED_COUNTRIES.has(r.country) || EXCLUDED_COUNTRIES.has(r.code)) errors.push(`${n}[${i}]: excluded country`); }));

if (errors.length) { console.error(`Data check failed (${errors.length} problem${errors.length > 1 ? 's' : ''}):\n- ` + errors.join('\n- ')); process.exit(1); }
console.log(`Data check passed: ${D.companies.length} companies, ${D.deployments.length} deployments, ${D.events.length} events, ${D.countries.length} countries, ${D.brief.length} brief items, ${stories.length} research report${stories.length === 1 ? '' : 's'}, ${Object.keys(policy).length} policy dossiers.`);
