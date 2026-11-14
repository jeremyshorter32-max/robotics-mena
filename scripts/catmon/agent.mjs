// The monitoring run: for every enabled vendor × domain that is due, check robots.txt, fetch the public lookup once
// (read-only), parse it with that vendor's parser, append a CheckResult to the history, update the latest state and
// notify on changes. Every failure becomes a BLOCKED or ERROR result; nothing here throws past runAgent().
import { fillUrl } from './config.mjs';
import { httpGet, browserGet, sleep } from './fetch.mjs';
import { robotsVerdict } from './robots.mjs';
import { PARSERS, STATUSES } from './vendors/index.mjs';
import { decide, isDue, targetReached } from './decide.mjs';
import { key } from './store.mjs';

const BLOCKING_HTTP = new Set([401, 403, 429]);

export async function checkOne(vendor, domain, cfg, deps) {
  const { now = () => new Date(), http = httpGet, browser = browserGet, wait = sleep, robotsCache = new Map() } = deps;
  const base = { vendor: vendor.id, domain, target_category: vendor.targetCategory };
  const done = (raw_status, normalized_status, current_category, note) => ({
    ...base, checked_at: now().toISOString(), raw_status, normalized_status, current_category: current_category || null,
    target_reached: targetReached(normalized_status, current_category, vendor.targetCategory), note: note || null,
  });
  const parser = PARSERS[vendor.module];
  if (!parser) return done('no parser', 'ERROR', null, `no parser module "${vendor.module}" registered`);
  const url = fillUrl(vendor.lookupUrl, domain), u = new URL(url);
  const opts = { userAgent: cfg.userAgent, timeoutMs: cfg.requestTimeoutMs, retries: cfg.maxRetries };

  // robots.txt: fetched once per host per run. The hash part of a URL is never sent, so SPA routes check "/".
  if (!robotsCache.has(u.origin)) {
    const r = await http(`${u.origin}/robots.txt`, { ...opts, retries: 0 });
    robotsCache.set(u.origin, r);
  }
  const rb = robotsCache.get(u.origin);
  const verdict = robotsVerdict(rb.status, rb.body, cfg.userAgent, u.pathname + u.search);
  if (!verdict.allowed) return done('not fetched (robots.txt)', 'BLOCKED', null, `${verdict.rule}; needs manual check`);
  if (verdict.crawlDelay) await wait(Math.min(verdict.crawlDelay, 30) * 1000);

  const res = vendor.strategy === 'browser' ? await browser(url, opts) : await http(url, opts);
  if (res.error && !res.body) return done(res.error, res.error.startsWith('browser strategy unavailable') ? 'BLOCKED' : 'ERROR', null, res.error.startsWith('browser') ? `${res.error}; needs manual check` : `fetch failed: ${res.error}`);
  let parsed;
  try { parsed = parser.parse(res.body, { domain, target: vendor.targetCategory }); }
  catch (e) { return done('parser error', 'ERROR', null, `parser failed: ${e.message}`); }
  if (!parsed || !STATUSES.includes(parsed.normalized_status)) return done('parser error', 'ERROR', null, 'parser returned an invalid status');
  if (BLOCKING_HTTP.has(res.status) && parsed.normalized_status !== 'BLOCKED' && !['UNCATEGORIZED', 'PENDING', 'CATEGORIZED'].includes(parsed.normalized_status))
    return done(`HTTP ${res.status}`, 'BLOCKED', null, `HTTP ${res.status} (bot protection or rate limit); needs manual check`);
  return done(parsed.raw_status, parsed.normalized_status, parsed.current_category, parsed.note);
}

// options: { dryRun, force, vendors: [ids], domains: [..] }
export async function runAgent(cfg, { store, notifier, now = () => new Date(), log = () => {}, dryRun = false, force = false, vendors: only, domains, ...deps } = {}) {
  const state = store.readState(); state.entries ||= {};
  const results = [], skipped = [], notifications = [];
  const robotsCache = new Map();
  for (const vendor of cfg.vendors) {
    if (!vendor.enabled || (only && !only.includes(vendor.id))) continue;
    for (const domain of domains || cfg.domains) {
      const k = key(vendor.id, domain), prev = state.entries[k];
      const due = force || dryRun ? { due: true } : isDue(vendor, prev, now());
      if (!due.due) { skipped.push({ vendor: vendor.id, domain, reason: due.reason }); continue; }
      let result;
      try { result = await checkOne(vendor, domain, cfg, { ...deps, now, robotsCache }); }
      catch (e) { result = { vendor: vendor.id, domain, checked_at: now().toISOString(), raw_status: 'unexpected error', normalized_status: 'ERROR', current_category: null, target_category: vendor.targetCategory, target_reached: false, note: e.message }; }
      results.push(result);
      log(`${vendor.id.padEnd(10)} ${domain}  ${result.normalized_status}${result.current_category ? ` (${result.current_category})` : ''}${result.note ? `  · ${result.note}` : ''}`);
      if (dryRun) continue;
      const { next, notification } = decide(prev, result, { vendorName: vendor.name, blockedAlertAfter: cfg.blockedAlertAfter, manualCheckUrl: fillUrl(vendor.manualCheckUrl, domain) });
      if (notification) {
        const sent = await notifier.send(notification);
        const delivered = sent.some(s => s.delivered);
        notifications.push({ ...notification, vendor: vendor.id, domain, sent, delivered });
        if (!delivered) { // keep the old signature/flag so the alert is retried next run instead of being lost
          next.notified_signature = prev?.notified_signature; next.manual_check_alerted = prev?.manual_check_alerted || false;
        }
      }
      state.entries[k] = next;
    }
  }
  if (!dryRun) { store.appendHistory(results); state.updated_at = now().toISOString(); store.writeState(state); }
  return { results, skipped, notifications };
}
