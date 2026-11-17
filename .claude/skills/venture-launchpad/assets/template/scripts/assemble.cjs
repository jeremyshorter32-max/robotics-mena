// Assembles the deployable pages: page layout (pages/*.html) + shared logic (src/logic.js) + data (data/*.json).
// Usage: node scripts/assemble.cjs <outDir>
//
// Markers a page can use (all optional except <title> and <meta name="description">):
//   <script>/*@config {"page":"home"}*/</script>   becomes window.SITE_PAGE (that JSON) and window.SITE_DATA (all data)
//   /*@logic*/                                      replaced with src/logic.js (shared page logic)
//   <!--@partial:signup-modal-->                    replaced with partials/signup-modal.html
//   <!--@no-data-->                                 this page does not need window.SITE_DATA (keeps it small)
// Every page also gets: partials/head-brand.html before </head>, canonical + Open Graph tags from its own title and
// description, analytics (if data/site.json has "goatcounter"), and a place in sitemap.xml (unless it is noindex).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
const out = process.argv[2] || path.join(root, '_site');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const exists = f => fs.existsSync(path.join(root, f));

// ---- Data: every data/*.json by file name; every data/<folder>/ as a list of its files, newest name first. ----
const data = {};
for (const e of fs.readdirSync(path.join(root, 'data'), { withFileTypes: true })) {
  if (e.isFile() && e.name.endsWith('.json') && e.name !== 'schema.json') data[e.name.slice(0, -5)] = JSON.parse(read(`data/${e.name}`));
  if (e.isDirectory()) data[e.name] = fs.readdirSync(path.join(root, 'data', e.name)).filter(f => f.endsWith('.json')).sort().reverse()
    .map(f => JSON.parse(read(`data/${e.name}/${f}`)));
}
const site = data.site || {};
if (!site.name || !/^https:\/\/[^/]+\/?$/.test(site.url || '')) throw new Error('data/site.json needs "name" and "url" (https://your-domain)');
const SITE = site.url.replace(/\/$/, ''), HOST = new URL(SITE).hostname;
data.builtAt = new Date().toISOString().slice(0, 10);
// Never ship private settings to the browser: only the keys listed in site.public (plus name/url) reach the pages.
const PUBLIC_SITE_KEYS = ['name', 'alt_name', 'tagline', 'url', 'languages', 'contact_email', 'signup_url', 'form_url', 'sheet_url', 'social', ...(site.public || [])];
data.site = Object.fromEntries(Object.entries(site).filter(([k]) => PUBLIC_SITE_KEYS.includes(k)));

const logic = exists('src/logic.js') ? read('src/logic.js') : '';
if (logic.includes('</script')) throw new Error('src/logic.js must not contain "</script"');
const headBrand = exists('partials/head-brand.html') ? read('partials/head-brand.html').trim() : '';
for (const m of headBrand.matchAll(/(?:href|content)="(?:https:\/\/[^\/"]+)?(\/brand\/[^"]+)"/g)) if (!exists(m[1].slice(1))) console.warn(`Warning: partials/head-brand.html points at ${m[1]}, which does not exist yet.`);
const safeJson = v => JSON.stringify(v).replace(/</g, '\\u003c');
const attr = v => v.replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;').replace(/"/g, '&quot;');

// Cache-busting: local scripts and stylesheets get a content hash in their URL, so browsers fetch a new version as
// soon as it changes instead of reusing a cached copy.
const ver = f => crypto.createHash('sha1').update(fs.readFileSync(path.join(root, f))).digest('hex').slice(0, 10);
const bust = html => html.replace(/\b(src|href)="(\.?\/)([\w./-]+\.(?:js|css))"/g, (m, a, pre, f) => (exists(f) && !f.startsWith('vendor/') ? `${a}="${pre}${f}?v=${ver(f)}"` : m));

