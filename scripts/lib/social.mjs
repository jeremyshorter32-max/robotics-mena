// Shared rules for the social queue (social/queue/<YYYY>-w<NN>.json): platform limits, the site's editorial
// exclusions, link tagging and week helpers. Used by scripts/social.mjs, the social-* skills and the tests.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './taxonomy.mjs';

export const SOCIAL = path.join(ROOT, 'social');
export const PLATFORMS = ['linkedin', 'x', 'instagram', 'reddit'];
export const FORMATS = {
  linkedin: ['text', 'image', 'document', 'poll', 'video'],
  x: ['post', 'thread', 'quote', 'reply'],
  instagram: ['image', 'carousel', 'reel', 'story'],
  reddit: ['text', 'link', 'image', 'comment'],
};
export const STATUSES = ['draft', 'approved', 'scheduled', 'posted', 'skipped'];
export const PILLARS = ['signals', 'data', 'deployment', 'explainer', 'community'];
export const TEMPLATES = ['cover', 'signal', 'stat', 'bars', 'list', 'cta'];
export const SIZES = { portrait: [1080, 1350], square: [1080, 1080], story: [1080, 1920], landscape: [1200, 675] };
export const LIMITS = { x: 280, linkedin: 3000, instagram: 2200, reddit_title: 300, reddit_body: 40000, linkedin_hook: 210, poll_option: 30 };
export const MAX_HASHTAGS = { x: 2, linkedin: 5, instagram: 10, reddit: 0 };

// Same rule as the site (EXCLUDED_COUNTRIES = IL): no Israeli companies, flag or sources in any post.
export const EXCLUDED_TERMS = /\b(israel|israeli|israelis|tel[\s-]?aviv|haifa|idf)\b|🇮🇱|إسرائيل|اسرائيل|الإسرائيلي|تل أبيب/i;
export const EXCLUDED_DOMAINS = /\.(co\.)?il(\/|$)|timesofisrael|jpost\.com|haaretz|ynetnews|calcalistech|globes\.co/i;
// Phrases from social/VOICE.md that never go out.
export const BANNED_PHRASES = /\b(game[\s-]?changer|revolutioni[sz]e|delve|rapidly evolving landscape|let's dive in|you won't believe|tag (3|three) friends|comment yes)\b/i;

const URL_RE = /https?:\/\/[^\s)]+/g;
const HASHTAG_RE = /(^|\s)#[\p{L}\p{N}_]+/gu;

// X's weighted length (twitter-text v3): links count 23; code points outside the light ranges (which include
// Latin, Greek, Cyrillic, Hebrew and Arabic) count 2, so emoji and CJK cost double.
export function xLength(text) {
  const t = String(text || '').normalize('NFC');
  let n = 0;
  const stripped = t.replace(URL_RE, () => { n += 23; return ''; });
  for (const ch of stripped) {
    const cp = ch.codePointAt(0);
    const light = cp <= 4351 || (cp >= 8192 && cp <= 8205) || (cp >= 8208 && cp <= 8223) || (cp >= 8242 && cp <= 8247);
    n += light ? 1 : 2;
  }
  // Emoji modifiers and joiners are part of one emoji and are not counted again.
  n -= 2 * ([...stripped].filter(c => /[\u{1F3FB}-\u{1F3FF}\u{FE0F}]/u.test(c)).length);
  n -= [...stripped].filter(c => /‍/u.test(c)).length;
  // A flag is two regional-indicator letters but counts as one emoji (2).
  n -= [...stripped].filter(c => /[\u{1F1E6}-\u{1F1FF}]/u.test(c)).length;
  return Math.max(n, 0);
}

export const hashtags = text => (String(text || '').match(HASHTAG_RE) || []).map(h => h.trim());
export const links = text => String(text || '').match(URL_RE) || [];

// roboticsmena.com links carry utm tags (except on Reddit, where tagged links look like spam).
export function tag(url, platform, campaign) {
  const u = new URL(url);
  if (!/(^|\.)roboticsmena\.com$/.test(u.hostname) || platform === 'reddit') return url;
  u.searchParams.set('utm_source', platform);
  u.searchParams.set('utm_medium', 'social');
  u.searchParams.set('utm_campaign', campaign);
  return u.toString();
}

