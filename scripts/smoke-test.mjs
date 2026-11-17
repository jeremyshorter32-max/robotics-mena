#!/usr/bin/env node
// Smoke test for the built site: opens every page in headless Chrome and fails if a page throws a script error,
// logs a console error, or renders without its main heading. Run before each deploy (see .github/workflows/deploy.yml).
//   node scripts/smoke-test.mjs [siteDir=_site] [--chrome /path/to/chrome]
// No dependencies: it talks to Chrome over the DevTools protocol with Node's built-in WebSocket (Node 22+).
// Network 404s (e.g. images requested before the page fills in their {{ }} placeholders) are ignored: they don't
// stop the page working. Added after the 17 Nov 2026 outage, when one misplaced comment blanked every page.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const site = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--chrome') || '_site';
const chromeArg = args.includes('--chrome') ? args[args.indexOf('--chrome') + 1] : '';
const PORT = 8799, DEBUG_PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function findChrome() {
  const candidates = [chromeArg, process.env.CHROME_PATH, '/opt/pw-browsers/chromium', 'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].filter(Boolean);
  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isDirectory()) { // Playwright-style folder: find the binary inside
        const bin = execFileSync('bash', ['-c', `ls ${c}/chrome-linux*/chrome 2>/dev/null | head -1`], { encoding: 'utf8' }).trim();
        if (bin) return bin;
        continue;
      }
      if (fs.existsSync(c)) return c;
      const p = execFileSync('bash', ['-c', `command -v ${c}`], { encoding: 'utf8' }).trim(); if (p) return p;
    } catch { /* try the next one */ }
  }
  throw new Error('No Chrome found: pass --chrome <path> or set CHROME_PATH');
}

// Every built page: pages/*.html plus the 404 page; skip pages that only redirect.
export function pagesToCheck(dir) {
  return fs.readdirSync(dir).filter(f => f.endsWith('.html')).filter(f => !/http-equiv=["']?refresh/i.test(fs.readFileSync(path.join(dir, f), 'utf8').slice(0, 3000)))
    .map(f => (f === 'index.html' ? '/' : '/' + f.replace(/\.html$/, ''))).sort();
}

class CDP {
  constructor(url) { this.ws = new WebSocket(url); this.id = 0; this.waiting = new Map(); this.handlers = []; }
  open() { return new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; this.ws.onmessage = e => this.onMessage(JSON.parse(e.data)); }); }
  onMessage(m) { if (m.id && this.waiting.has(m.id)) { const { res, rej } = this.waiting.get(m.id); this.waiting.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } else this.handlers.forEach(h => h(m)); }
  send(method, params = {}, sessionId) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params, sessionId })); return new Promise((res, rej) => this.waiting.set(id, { res, rej })); }
}

async function main() {
  if (!fs.existsSync(path.join(site, 'index.html'))) throw new Error(`${site}/index.html not found: build the site first`);
  const pages = pagesToCheck(site);
  const server = spawn('python3', [path.join(path.dirname(new URL(import.meta.url).pathname), 'serve-site.py'), site, String(PORT)], { stdio: 'ignore' });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-'));
  const bin = findChrome(); let chromeLog = '';
  const chrome = spawn(bin, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  chrome.stderr.on('data', d => { chromeLog = (chromeLog + d).slice(-2000); });
  const failures = [];
  try {
    let ver;
    for (let i = 0; i < 150 && !ver; i++) { await sleep(200); ver = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`).then(r => r.json()).catch(() => null); }
    if (!ver) throw new Error(`Chrome (${bin}) did not start within 30 seconds. Its output:\n${chromeLog}`);
    for (let i = 0; i < 25; i++) { if (await fetch(`http://127.0.0.1:${PORT}/`).then(r => r.ok).catch(() => false)) break; await sleep(200); }
    const cdp = new CDP(ver.webSocketDebuggerUrl); await cdp.open();
    for (const page of pages) {
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
      const errors = [];
      const h = m => {
        if (m.sessionId !== sessionId) return;
        if (m.method === 'Runtime.exceptionThrown') errors.push('script error: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split('\n')[0]);
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('console error: ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200));
      };
      cdp.handlers.push(h);
      await cdp.send('Runtime.enable', {}, sessionId);
      await cdp.send('Page.enable', {}, sessionId);
      await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}${page}` }, sessionId);
      await sleep(2500); // the pages render in the browser from data; give them time
      const { result } = await cdp.send('Runtime.evaluate', { returnByValue: true, expression: `(() => {
        const h1 = document.querySelector('h1'), body = document.body ? document.body.innerText : '';
        return { h1: h1 ? h1.innerText.trim() : '', unfilled: (h1 && /{{/.test(h1.innerText)) || false, banner: /is not defined|renderVals\\(\\)|TypeError|ReferenceError/.test(body), length: body.length };
      })()` }, sessionId);
      const v = result.value || {};
      if (page !== '/404' && !v.h1) errors.push('no main heading rendered');
      if (v.unfilled) errors.push('main heading still shows a {{ }} placeholder');
      if (v.banner) errors.push('an error message is shown on the page');
      if (v.length < 200) errors.push(`page is nearly empty (${v.length} characters)`);
      cdp.handlers = cdp.handlers.filter(x => x !== h);
      await cdp.send('Target.closeTarget', { targetId });
      console.log(`${errors.length ? '✗' : '✓'} ${page}${v.h1 ? '  · ' + v.h1.replace(/\s+/g, ' ').slice(0, 50) : ''}`);
      const uniq = [...new Set(errors.map(e => e.split('\n')[0]))]; uniq.forEach(e => console.log('    ' + e));
      if (errors.length) failures.push(page);
    }
  } finally {
    chrome.kill(); server.kill();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
  }
  if (failures.length) { console.error(`\nSmoke test failed on ${failures.length} page(s): ${failures.join(', ')}. Not deploying.`); process.exit(1); }
  console.log(`\nSmoke test passed: ${pages.length} pages render without script errors.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('Smoke test could not run: ' + e.message); process.exit(1); });