const social = (site.social || []).filter(s => s && /^https:\/\//.test(s.url || ''));
const pagesOut = [];
for (const file of fs.readdirSync(path.join(root, 'pages')).filter(f => f.endsWith('.html'))) {
  let html = read(`pages/${file}`);
  const slug = file.replace(/\.html$/, ''), url = SITE + (slug === 'index' ? '/' : '/' + slug);
  const title = (/<title>([^<]*)<\/title>/.exec(html) || [])[1];
  const desc = (/<meta name="description" content="([^"]*)">/.exec(html) || [])[1];
  if (!title) throw new Error(`${file}: missing <title>`);
  if (!desc) throw new Error(`${file}: missing <meta name="description">`);
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  html = html.replace('</title>', () => `</title>\n<link rel="canonical" href="${url}"><meta property="og:url" content="${url}"><meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${desc}">`);
  if (!noindex) pagesOut.push(url);

  // Structured data for search engines on the home page: who publishes the site, and its search box if it has one.
  if (slug === 'index') html = html.replace('</head>', () => `<script type="application/ld+json">${safeJson({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': SITE + '/#org', name: site.name, ...(site.alt_name ? { alternateName: site.alt_name } : {}), url: SITE + '/', ...(site.logo ? { logo: SITE + site.logo } : {}),
      ...(site.contact_email ? { email: site.contact_email } : {}), ...(social.length ? { sameAs: social.map(s => s.url) } : {}) },
    { '@type': 'WebSite', '@id': SITE + '/#website', name: site.name, url: SITE + '/', inLanguage: site.languages || ['en'], publisher: { '@id': SITE + '/#org' },
      ...(site.search_url ? { potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: SITE + site.search_url }, 'query-input': 'required name=search_term_string' } } : {}) }] })}</script>\n</head>`);

  // Page settings and data.
  const cfg = /<script>\/\*@config (.*?)\*\/<\/script>/.exec(html);
  const pageCfg = cfg ? JSON.parse(cfg[1]) : { page: slug };
  const noData = html.includes('<!--@no-data-->');
  const boot = `<script>window.SITE_PAGE=${safeJson(pageCfg)};${noData ? '' : `window.SITE_DATA=${safeJson(data)};`}</script>`;
  if (cfg) html = html.replace(cfg[0], () => boot);
  else html = /<script\b/.test(html) ? html.replace(/<script\b/, m => boot + '\n' + m) : html.replace('</head>', () => boot + '\n</head>');
  html = html.replace('<!--@no-data-->', '').replace('/*@logic*/', () => logic);

  // Shared pieces.
  html = html.replace(/<!--@partial:([\w-]+)-->/g, (m, name) => { if (!exists(`partials/${name}.html`)) throw new Error(`${file}: partials/${name}.html not found`); return read(`partials/${name}.html`).trim(); });
  if (headBrand) html = html.replace('</head>', () => headBrand + '\n</head>');

  // Privacy-friendly analytics (GoatCounter: no cookies, no personal data). Counts only on the live domain.
  if (site.goatcounter) {
    const src = exists('vendor/goatcounter-count.js') ? '/vendor/goatcounter-count.js' : '//gc.zgo.at/count.js';
    html = html.replace('</body>', () => `<script>if(location.hostname!==${JSON.stringify(HOST)}&&location.hostname!==${JSON.stringify('www.' + HOST)})window.goatcounter={no_onload:true};</script><script data-goatcounter="https://${site.goatcounter}.goatcounter.com/count" async src="${src}"></script>\n</body>`);
  }
  // Pages that must carry something on every page (e.g. the sign-up pop-up): list a marker for each in site.json "require_on_every_page".
  for (const must of site.require_on_every_page || []) if (!noindex && !html.includes(must)) throw new Error(`${file}: missing "${must}" (required on every page by data/site.json)`);
  fs.writeFileSync(path.join(out, file), bust(html));
}

// Branded "page not found" page (GitHub Pages serves it for any missing address) and the sitemap for search engines.
if (exists('static/404.html')) fs.writeFileSync(path.join(out, '404.html'), read('static/404.html').replace('</head>', () => headBrand + '\n</head>'));
const order = u => (u.endsWith('/') ? 0 : 1);
fs.writeFileSync(path.join(out, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  pagesOut.sort((a, b) => order(a) - order(b) || a.localeCompare(b)).map(u => `  <url><loc>${u}</loc><lastmod>${data.builtAt}</lastmod></url>`).join('\n') + '\n</urlset>\n');
const counts = Object.entries(data).filter(([k, v]) => Array.isArray(v) && k !== 'social').map(([k, v]) => `${v.length} ${k}`).join(', ');
console.log(`Assembled ${pagesOut.length} pages${counts ? ` with ${counts}` : ''}.`);