// ISO week helpers. A queue week runs Monday to Sunday.
export function weekStart(week) {
  const m = /^(\d{4})-w(\d{2})$/.exec(week);
  if (!m) throw new Error(`week "${week}" must look like 2026-w47`);
  const [y, w] = [+m[1], +m[2]];
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const mon1 = new Date(jan4); mon1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  const d = new Date(mon1); d.setUTCDate(mon1.getUTCDate() + (w - 1) * 7);
  return d;
}
export function weekOf(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const w = 1 + Math.round(((d - jan4) / 864e5 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-w${String(w).padStart(2, '0')}`;
}
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export function slotDate(week, day, time, tz = '+04:00') {
  const d = weekStart(week); d.setUTCDate(d.getUTCDate() + DAYS.indexOf(day));
  return `${d.toISOString().slice(0, 10)}T${time}${tz}`;
}

export const cardFiles = (week, post) => (post.cards || []).map((_, i) => `social/cards/${week}/${post.id}-${i + 1}.jpg`);
export const extraFiles = (week, post) => [
  ...(post.platform === 'linkedin' && post.format === 'document' ? [`social/cards/${week}/${post.id}.pdf`] : []),
  ...(post.format === 'reel' ? [`social/cards/${week}/${post.id}.mp4`] : []),
];

const allText = p => [p.text, p.title, p.first_comment, ...(p.thread || []), ...(p.poll?.options || []), p.poll?.question,
  ...(p.cards || []).flatMap(c => [c.kicker, c.title, c.body, c.foot, c.value, c.label, ...(c.items || []), ...(c.rows || []).map(r => r.label)])]
  .filter(Boolean).join('\n');

// Returns { errors, warnings } for one queue object. `opts.media` also checks that rendered files exist.
export function validateQueue(q, opts = {}) {
  const errors = [], warnings = [];
  const E = (w, m) => errors.push(`${w}: ${m}`), W = (w, m) => warnings.push(`${w}: ${m}`);
  if (!q || !Array.isArray(q.posts)) return { errors: ['queue: needs a "posts" list'], warnings };
  if (q.campaign !== undefined) { if (!/^[a-z0-9-]+$/.test(q.campaign)) errors.push('queue: campaign must be lowercase letters, digits and hyphens'); }
  else try { weekStart(q.week); } catch (e) { errors.push(`queue: ${e.message}`); }
  // Ready-to-paste copy that isn't a scheduled post (personal posts, emails, DMs): same editorial checks.
  (q.kit || []).forEach((k, i) => {
    const w = `kit[${i}] ${k.id || ''}`;
    if (!k.id || !k.title || !k.text) errors.push(`${w}: needs id, title and text`);
    if (EXCLUDED_TERMS.test(k.text || '')) errors.push(`${w}: mentions an excluded country`);
    if (BANNED_PHRASES.test(k.text || '')) errors.push(`${w}: uses a phrase social/VOICE.md bans`);
  });
  const ids = new Set();
  let ownLinksOutside = 0;
  const known = opts.handles || knownHandles();
  const cleared = opts.images || clearedImages();
  q.posts.forEach((p, i) => {
    const w = `posts[${i}] ${p.id || '(no id)'}`;
    if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) E(w, 'id must be lowercase letters, digits and hyphens');
    if (ids.has(p.id)) E(w, 'duplicate id'); ids.add(p.id);
    if (!PLATFORMS.includes(p.platform)) { E(w, `platform must be one of ${PLATFORMS.join(', ')}`); return; }
    if (!FORMATS[p.platform].includes(p.format)) E(w, `format "${p.format}" is not one of ${FORMATS[p.platform].join(', ')} for ${p.platform}`);
    if (!STATUSES.includes(p.status)) E(w, `status must be one of ${STATUSES.join(', ')}`);
    if (p.pillar && !PILLARS.includes(p.pillar)) E(w, `pillar must be one of ${PILLARS.join(', ')}`);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(\+|-)\d{2}:\d{2}$/.test(p.slot || '')) E(w, 'slot must look like 2026-11-16T08:30+04:00');
    else if (!q.campaign && weekOf(new Date(p.slot.slice(0, 10) + 'T12:00Z')) !== q.week) W(w, `slot ${p.slot} is outside ${q.week}`);
    if (p.lang && !['en', 'ar', 'en+ar'].includes(p.lang)) E(w, 'lang must be en, ar or en+ar');

    const text = allText(p);
    // [[placeholders]] are for templates the owner fills in on the day (live event coverage); never in a ready post.
    if (/\[\[[^\]]*\]\]/.test(text) && !p.template) E(w, 'has [[placeholders]] but is not marked "template": true');
    if (p.template && (p.cards || []).some(c => /\[\[/.test(JSON.stringify(c)))) E(w, 'placeholders are not allowed on cards (they are rendered as images)');
    if (EXCLUDED_TERMS.test(text)) E(w, 'mentions an excluded country (CLAUDE.md: no Israeli companies, flag or sources)');
    if (BANNED_PHRASES.test(text)) E(w, 'uses a phrase social/VOICE.md bans');
    (p.sources || []).forEach((s, j) => {
      if (!s.name || !/^https?:\/\//.test(s.url || '')) E(w, `sources[${j}] needs name and url`);
      if (EXCLUDED_DOMAINS.test(s.url || '')) E(w, `sources[${j}] is an excluded source`);
    });
    if (['signals', 'deployment', 'data'].includes(p.pillar) && !(p.sources || []).length && p.format !== 'comment') E(w, `a ${p.pillar} post needs at least one source`);

    const body = [p.text, p.first_comment, ...(p.thread || [])].filter(Boolean).join('\n');
    links(body).forEach(l => {
      let u; try { u = new URL(l); } catch { E(w, `bad link ${l}`); return; }
      const ours = /(^|\.)roboticsmena\.com$/.test(u.hostname);
      if (EXCLUDED_DOMAINS.test(l)) E(w, `links to an excluded source ${l}`);
      if (ours && p.platform !== 'reddit' && u.searchParams.get('utm_source') !== p.platform) E(w, `roboticsmena.com link needs utm_source=${p.platform} (use tag())`);
      if (ours && p.platform === 'reddit' && u.searchParams.has('utm_source')) E(w, 'no utm tags on Reddit links');
      if (ours && p.platform === 'reddit' && (p.subreddit || '').toLowerCase() !== 'roboticsmena') ownLinksOutside++;
    });

    // @-mentions on X and Instagram must be checked handles (social/handles.json) or our own.
    if (['x', 'instagram'].includes(p.platform)) (body.replace(URL_RE, '').match(/(^|[^\w@])@([A-Za-z0-9_.]{2,30})/g) || []).map(m => m.replace(/^[^@]*@/, '').replace(/\.$/, '')).forEach(h => {
      if (!known[p.platform].has(h.toLowerCase())) E(w, `@${h} is not a checked ${p.platform} handle (add it to social/handles.json once confirmed, or drop the @)`);
    });

    const tags = hashtags(body);
    if (tags.length > MAX_HASHTAGS[p.platform]) (p.platform === 'reddit' ? E : W)(w, `${tags.length} hashtags (max ${MAX_HASHTAGS[p.platform]} on ${p.platform})`);

    if (p.platform === 'x') {
      const parts = p.format === 'thread' ? (p.thread || []) : [p.text];
      if (p.format === 'thread' && parts.length < 2) E(w, 'a thread needs at least 2 posts in "thread"');
      parts.forEach((t, j) => { if (!t) E(w, `post ${j + 1} is empty`); else if (xLength(t) > LIMITS.x) E(w, `post ${j + 1} is ${xLength(t)} weighted characters (max ${LIMITS.x})`); });
    } else if (p.platform === 'linkedin') {
      if (!p.text) E(w, 'needs text');
      else {
        if (p.text.length > LIMITS.linkedin) E(w, `text is ${p.text.length} characters (max ${LIMITS.linkedin})`);
        const hook = p.text.split('\n')[0];
        if (hook.length > LIMITS.linkedin_hook) W(w, `hook (first line) is ${hook.length} characters; LinkedIn cuts at ~${LIMITS.linkedin_hook}`);
        if (links(p.text).length) W(w, 'link in the post body; LinkedIn reach is better with the link in first_comment');
      }
      if (p.format === 'poll') {
        const o = p.poll?.options || [];
        if (!p.poll?.question || o.length < 2 || o.length > 4) E(w, 'a poll needs poll.question and 2 to 4 options');
        o.forEach(x => { if (x.length > LIMITS.poll_option) E(w, `poll option "${x}" is over ${LIMITS.poll_option} characters`); });
      }
      if (p.format === 'document' && (p.cards || []).length < 3) E(w, 'a document post needs at least 3 cards (slides)');
    } else if (p.platform === 'instagram') {
      if (!p.text && p.format !== 'story') E(w, 'needs a caption in "text"');
      if ((p.text || '').length > LIMITS.instagram) E(w, `caption is ${p.text.length} characters (max ${LIMITS.instagram})`);
      if (links(p.text).length) W(w, 'links are not clickable in Instagram captions; say "link in bio"');
      if (!(p.cards || []).length && !p.media_note) E(w, 'Instagram posts need cards or a media_note describing the footage');
      if (p.format === 'carousel' && ((p.cards || []).length < 2 || p.cards.length > 20)) E(w, 'a carousel needs 2 to 20 cards');
      (p.cards || []).forEach((c, j) => { if (p.format === 'reel' || p.format === 'story' ? c.size !== 'story' : c.size === 'landscape') W(w, `card ${j + 1} size "${c.size}" is unusual for an Instagram ${p.format}`); });
    } else if (p.platform === 'reddit') {
      if (p.format !== 'comment') {
        if (!p.title) E(w, 'needs a title'); else if (p.title.length > LIMITS.reddit_title) E(w, `title is ${p.title.length} characters (max ${LIMITS.reddit_title})`);
        if (!p.subreddit) E(w, 'needs a subreddit');
      }
      if ((p.text || '').length > LIMITS.reddit_body) E(w, 'body is too long');
      if (/[\u{1F300}-\u{1FAFF}]/u.test(p.title || '')) W(w, 'emoji in a Reddit title usually reads as marketing');
    }

    (p.cards || []).forEach((c, j) => {
      const cw = `${w} card ${j + 1}`;
      if (!TEMPLATES.includes(c.template)) E(cw, `template must be one of ${TEMPLATES.join(', ')}`);
      if (!(c.size in SIZES)) E(cw, `size must be one of ${Object.keys(SIZES).join(', ')}`);
      if (c.template !== 'cta' && !c.title && !c.value) E(cw, 'needs a title');
      if (c.template === 'bars' && !(c.rows || []).every(r => r.label && Number.isFinite(r.value))) E(cw, 'bars need rows of {label, value}');
      if ((c.title || '').length > 140) W(cw, 'title over 140 characters will be small on a phone');
      // Photos: only images cleared in social/images.json (company or government press images, or the owner's own).
      [c.image, ...(c.images || [])].filter(Boolean).forEach(img => {
        if (!cleared[img]) E(cw, `image ${img} is not a rights-cleared image in social/images.json`);
        else if (!fs.existsSync(path.join(ROOT, img))) E(cw, `image ${img} does not exist`);
      });
    });
    if (opts.media) [...cardFiles(folderOf(q), p), ...extraFiles(folderOf(q), p)].forEach(f => { if (!fs.existsSync(path.join(ROOT, f))) E(w, `missing ${f} (run: node scripts/social-cards.cjs week ${folderOf(q)})`); });
  });
  if (ownLinksOutside > 1) errors.push(`queue: ${ownLinksOutside} Reddit posts outside r/RoboticsMENA link to roboticsmena.com (max 1 a week)`);
  return { errors, warnings };
}

export function clearedImages(file = path.join(SOCIAL, 'images.json')) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).images || {} : {};
}

export function knownHandles(file = path.join(SOCIAL, 'handles.json')) {
  const out = { x: new Set(['roboticsmena']), instagram: new Set(['roboticsmena']) };
  if (fs.existsSync(file)) Object.values(JSON.parse(fs.readFileSync(file, 'utf8')).orgs || {}).forEach(o => {
    if (o.x) out.x.add(o.x.toLowerCase()); if (o.instagram) out.instagram.add(o.instagram.toLowerCase());
  });
  return out;
}

// Slots from social/cadence.json that a queue does not fill (same platform, day and format).
export function missingSlots(q, cadence) {
  if (q.campaign) return [];
  const have = new Set(q.posts.filter(p => p.status !== 'skipped').map(p => `${p.platform}|${p.slot.slice(0, 16)}`));
  return cadence.slots.filter(s => !have.has(`${s.platform}|${slotDate(q.week, s.day, s.time, cadence.timezone).slice(0, 16)}`));
}

export const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
// A queue is a week (social/queue/2026-w47.json) or a campaign (social/campaigns/launch-2026.json, "campaign": "launch-2026").
export const isWeek = name => /^\d{4}-w\d{2}$/.test(name);
export const queuePath = name => path.join(SOCIAL, isWeek(name) ? 'queue' : 'campaigns', `${name}.json`);
export const folderOf = q => q.campaign || q.week;
export const allQueues = () => [
  ...fs.readdirSync(path.join(SOCIAL, 'queue')).filter(f => /^\d{4}-w\d{2}\.json$/.test(f)),
  ...(fs.existsSync(path.join(SOCIAL, 'campaigns')) ? fs.readdirSync(path.join(SOCIAL, 'campaigns')).filter(f => f.endsWith('.json')) : []),
].map(f => f.slice(0, -5)).sort();
