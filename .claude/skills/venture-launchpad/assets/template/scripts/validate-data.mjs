// Checks data/*.json against data/schema.json before every build and in every agent pull request.
// Exits non-zero on any problem, so a bad entry can never reach the live site.
//
// data/schema.json:
// {
//   "collections": {
//     "<file name without .json>": {
//       "key": "id",                               unique field (default "id")
//       "required": ["id", "name", "added"],       must be present and not empty
//       "enums": { "category": ["a", "b"] },       value must be one of the list (or of the keys, if an object of labels)
//       "dates": ["added"],                        YYYY-MM-DD
//       "urls": ["website", "source_url"],         http(s) links
//       "refs": { "country": "countries.code" },   value must exist in another collection
//       "files": ["logo", "image"],                site paths (/media/...) that must exist in the repository
//       "translated": ["title", "summary"],        for every extra language in site.json: <field>_<lang> must be present
//       "source": ["source_url"],                  at least one of these must be present (every record needs a source)
//       "numbers": ["capacity_mw"],                finite numbers
//       "lists": ["developers"],                   non-empty lists
//       "banned": [{ "fields": ["country"], "values": ["XX"], "why": "not covered" }]
//     }
//   },
//   "banned_terms": ["old brand name"]             text that must not appear anywhere in data/ (any case)
// }
// Placeholders: a record with "placeholder": true (sample content from the design, not yet sourced) is excused from the
// "source" rule, and the build refuses to publish it: with PUBLIC_LAUNCH=true any placeholder is an error.
// Sub-folders of data/ (e.g. data/briefs/2026-w47.json) are read as lists named after the folder.
// Domain rules that don't fit the schema go in scripts/validate-extra.mjs:
//   export default function (data, errors, { site, env }) { ... }
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validate({ schema, site, data, fileExists = p => fs.existsSync(path.join(ROOT, p)), rawText = '', publicLaunch = false }) {
  const errors = [];
  const empty = v => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
  const extraLangs = (site.languages || ['en']).slice(1);
  for (const [name, rules] of Object.entries(schema.collections || {})) {
    const rows = data[name];
    if (!Array.isArray(rows)) { errors.push(`${name}: data/${name}.json is missing or is not a list`); continue; }
    const key = rules.key || 'id', seen = new Set();
    rows.forEach((r, i) => {
      const w = `${name}[${i}] ${r[key] ?? ''}`.trim();
      for (const k of rules.required || []) if (empty(r[k])) errors.push(`${w}: missing "${k}"`);
      if (!empty(r[key])) { if (seen.has(r[key])) errors.push(`${name}: duplicate ${key} "${r[key]}"`); seen.add(r[key]); }
      for (const [f, allowed] of Object.entries(rules.enums || {})) {
        const list = Array.isArray(allowed) ? allowed : Object.keys(allowed);
        if (!empty(r[f]) && !list.includes(r[f])) errors.push(`${w}: ${f} "${r[f]}" is not one of ${list.join(', ')}`);
      }
      for (const f of rules.dates || []) if (!empty(r[f]) && !(ISO_DATE.test(r[f]) && !isNaN(Date.parse(r[f])))) errors.push(`${w}: ${f} "${r[f]}" is not a YYYY-MM-DD date`);
      for (const f of rules.urls || []) if (!empty(r[f]) && !/^https?:\/\/[^\s]+$/.test(r[f])) errors.push(`${w}: ${f} is not a valid URL`);
      for (const [f, target] of Object.entries(rules.refs || {})) {
        const [coll, field] = target.split('.');
        const values = [].concat(r[f] ?? []);
        for (const v of values) if (!(data[coll] || []).some(x => x[field] === v)) errors.push(`${w}: ${f} "${v}" is not in ${coll}.json`);
      }
      for (const f of rules.files || []) if (!empty(r[f]) && !(String(r[f]).startsWith('/') && fileExists(String(r[f]).slice(1)))) errors.push(`${w}: ${f} file "${r[f]}" does not exist`);
      for (const f of rules.translated || []) for (const l of extraLangs) if (!empty(r[f]) && empty(r[`${f}_${l}`])) errors.push(`${w}: missing "${f}_${l}" (${l} text for ${f})`);
      for (const f of rules.numbers || []) if (!empty(r[f]) && !(typeof r[f] === 'number' && Number.isFinite(r[f]))) errors.push(`${w}: ${f} must be a number`);
      for (const f of rules.lists || []) if (r[f] !== undefined && !(Array.isArray(r[f]) && r[f].length)) errors.push(`${w}: ${f} must be a non-empty list`);
      if (r.placeholder === true) { if (publicLaunch) errors.push(`${w}: is still a placeholder; source it or remove it before launch`); }
      else if (rules.source && rules.source.every(f => empty(r[f]))) errors.push(`${w}: needs a source (${rules.source.join(' or ')})`);
      for (const b of rules.banned || []) for (const f of b.fields) for (const v of [].concat(r[f] ?? [])) if (b.values.includes(v)) errors.push(`${w}: ${f} "${v}" is not allowed (${b.why || 'excluded'})`);
    });
  }
  const hay = rawText.toLowerCase();
  for (const t of schema.banned_terms || []) if (hay.includes(String(t).toLowerCase())) errors.push(`data/: contains the banned term "${t}"`);
  return errors;
}

async function main() {
  const schema = readJson('data/schema.json'), site = readJson('data/site.json');
  const data = {}; let rawText = '';
  for (const f of fs.readdirSync(path.join(ROOT, 'data')).filter(f => f.endsWith('.json') && f !== 'schema.json')) {
    const txt = fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'); rawText += txt;
    try { data[f.slice(0, -5)] = JSON.parse(txt); } catch (e) { console.error(`data/${f}: not valid JSON (${e.message})`); process.exit(1); }
  }
  for (const d of fs.readdirSync(path.join(ROOT, 'data'), { withFileTypes: true }).filter(e => e.isDirectory())) {
    data[d.name] = fs.readdirSync(path.join(ROOT, 'data', d.name)).filter(f => f.endsWith('.json')).sort().reverse().map(f => {
      const txt = fs.readFileSync(path.join(ROOT, 'data', d.name, f), 'utf8'); rawText += txt;
      try { return JSON.parse(txt); } catch (e) { console.error(`data/${d.name}/${f}: not valid JSON (${e.message})`); process.exit(1); }
    });
  }
  const publicLaunch = process.env.PUBLIC_LAUNCH === 'true';
  const errors = validate({ schema, site, data, rawText, publicLaunch });
  const extra = path.join(ROOT, 'scripts/validate-extra.mjs');
  if (fs.existsSync(extra)) await (await import(pathToFileURL(extra))).default(data, errors, { site, env: process.env });
  if (errors.length) { console.error(`Data check failed (${errors.length}):\n` + errors.map(e => '  - ' + e).join('\n')); process.exit(1); }
  console.log('Data check passed: ' + Object.keys(schema.collections || {}).map(n => `${data[n].length} ${n}`).join(', ') + '.');
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
