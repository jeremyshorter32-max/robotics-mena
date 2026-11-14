// Assembles the deployable pages: page layout (pages/*.html) + shared logic (src/logic.js) + data (data/*.json).
// Usage: node scripts/assemble.cjs <outDir>
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = process.argv[2] || path.join(root, '_site');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const data = {};
for (const name of ['companies', 'deployments', 'events', 'countries', 'brief', 'stories', 'site', 'policy', 'corrections']) data[name] = JSON.parse(read(`data/${name}.json`));
data.builtAt = new Date().toISOString().slice(0, 10);
// Hand-picked X posts: only approved ones reach the site (SHOW_SUGGESTED=1 previews suggestions locally).
data.xposts = (fs.existsSync(path.join(root, 'data/xposts.json')) ? JSON.parse(read('data/xposts.json')) : [])
  .filter(x => x.status === 'approved' || (process.env.SHOW_SUGGESTED === '1' && x.status === 'suggested'))
  .sort((a, b) => b.date.localeCompare(a.date));

const logic = read('src/logic.js');
const headBrand = read('partials/head-brand.html').trim();
const briefModal = read('partials/brief-modal.html').trim();
if (logic.includes('</script')) throw new Error('src/logic.js must not contain "</script"');
const safeJson = v => JSON.stringify(v).replace(/</g, '\\u003c');
// Cache-busting: script files referenced by the pages get a content hash in their URL, so browsers
// fetch the new version as soon as it changes instead of reusing a cached copy.
const crypto = require('crypto');
const ver = f => crypto.createHash('sha1').update(fs.readFileSync(path.join(root, f))).digest('hex').slice(0, 10);
const VERSIONED = ['mena-map.js'];
const bust = html => VERSIONED.reduce((h, f) => h.split(`"./${f}"`).join(`"./${f}?v=${ver(f)}"`).split(`"/${f}"`).join(`"/${f}?v=${ver(f)}"`), html);

const pagesOut = [];
for (const file of fs.readdirSync(path.join(root, 'pages')).filter(f => f.endsWith('.html'))) {
  let html = read(`pages/${file}`);
  const cfg = /<script>\/\*@config (.*?)\*\/<\/script>/.exec(html);
  if (!cfg || !html.includes('/*@logic*/')) throw new Error(`${file}: missing @config or @logic marker`);
  // Search and sharing tags from the page's own <title> and description: canonical address, Open Graph title/description/URL.
  const SITE = 'https://' + read('CNAME').trim(), slug = file.replace(/\.html$/, ''), url = SITE + (slug === 'index' ? '/' : '/' + slug);
  const attr = v => v.replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;').replace(/"/g, '&quot;');
  const title = ((/<title>([^<]*)<\/title>/.exec(html) || [])[1] || 'Robotics MENA');
  const desc = (/<meta name="description" content="([^"]*)">/.exec(html) || [])[1];
  if (!desc) throw new Error(`${file}: missing <meta name="description">`);
  html = html.replace('</title>', () => `</title>\n<link rel="canonical" href="${url}"><meta property="og:url" content="${url}"><meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${desc}">`);
  pagesOut.push(url);
  // Structured data for search engines on the home page: the site's name, logo and its database search.
  if (slug === 'index') html = html.replace('</head>', () => `<script type="application/ld+json">${safeJson({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': SITE + '/#org', name: 'Robotics MENA', alternateName: 'روبوتات الشرق الأوسط وشمال أفريقيا', url: SITE + '/', logo: SITE + '/brand/icons/icon-512.png', email: (data.site || {}).contact_email || 'contact@roboticsmena.com', sameAs: Object.values((data.site || {}).social || {}) },
    { '@type': 'WebSite', '@id': SITE + '/#website', name: 'Robotics MENA', url: SITE + '/', inLanguage: ['en', 'ar'], publisher: { '@id': SITE + '/#org' },
      potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: SITE + '/database?q={search_term_string}' }, 'query-input': 'required name=search_term_string' } }] })}</script>\n</head>`);
  html = html.replace(cfg[0], () => `<script>window.RM_PAGE=${safeJson(JSON.parse(cfg[1]))};window.RM_DATA=${safeJson(data)};</script>`)
             .replace('/*@logic*/', () => logic)
             .replace('</head>', () => headBrand + '\n</head>')
             .replace('<!--@brief-modal-->', () => briefModal);
  // Privacy-friendly analytics (GoatCounter: no cookies, no personal data). Counts only on the live domain.
  const gc = (data.site || {}).goatcounter;
  if (gc) html = html.replace('</body>', () => `<script>if(!/^(www\\.)?roboticsmena\\.com$/.test(location.hostname))window.goatcounter={no_onload:true};</script><script data-goatcounter="https://${gc}.goatcounter.com/count" async src="/vendor/goatcounter-count.js"></script>\n</body>`);
  if (html.includes('<!--@brief-modal-->') || !html.includes('rm-brief-panel')) throw new Error(`${file}: missing the Get the brief pop-up`);
  fs.writeFileSync(path.join(out, file), bust(html));
}
// Branded "page not found" page (served by GitHub Pages for any missing address) and the sitemap for search engines.
fs.writeFileSync(path.join(out, '404.html'), read('static/404.html').replace('</head>', () => headBrand + '\n</head>'));
const order = u => (u.endsWith('/') ? 0 : 1);
fs.writeFileSync(path.join(out, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  pagesOut.sort((a, b) => order(a) - order(b) || a.localeCompare(b)).map(u => `  <url><loc>${u}</loc><lastmod>${data.builtAt}</lastmod></url>`).join('\n') + '\n</urlset>\n');
console.log(`Assembled pages with ${data.companies.length} companies, ${data.deployments.length} deployments, ${data.events.length} events, ${data.countries.length} countries.`);
