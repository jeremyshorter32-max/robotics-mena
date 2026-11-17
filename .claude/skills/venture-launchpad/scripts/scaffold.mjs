#!/usr/bin/env node
// Stamps the launchpad template (assets/template/) into a project repository, filling in the project's details.
//
//   node scaffold.mjs --config <launchpad.json> --out <repo dir> [--only admin,scripts,...] [--force] [--dry-run]
//   node scaffold.mjs --example            print an example launchpad.json
//
// Existing files are never overwritten unless --force is given (they are listed as "kept"), so it is safe to re-run
// after the Claude Design pages are in place, or later to add one part (e.g. --only admin).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(HERE, '..', 'assets', 'template');
const EXAMPLE = {
  project_name: 'Example Atlas',
  slug: 'example-atlas',
  repo: 'owner/example-atlas',
  domain: 'exampleatlas.com',
  contact_email: 'contact@exampleatlas.com',
  tagline: 'One sentence saying what the site is and who it is for.',
  languages: ['en'],
  timezone: 'Europe/London',
  tz_label: 'UK time',
  goatcounter_code: 'exampleatlas',
  web_filter_category: 'Science/Technology',
  web_filter_description: 'Three plain sentences for web-filter vendors: what the site is, that it has no ads, user content or downloads, and the category you want.',
  brand: { primary: '#26246E', paper: '#F3F1EC', ink: '#111216', font_sans: 'IBM Plex Sans', font_mono: 'IBM Plex Mono', logo_path: '/brand/logo/lockup-horizontal.svg' },
};

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf('--' + n); return i < 0 ? null : args[i + 1]; };
const flag = n => args.includes('--' + n);
if (flag('example')) { console.log(JSON.stringify(EXAMPLE, null, 2)); process.exit(0); }
const fail = m => { console.error(m); process.exit(2); };
const cfgPath = opt('config'), out = opt('out');
if (!cfgPath || !out) fail('usage: scaffold.mjs --config <launchpad.json> --out <repo dir> [--only a,b] [--force] [--dry-run]');

