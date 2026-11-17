// Brands the StatiCrypt password screen in _site/*.html: logo, fonts, colours, favicons and share tags.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8').trim();
const head = read('partials/head-brand.html') + read('partials/password-head.html');
const logo = read('partials/password-logo.html');
const dir = path.join(root, '_site');
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
  const p = path.join(dir, f);
  let html = fs.readFileSync(p, 'utf8');
  if (!html.includes('staticrypt-title')) continue;
  html = html.replace('</head>', () => head + '</head>')
             .replace(/<p class="staticrypt-title">/, () => logo + '<p class="staticrypt-title">');
  fs.writeFileSync(p, html);
}
console.log('Branded the password screen.');
