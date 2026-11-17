// Read-only fetching. There is deliberately no way to send a POST, fill a field or click anything:
//  - httpGet() only ever issues GET requests.
//  - browserGet() only navigates to a URL and reads the rendered page; every non-GET request the page itself tries
//    to make is aborted, so a vendor page can never submit anything on our behalf.
// Challenges (captcha / "verify you're human") are detected by the parsers and reported, never solved.
import { createRequire } from 'node:module';

const TRANSIENT = s => s === 0 || s === 429 || (s >= 500 && s < 600);
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function backoffMs(attempt, rng = Math.random, retryAfter = null) {
  if (retryAfter != null && Number.isFinite(retryAfter)) return Math.min(retryAfter * 1000, 60000);
  const base = 2000 * 2 ** attempt;                 // 2s, 4s, 8s…
  return Math.round(base / 2 + rng() * base);       // jittered between 0.5× and 1.5×
}

export async function httpGet(url, { userAgent, timeoutMs = 30000, retries = 2, fetchImpl = fetch, wait = sleep, rng = Math.random } = {}) {
  let last = { ok: false, status: 0, body: '', url, error: null };
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const r = await fetchImpl(url, { method: 'GET', redirect: 'follow', signal: ac.signal,
        headers: { 'User-Agent': userAgent, 'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en' } });
      const body = await r.text();
      last = { ok: r.ok, status: r.status, body, url: r.url || url, error: null };
      if (!TRANSIENT(r.status) || attempt === retries) return last;
      const ra = Number(r.headers?.get?.('retry-after'));
      await wait(backoffMs(attempt, rng, Number.isFinite(ra) && ra > 0 ? ra : null));
    } catch (e) {
      last = { ok: false, status: 0, body: '', url, error: e.name === 'AbortError' ? `timed out after ${timeoutMs} ms` : e.message };
      if (attempt === retries) return last;
      await wait(backoffMs(attempt, rng));
    } finally { clearTimeout(t); }
  }
  return last;
}

// Playwright is optional (not a project dependency). Without it the browser strategy reports itself unavailable.
export function loadPlaywright() {
  try { return createRequire(import.meta.url)('playwright'); } catch { return null; }
}

export async function browserGet(url, { userAgent, timeoutMs = 30000, settleMs = 6000, playwright = loadPlaywright() } = {}) {
  if (!playwright) return { ok: false, status: 0, body: '', url, error: 'browser strategy unavailable: Playwright is not installed' };
  const b = await playwright.chromium.launch();
  try {
    const ctx = await b.newContext({ userAgent });
    await ctx.route('**/*', route => (route.request().method() === 'GET' ? route.continue() : route.abort()));
    const page = await ctx.newPage();
    const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForTimeout(settleMs);
    return { ok: !!r && r.ok(), status: r ? r.status() : 0, body: await page.content(), url, error: null };
  } catch (e) {
    return { ok: false, status: 0, body: '', url, error: e.message.split('\n')[0] };
  } finally { await b.close(); }
}
