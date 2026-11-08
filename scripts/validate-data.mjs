// Checks data/*.json before every build and in scanner pull requests. Exits non-zero on any problem,
// so a bad entry can never reach the live site.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SECTORS, ROBOT_TYPES, COMPANY_CATEGORIES, STAGES, EVENT_TYPES, MENA, ISO_DATE, readData } from './lib/taxonomy.mjs';

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

if (errors.length) { console.error(`Data check failed (${errors.length} problem${errors.length > 1 ? 's' : ''}):\n- ` + errors.join('\n- ')); process.exit(1); }
console.log(`Data check passed: ${D.companies.length} companies, ${D.deployments.length} deployments, ${D.events.length} events, ${D.countries.length} countries, ${D.brief.length} brief items, ${stories.length} research report${stories.length === 1 ? '' : 's'}.`);
