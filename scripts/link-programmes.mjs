#!/usr/bin/env node
// Links deployments to the national programmes that drive them, so each programme's "On the ground" list on the
// policy page stays current.
//
//   node scripts/link-programmes.mjs                 List deployments not linked to any programme, with suggestions
//   node scripts/link-programmes.mjs --new           Only deployments flagged is_new (used by the weekly scanner)
//   node scripts/link-programmes.mjs --apply d34=AE:0 [d35=SA:3 …]
//                                                    Link deployment d34 to programme 0 of the UAE dossier
//
// A suggestion is only a candidate. Link a deployment only when a source shows the programme drives it
// (funding, licence, sandbox, named target, or the programme's own announcement), not just the same country.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = n => path.join(ROOT, 'data', n + '.json');
const policy = JSON.parse(fs.readFileSync(file('policy'), 'utf8'));
const deps = JSON.parse(fs.readFileSync(file('deployments'), 'utf8'));

// Which programme scopes fit which robot types.
const SCOPE_FIT = { av: ['autonomy'], drone: ['autonomy'], arm: ['industry', 'robotics'], amr: ['industry', 'robotics'],
  inspection: ['industry', 'robotics'], construction: ['robotics', 'industry'], humanoid: ['robotics'], service: ['robotics'],
  medical: ['robotics'], marine: ['autonomy', 'robotics'], agri: ['robotics', 'industry'] };
const PLACES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ras Al Khaimah', 'Riyadh', 'Jeddah', 'NEOM', 'Doha', 'Muscat', 'Manama', 'Cairo', 'Casablanca', 'Tunis', 'Algiers', 'Amman', 'Kuwait'];

export function suggest(d) {
  const P = policy[d.country]; if (!P) return [];
  const text = `${d.site} ${d.title} ${d.summary}`;
  return P.progs.map((p, i) => {
    let s = 0; const why = [];
    if ((SCOPE_FIT[d.type] || []).includes(p[5])) { s += 2; why.push(`scope ${p[5]} fits ${d.type}`); }
    const named = PLACES.filter(x => p[0].includes(x));
    if (named.length) { if (named.some(x => text.includes(x))) { s += 2; why.push('same city'); } else { s -= 3; why.push(`programme is ${named.join('/')}-only`); } }
    if (d.sector === 'manufacturing' && p[5] === 'industry') { s += 1; why.push('manufacturing'); }
    return { cc: d.country, i, name: p[0], score: s, why: why.join(', ') };
  }).filter(x => x.score >= 2).sort((a, b) => b.score - a.score).slice(0, 2);
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);
const linked = new Set(Object.values(policy).flatMap(P => P.progs.flatMap(p => p[7] || [])));
const args = process.argv.slice(2);

if (!isCli) { /* imported: only suggest() is used */ } else if (args[0] === '--apply') {
  for (const a of args.slice(1)) {
    const m = /^(d\d+)=([A-Z]{2}):(\d+)$/.exec(a); if (!m) throw new Error(`Use d34=AE:0, not "${a}"`);
    const [, id, cc, i] = m, p = policy[cc] && policy[cc].progs[+i];
    if (!deps.some(d => d.id === id)) throw new Error(`No deployment ${id}`);
    if (!p) throw new Error(`No programme ${cc}:${i}`);
    p[7] = [...new Set([...(p[7] || []), id])];
    console.log(`Linked ${id} → ${cc}: ${p[0]}`);
  }
  fs.writeFileSync(file('policy'), JSON.stringify(policy, null, 1) + '\n');
} else {
  const list = deps.filter(d => !linked.has(d.id) && (!args.includes('--new') || d.is_new));
  for (const d of list) {
    const s = suggest(d);
    console.log(`${d.id} ${d.country} ${d.type}: ${d.title}`);
    console.log(s.length ? s.map(x => `   candidate ${x.cc}:${x.i} ${x.name} (${x.why})`).join('\n') : '   no matching programme in the dossier');
  }
  console.log(`\n${list.length} deployment(s) not linked. Link only with a source showing the programme drives it: --apply <id>=<CC>:<n>`);
}
