#!/usr/bin/env node
// Builds the Content Library: one page with every social post (weeks and campaigns), copy buttons, media previews and
// downloads, plus the profile kit. Output: social/out/library/ (index.html + the media it shows; the page zips a collection on request),
// ready to publish as a private claude.ai Artifact with the `downloads` capability (see social/README.md).
//   node scripts/social-library.mjs [--since YYYY-wNN]   collections from that week on (default: last week onwards)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/taxonomy.mjs';
import { allQueues, readJson, queuePath, folderOf, cardFiles, extraFiles, isWeek, weekOf, xLength } from './lib/social.mjs';

const OUT = path.join(ROOT, 'social/out/library');
const sinceArg = process.argv.indexOf('--since');
const since = sinceArg > 0 ? process.argv[sinceArg + 1] : weekOf(new Date(Date.now() - 7 * 864e5));
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const copyIn = (src, dest) => { fs.mkdirSync(path.dirname(path.join(OUT, dest)), { recursive: true }); fs.copyFileSync(path.join(ROOT, src), path.join(OUT, dest)); return dest; };
const accounts = readJson(path.join(ROOT, 'social/accounts.json'));

const collections = allQueues().filter(n => !isWeek(n) || n >= since).map(name => {
  const q = readJson(queuePath(name)), folder = folderOf(q);
  const posts = [...q.posts].sort((a, b) => a.slot.localeCompare(b.slot)).map(p => {
    const media = [...cardFiles(folder, p), ...extraFiles(folder, p)].filter(f => fs.existsSync(path.join(ROOT, f)))
      .map(f => copyIn(f, f.replace(/^social\/cards\//, 'cards/')));
    return {
      id: p.id, platform: p.platform, format: p.format, slot: p.slot, lang: p.lang || 'en', status: p.status, template: !!p.template,
      subreddit: p.subreddit || '', title: p.title || '', text: p.text || '', thread: (p.thread || []).map(t => ({ t, n: xLength(t) })),
      xlen: p.platform === 'x' && p.text ? xLength(p.text) : 0, first_comment: p.first_comment || '', poll: p.poll || null,
      media_note: p.media_note || '', tags: p.tags || [], sources: p.sources || [], refresh: p.refresh || '', media,
    };
  });
  // The page zips a collection's media in the browser (an Artifact can't serve .zip files).
  const files = posts.flatMap(p => p.media);
  return { name, kind: isWeek(name) ? 'week' : 'campaign', title: q.title || (isWeek(name) ? `Week ${+name.slice(6)}` : name), theme: q.theme || '', notes: q.notes || '',
    range: q.range || [posts[0]?.slot.slice(0, 10), posts.at(-1)?.slot.slice(0, 10)], kit: q.kit || [], posts, files };
});

// Profile kit: avatar, banners, highlight covers.
const kitFiles = fs.readdirSync(path.join(ROOT, 'brand/social')).filter(f => f.endsWith('.png')).sort().map(f => copyIn(`brand/social/${f}`, `profile/${f}`));

const DATA = { built: new Date().toISOString().slice(0, 10), accounts, collections, profile: { files: kitFiles } };
const tpl = fs.readFileSync(path.join(ROOT, 'social/library-template.html'), 'utf8');
fs.writeFileSync(path.join(OUT, 'index.html'), tpl.replace('/*@DATA*/null', () => JSON.stringify(DATA).replace(/</g, '\\u003c')));

const all = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : all.push(path.relative(OUT, p)); } })(OUT);
fs.writeFileSync(path.join(OUT, 'files.json'), JSON.stringify(all.filter(f => f !== 'index.html' && f !== 'files.json'), null, 1));
const mb = all.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0) / 1048576;
console.log(`social/out/library: ${collections.length} collections, ${collections.reduce((s, c) => s + c.posts.length, 0)} posts, ${all.length - 1} files, ${mb.toFixed(1)} MB`);
