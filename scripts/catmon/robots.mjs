// Minimal robots.txt support (RFC 9309): user-agent groups, Allow/Disallow with * and $, longest match wins,
// Allow wins ties, plus Crawl-delay. Unreachable files follow the conservative rules in robotsVerdict().

export function parseRobots(txt) {
  const groups = []; let cur = null, lastWasAgent = false;
  for (const line of String(txt).split(/\r?\n/)) {
    const m = /^\s*([a-z-]+)\s*:\s*(.*?)\s*(?:#.*)?$/i.exec(line); if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2];
    if (key === 'user-agent') { if (!cur || !lastWasAgent) { cur = { agents: [], rules: [], crawlDelay: null }; groups.push(cur); } cur.agents.push(val.toLowerCase()); lastWasAgent = true; continue; }
    lastWasAgent = false; if (!cur) continue;
    if (key === 'allow' || key === 'disallow') { if (val || key === 'allow') cur.rules.push({ allow: key === 'allow', path: val }); }
    else if (key === 'crawl-delay') { const n = Number(val); if (Number.isFinite(n)) cur.crawlDelay = n; }
  }
  return groups;
}

function groupFor(groups, ua) {
  const token = ua.toLowerCase().split('/')[0];
  return groups.find(g => g.agents.some(a => a !== '*' && token.includes(a))) || groups.find(g => g.agents.includes('*')) || null;
}

const toRegex = p => new RegExp('^' + p.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*').replace(/\\\$$/, '$'));

export function isAllowed(groups, ua, urlPathAndQuery) {
  const g = groupFor(groups, ua); if (!g) return { allowed: true, crawlDelay: null, rule: null };
  let best = null;
  for (const r of g.rules) {
    if (r.path === '') continue;
    if (toRegex(r.path).test(urlPathAndQuery) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  }
  return { allowed: !best || best.allow, crawlDelay: g.crawlDelay, rule: best ? `${best.allow ? 'Allow' : 'Disallow'}: ${best.path}` : null };
}

// status = HTTP status of robots.txt (0 = network error).
export function robotsVerdict(status, body, ua, urlPathAndQuery) {
  if (status >= 200 && status < 300) return isAllowed(parseRobots(body), ua, urlPathAndQuery);
  if (status === 401 || status === 403) return { allowed: false, crawlDelay: null, rule: `robots.txt returned ${status} (bot protection); not fetching` };
  if (status >= 400 && status < 500 && status !== 429) return { allowed: true, crawlDelay: null, rule: null }; // no robots.txt
  return { allowed: false, crawlDelay: null, rule: `robots.txt unavailable (${status || 'network error'}); not fetching this run` };
}
