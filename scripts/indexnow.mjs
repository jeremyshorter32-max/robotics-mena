#!/usr/bin/env node
// Tells search engines that use IndexNow (Bing, Yandex, Naver, Seznam…) which pages exist or changed, so new briefs,
// companies and deployments are picked up within hours instead of waiting for a crawl. No account is needed: the key in
// data/site.json is published at https://roboticsmena.com/<key>.txt (static/<key>.txt), which proves we own the site.
//
//   node scripts/indexnow.mjs            Submit every URL in the built sitemap (_site/sitemap.xml)
//   node scripts/indexnow.mjs --dry-run  Print what would be sent
// Run by the Deploy site action after each successful deploy. Failures are reported but never fail the deploy.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/site.json'), 'utf8'));
const host = fs.readFileSync(path.join(ROOT, 'CNAME'), 'utf8').trim();
const key = site.indexnow_key;
if (!key) { console.log('IndexNow: no indexnow_key in data/site.json, skipping.'); process.exit(0); }
const sm = path.join(ROOT, '_site/sitemap.xml');
if (!fs.existsSync(sm)) { console.log('IndexNow: _site/sitemap.xml not found (build first), skipping.'); process.exit(0); }
const urlList = [...fs.readFileSync(sm, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const body = { host, key, keyLocation: `https://${host}/${key}.txt`, urlList };
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify(body, null, 2)); process.exit(0); }
try {
  const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
  // 200 = accepted, 202 = accepted while the key is being checked; 403 = key file not found yet; 422 = URLs not on this host.
  console.log(`IndexNow: HTTP ${r.status} for ${urlList.length} URLs${r.ok ? '' : ' · ' + (await r.text()).slice(0, 200)}`);
} catch (e) { console.log('IndexNow: request failed · ' + e.message); }
