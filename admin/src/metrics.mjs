// Metrics: site traffic (GoatCounter), waitlist sign-ups (Google Sheet, counts only), database growth, the weekly
// brief, deploys and web-filter status. Every source is optional and fails on its own without breaking the rest.

const day = d => d.toISOString().slice(0, 10);
export function isoWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z'); if (isNaN(d)) return null;
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - (d.getUTCDay() || 7)));
  const w = Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, '0')}`;
}
const lastWeeks = (n, now) => Array.from({ length: n }, (_, i) => isoWeek(day(new Date(now - (n - 1 - i) * 7 * 864e5))));
const safe = async fn => { try { return await fn(); } catch (e) { return { error: e.message } } };

export function databaseStats({ companies = [], deployments = [], events = [] }, now = Date.now()) {
  const weeks = lastWeeks(8, now);
  const per = rows => weeks.map(w => ({ week: w, count: rows.filter(r => r.added && isoWeek(r.added) === w).length }));
  const recent = [...companies.map(r => ({ kind: 'Company', label: r.name, added: r.added, country: r.country })),
    ...deployments.map(r => ({ kind: 'Deployment', label: r.title, added: r.added, country: r.country }))]
    .filter(r => r.added).sort((a, b) => b.added.localeCompare(a.added)).slice(0, 8);
  const upcoming = events.filter(e => (e.date || e.start || '') >= day(new Date(now))).length;
  return { totals: { companies: companies.length, deployments: deployments.length, events: events.length, upcomingEvents: upcoming },
    weekly: { companies: per(companies), deployments: per(deployments) }, recent };
}

async function goatcounter(env, fetchImpl, now) {
  if (!env.GOATCOUNTER_TOKEN) return { configured: false };
  const base = `https://${env.GOATCOUNTER_SITE || 'roboticsmena'}.goatcounter.com/api/v0`;
  const get = async (path, q) => {
    const r = await fetchImpl(`${base}${path}?${new URLSearchParams(q)}`, { headers: { Authorization: `Bearer ${env.GOATCOUNTER_TOKEN}`, 'Content-Type': 'application/json' } });
    if (!r.ok) throw new Error(`GoatCounter ${path}: HTTP ${r.status}`); return r.json();
  };
  const end = day(new Date(now)), d7 = day(new Date(now - 7 * 864e5)), d30 = day(new Date(now - 30 * 864e5));
  const [t7, t30, hits, refs, locs] = await Promise.all([
    safe(() => get('/stats/total', { start: d7, end })), safe(() => get('/stats/total', { start: d30, end })),
    safe(() => get('/stats/hits', { start: d30, end, limit: 10 })), safe(() => get('/stats/toprefs', { start: d30, end, limit: 8 })),
    safe(() => get('/stats/locations', { start: d30, end, limit: 8 }))]);
  const list = j => (j && (j.stats || j.hits) || []).map(x => ({ name: x.name || x.title || x.path || x.id || '(direct)', path: x.path, count: x.count ?? x.count_unique ?? 0 }));
  const daily = (t30.stats || []).map(s => ({ day: s.day, count: s.daily ?? s.count ?? 0 }));
  return { configured: true, visits7: t7.total ?? null, visits30: t30.total ?? null, daily, pages: list(hits), referrers: list(refs), countries: list(locs),
    errors: [t7, t30, hits, refs, locs].filter(x => x && x.error).map(x => x.error) };
}

async function signups(env, fetchImpl) {
  if (!env.SHEET_STATS_URL || !env.SHEET_STATS_KEY) return { configured: false };
  const r = await fetchImpl(`${env.SHEET_STATS_URL}?${new URLSearchParams({ action: 'stats', key: env.SHEET_STATS_KEY })}`, { redirect: 'follow' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.error || `Sheet HTTP ${r.status}`);
  return { configured: true, ...j.stats };
}

export async function getMetrics(gh, env, { fetchImpl = fetch, now = Date.now() } = {}) {
  const json = async p => { const t = await gh.fileAt(p, 'main'); return t ? JSON.parse(t) : null; };
  const [db, brief, monitor, runs, traffic, waitlist] = await Promise.all([
    safe(async () => databaseStats({ companies: await json('data/companies.json') || [], deployments: await json('data/deployments.json') || [], events: await json('data/events.json') || [] }, now)),
    safe(async () => { const b = await json('data/brief.json') || []; const newest = b.map(x => x.date).sort().pop(); return { items: b.length, newest, week: newest ? isoWeek(newest) : null }; }),
    safe(async () => { const s = await json('monitoring/categorization/state.json'); return Object.entries(s?.entries || {}).map(([k, e]) => ({ vendor: k.split('|')[0], status: e.normalized_status, category: e.current_category, target: e.target_category, reached: !!e.target_reached, checked: e.checked_at, note: e.note })); }),
    safe(async () => { const j = await gh.get('/repos/{repo}/actions/runs?per_page=30&branch=main'); const d = (j.workflow_runs || []).find(r => r.name === 'Deploy site'); return { lastDeploy: d ? { status: d.status, conclusion: d.conclusion, at: d.created_at, url: d.html_url } : null }; }),
    safe(() => goatcounter(env, fetchImpl, now)),
    safe(() => signups(env, fetchImpl)),
  ]);
  return { database: db, brief, monitor, deploys: runs, traffic, waitlist, generated: new Date(now).toISOString() };
}