let c;
try { c = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch (e) { fail(`Could not read ${cfgPath}: ${e.message}`); }
const b = c.brand || {};
const problems = [];
const need = (v, name, re, hint) => { if (typeof v !== 'string' || !re.test(v)) problems.push(`${name}: ${hint} (got ${JSON.stringify(v)})`); };
need(c.project_name, 'project_name', /\S/, 'the name shown on the site');
need(c.slug, 'slug', /^[a-z0-9][a-z0-9-]{1,38}$/, 'lowercase letters, digits and hyphens (used for the Worker and package names)');
need(c.repo, 'repo', /^[\w.-]+\/[\w.-]+$/, 'owner/name on GitHub');
need(c.domain, 'domain', /^[a-z0-9.-]+\.[a-z]{2,}$/, 'bare domain such as example.com (no https://)');
need(c.contact_email, 'contact_email', /^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'the public contact address');
need(c.tagline, 'tagline', /\S/, 'one sentence, used as the default page description');
need(c.timezone, 'timezone', /^[A-Za-z_]+\/[A-Za-z_+-]+(\/[A-Za-z_]+)?$|^UTC$/, 'an IANA zone such as Asia/Dubai');
for (const k of ['primary', 'paper', 'ink']) need(b[k], `brand.${k}`, /^#[0-9a-fA-F]{6}$/, 'a 6-digit hex colour');
if (!Array.isArray(c.languages) || !c.languages.length || !c.languages.every(l => /^[a-z]{2}$/.test(l))) problems.push('languages: a list of 2-letter codes, main language first, e.g. ["en"] or ["en","ar"]');
if (/["\\\n]/.test([c.project_name, c.tagline].join(''))) problems.push('project_name and tagline must not contain double quotes, backslashes or line breaks');
try { new Intl.DateTimeFormat('en', { timeZone: c.timezone }); } catch { problems.push(`timezone: "${c.timezone}" is not a known IANA zone`); }
if (problems.length) fail('launchpad.json needs fixing:\n' + problems.map(p => '  - ' + p).join('\n') + '\nRun with --example to see every field.');

const fontSans = b.font_sans || 'IBM Plex Sans', fontMono = b.font_mono || 'IBM Plex Mono';
const TOKENS = {
  PROJECT_NAME: c.project_name, SLUG: c.slug, REPO: c.repo, REPO_OWNER: c.repo.split('/')[0],
  WEB_FILTER_CATEGORY: c.web_filter_category || 'Science/Technology (or News/Media)',
  WEB_FILTER_DESCRIPTION: (c.web_filter_description || `${c.project_name} is an independent website. ${c.tagline} No ads, no user-generated content, no downloads or file sharing.`).replace(/"/g, "'"), DOMAIN: c.domain, CONTACT_EMAIL: c.contact_email, TAGLINE: c.tagline,
  LANGUAGES_JSON: JSON.stringify(c.languages), TIMEZONE: c.timezone, TZ_LABEL: c.tz_label || c.timezone,
  GOATCOUNTER_CODE: c.goatcounter_code || c.slug.replace(/-/g, ''),
  BRAND_PRIMARY: b.primary, BRAND_PAPER: b.paper, BRAND_INK: b.ink,
  FONT_SANS: fontSans, FONT_MONO: fontMono, FONT_SANS_URL: fontSans.trim().replace(/\s+/g, '+'), FONT_MONO_URL: fontMono.trim().replace(/\s+/g, '+'),
  LOGO_PATH: b.logo_path || '/brand/logo/logo.svg',
  STATICRYPT_SALT: crypto.randomBytes(16).toString('hex'), TODAY: new Date().toISOString().slice(0, 10),
};
const fill = s => s.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in TOKENS ? TOKENS[k] : m));
const TEXT = /\.(mjs|cjs|js|json|md|html|sh|py|yml|yaml|toml|gs|txt|css)$|(^|\/)(CNAME|\.gitignore)$/;
const only = (opt('only') || '').split(',').map(s => s.trim()).filter(Boolean);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

const made = [], kept = [], leftover = [];
for (const src of walk(TEMPLATE)) {
  const rel = path.relative(TEMPLATE, src).split(path.sep).map(p => p.replace(/^dot-/, '.')).join('/').replace(/\.tmpl$/, '');
  if (only.length && !only.some(o => rel === o || rel.startsWith(o.replace(/\/$/, '') + '/'))) continue;
  const dest = path.join(out, rel);
  if (fs.existsSync(dest) && !flag('force')) { kept.push(rel); continue; }
  let body = fs.readFileSync(src);
  if (TEXT.test(rel)) {
    const text = fill(body.toString('utf8'));
    const rest = [...new Set(text.match(/\{\{[A-Z_]+\}\}/g) || [])];
    if (rest.length) leftover.push(`${rel}: ${rest.join(' ')}`);
    body = Buffer.from(text);
  }
  if (!flag('dry-run')) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, body);
    if (/\.sh$/.test(rel)) fs.chmodSync(dest, 0o755);
  }
  made.push(rel);
}

console.log(`${flag('dry-run') ? 'Would write' : 'Wrote'} ${made.length} files into ${path.resolve(out)}${only.length ? ` (only: ${only.join(', ')})` : ''}.`);
if (kept.length) console.log(`Kept ${kept.length} existing files (use --force to replace):\n` + kept.map(k => '  ' + k).join('\n'));
if (leftover.length) console.log('Placeholders left unfilled (fix by hand):\n' + leftover.map(k => '  ' + k).join('\n'));
if (!made.length && !kept.length) fail('Nothing matched --only. Top-level parts: admin, scripts, data, pages, src, partials, static, integrations, test, .github, and the root files.');
if (!flag('dry-run') && !only.length) {
  if (!fs.existsSync(path.join(out, '.git'))) console.log('Note: this folder is not a git repository yet (git init -b main, or clone the empty repository first).');
  const logo = path.join(out, TOKENS.LOGO_PATH.replace(/^\//, ''));
  if (!fs.existsSync(logo)) console.log(`Note: brand.logo_path ${TOKENS.LOGO_PATH} does not exist yet; the 404 and password pages use it. Copy the brand pack into brand/.`);
  console.log('Optional launchpad.json fields: tz_label, goatcounter_code, web_filter_category, web_filter_description, brand.font_sans, brand.font_mono, brand.logo_path.');
  console.log('Next: npm run build && npm test. Then replace the placeholders: pages/index.html, src/logic.js, data/items.json and data/schema.json.');
}
