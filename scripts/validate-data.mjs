// Checks data/*.json before every build and in scanner pull requests. Exits non-zero on any problem,
// so a bad entry can never reach the live site.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SECTORS, ROBOT_TYPES, COMPANY_CATEGORIES, STAGES, EVENT_TYPES, MENA, ISO_DATE, readData } from './lib/taxonomy.mjs';

const errors = [];
const D = Object.fromEntries(['companies', 'deployments', 'events', 'countries'].map(n => [n, readData(n)]));
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
  date(d.date, w, 'date'); date(d.added, w, 'added', true); logo(d.logo, w); url(d.source_url, w, 'source_url');
});
uniq(D.deployments, 'id', 'deployments');

D.events.forEach((e, i) => {
  const w = `events[${i}] ${e.id}`;
  need(e, w, ['id', 'name', 'type', 'city', 'start']);
  oneOf(e.type, EVENT_TYPES, w, 'type'); date(e.start, w, 'start'); date(e.end, w, 'end', true);
  if (e.country && !countryCodes.has(e.country)) errors.push(`${w}: country "${e.country}" is not in countries.json`);
  if (e.end && e.end < e.start) errors.push(`${w}: ends before it starts`);
  url(e.url, w, 'url'); logo(e.logo, w);
});
uniq(D.events, 'id', 'events');

if (errors.length) { console.error(`Data check failed (${errors.length} problem${errors.length > 1 ? 's' : ''}):\n- ` + errors.join('\n- ')); process.exit(1); }
console.log(`Data check passed: ${D.companies.length} companies, ${D.deployments.length} deployments, ${D.events.length} events, ${D.countries.length} countries.`);
