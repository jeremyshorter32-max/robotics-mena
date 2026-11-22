#!/usr/bin/env node
// Builds the Content Library: one page with every social post (weeks and campaigns), copy buttons, media previews and
// downloads, plus the profile kit. Output: social/out/library/ (index.html + the media it shows; the page zips a collection on request),
// ready to publish as a private claude.ai Artifact with the `downloads` capability (see social/README.md).
//   node scripts/social-library.mjs [--since YYYY-wNN]   collections from that week on (default: last week onwards)
// The Engagement tab shows the daily sheets from the last two "Social engagement · <week>" issues (label social-engage), fetched
// with `gh api`. Use --engagement-file <json> to supply them instead (same shape as fetchEngagement returns), or --no-engagement.
// To refresh the published library, follow social/library-refresh.md (the scheduled runs do this themselves).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { ROOT } from './lib/taxonomy.mjs';
import { allQueues, readJson, queuePath, folderOf, cardFiles, extraFiles, isWeek, weekOf, xLength, weekBrief } from './lib/social.mjs';

// --review builds the sign-off version (approve / request changes per post, saved in the artifact's db) into social/out/review/.
const REVIEW = process.argv.includes('--review');
const OUT = path.join(ROOT, 'social/out', REVIEW ? 'review' : 'library');
const introArg = process.argv.indexOf('--intro');
const INTRO = introArg > 0 ? fs.readFileSync(path.resolve(process.argv[introArg + 1]), 'utf8') : '';
const sinceArg = process.argv.indexOf('--since');
const since = sinceArg > 0 ? process.argv[sinceArg + 1] : weekOf(new Date(Date.now() - 7 * 864e5));
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const copyIn = (src, dest) => { fs.mkdirSync(path.dirname(path.join(OUT, dest)), { recursive: true }); fs.copyFileSync(path.join(ROOT, src), path.join(OUT, dest)); return dest; };
const accounts = readJson(path.join(ROOT, 'social/accounts.json'));

// Engagement sheets: only the repository owner's comments that start with a "## " heading (the agent's sheets), never anyone else's.
const REPO = 'jeremyshorter32-max/robotics-mena', OWNER = REPO.split('/')[0];
function fetchEngagement() {
  const gh = p => JSON.parse(execFileSync('gh', ['api', p], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  return gh(`repos/${REPO}/issues?labels=social-engage&state=all&sort=created&direction=desc&per_page=2`).map(i => ({
    number: i.number, title: i.title, url: i.html_url, state: i.state,
    comments: gh(`repos/${REPO}/issues/${i.number}/comments?per_page=100`).map(c => ({ id: c.id, at: c.created_at, url: c.html_url, author: c.user && c.user.login, body: c.body || '' })),
  }));
}
function engagementData() {
  if (REVIEW || process.argv.includes('--no-engagement')) return null;
  const fileArg = process.argv.indexOf('--engagement-file');
  let issues;
  try { issues = fileArg > 0 ? readJson(path.resolve(process.argv[fileArg + 1])) : fetchEngagement(); }
  catch (e) { console.warn(`Engagement tab left out: could not read the sheets (${String(e.message || e).split('\n')[0]})`); return null; }
  return { issues: issues.map(i => ({ ...i, comments: i.comments.filter(c => c.author === OWNER && /^##\s/.test(c.body.trim())).map(({ author, ...c }) => ({ ...c, body: c.body.trim() })) })) };
}
const engagement = engagementData();

const collections = allQueues().filter(n => !isWeek(n) || n >= since).map(name => {
  const q = readJson(queuePath(name)), folder = folderOf(q);
  const posts = [...q.posts].sort((a, b) => a.slot.localeCompare(b.slot)).map(p => {
    const media = [...cardFiles(folder, p), ...extraFiles(folder, p)].filter(f => fs.existsSync(path.join(ROOT, f)))
      .map(f => copyIn(f, f.replace(/^social\/cards\//, 'cards/')));
    return {
      id: p.id, platform: p.platform, format: p.format, slot: p.slot, lang: p.lang || 'en', status: p.status, template: !!p.template,
      subreddit: p.subreddit || '', title: p.title || '', text: p.text || '', thread: (p.thread || []).map(t => ({ t, n: xLength(t) })),
      xlen: p.platform === 'x' && p.text ? xLength(p.text) : 0, first_comment: p.first_comment || '', poll: p.poll || null,
      media_note: p.media_note || '', tags: p.tags || [], sources: p.sources || [], refresh: p.refresh || '', brief: p.brief || '', media,
    };
  });
  // The page zips a collection's media in the browser (an Artifact can't serve .zip files).
  const files = posts.flatMap(p => p.media);
  // The brief this week goes out with, and which posts expand each of its stories.
  const wb = isWeek(name) ? weekBrief(name) : null;
  const brief = wb && { label: wb.label, published: wb.published, items: wb.items.map(i => ({ id: i.id, title: i.title, country: i.country, url: i.source_url || '',
    posts: posts.filter(p => p.brief === i.id).map(p => p.id) })) };
  return { name, brief, kind: isWeek(name) ? 'week' : 'campaign', title: q.title || (isWeek(name) ? `Week ${+name.slice(6)}` : name), theme: q.theme || '', notes: q.notes || '',
    range: q.range || [posts[0]?.slot.slice(0, 10), posts.at(-1)?.slot.slice(0, 10)], kit: q.kit || [], posts, files };
});

// Profile kit: avatar, banners, highlight covers.
const kitFiles = fs.readdirSync(path.join(ROOT, 'brand/social')).filter(f => f.endsWith('.png')).sort().map(f => copyIn(`brand/social/${f}`, `profile/${f}`));

const built = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' }) + ' Gulf time';
const DATA = { built, engagement, accounts, collections, profile: { files: kitFiles }, review: REVIEW, intro: INTRO };
const tpl = fs.readFileSync(path.join(ROOT, 'social/library-template.html'), 'utf8');
let page = tpl.replace('/*@DATA*/null', () => JSON.stringify(DATA).replace(/</g, '\\u003c'));
if (REVIEW) page = page.replace('<title>Robotics MENA Content Library</title>', '<title>Social Pack Sign-off</title>').replace('<h1>Content Library</h1>', '<h1>Social pack sign-off</h1>');
fs.writeFileSync(path.join(OUT, 'index.html'), page);

const all = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : all.push(path.relative(OUT, p)); } })(OUT);
const media = all.filter(f => f !== 'index.html' && f !== 'files.json' && f !== 'publish-files.json');
fs.writeFileSync(path.join(OUT, 'files.json'), JSON.stringify(media, null, 1));
// The `files` map for the Artifact publish (published path -> source path, relative to the library folder as `root`).
fs.writeFileSync(path.join(OUT, 'publish-files.json'), JSON.stringify(Object.fromEntries(media.map(f => [f, f]))));
const mb = all.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0) / 1048576;
const sheets = engagement ? engagement.issues.reduce((s, i) => s + i.comments.length, 0) : 0;
console.log(`social/out/${REVIEW ? 'review' : 'library'}: ${collections.length} collections, ${collections.reduce((s, c) => s + c.posts.length, 0)} posts, ${engagement ? sheets + ' engagement sheets, ' : ''}${media.length + 1} files, ${mb.toFixed(1)} MB`);
