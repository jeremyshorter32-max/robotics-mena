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

for (const file of fs.readdirSync(path.join(root, 'pages')).filter(f => f.endsWith('.html'))) {
  let html = read(`pages/${file}`);
  const cfg = /<script>\/\*@config (.*?)\*\/<\/script>/.exec(html);
  if (!cfg || !html.includes('/*@logic*/')) throw new Error(`${file}: missing @config or @logic marker`);
  html = html.replace(cfg[0], () => `<script>window.RM_PAGE=${safeJson(JSON.parse(cfg[1]))};window.RM_DATA=${safeJson(data)};</script>`)
             .replace('/*@logic*/', () => logic)
             .replace('</head>', () => headBrand + '\n</head>')
             .replace('<!--@brief-modal-->', () => briefModal);
  if (html.includes('<!--@brief-modal-->') || !html.includes('rm-brief-panel')) throw new Error(`${file}: missing the Get the brief pop-up`);
  fs.writeFileSync(path.join(out, file), bust(html));
}
console.log(`Assembled pages with ${data.companies.length} companies, ${data.deployments.length} deployments, ${data.events.length} events, ${data.countries.length} countries.`);
