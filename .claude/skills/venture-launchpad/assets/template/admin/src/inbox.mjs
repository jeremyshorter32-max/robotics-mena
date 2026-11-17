// The approvals inbox: open pull requests produced by the agents (weekly scan, brief, research reports, data edits, social queue).
// The portal can only merge pull requests that (1) come from an agent branch, (2) target main and (3) change data and
// media only, so even a misused portal cannot publish code. Approval is tied to the exact commit that was reviewed.

export const AGENT_BRANCH = /^(scan|brief|report|data|social)\//;
export const PUBLISHABLE_PATH = /^(data|media|newsletter|social)\//;
const KIND = { scan: 'Weekly scan', brief: 'Weekly brief', report: 'Research report', data: 'Data edit', social: 'Social posts' };

export const kindOf = branch => KIND[(AGENT_BRANCH.exec(branch) || [])[1]] || 'Other';

const label = r => r && (r.name || r.title || r.code || r.id || r.url || '(unnamed)');
const keyOf = r => r && (r.id ?? r.code ?? r.url ?? JSON.stringify(r));
const brief = r => r && ({ key: String(keyOf(r)), label: String(label(r)), country: r.country || r.code || null, source: r.source_url || r.url || null, date: r.date || r.added || null });

// Record-level difference between two versions of a data file.
export function recordDiff(baseText, headText) {
  let a, b;
  try { a = baseText == null ? null : JSON.parse(baseText); b = headText == null ? null : JSON.parse(headText); }
  catch { return { kind: 'unparsed', added: [], removed: [], changed: [] }; }
  if (Array.isArray(a ?? []) && Array.isArray(b ?? [])) {
    const A = new Map((a || []).map(r => [String(keyOf(r)), r])), B = new Map((b || []).map(r => [String(keyOf(r)), r]));
    const added = [...B].filter(([k]) => !A.has(k)).map(([, r]) => ({ ...brief(r), record: r }));
    const removed = [...A].filter(([k]) => !B.has(k)).map(([, r]) => brief(r));
    const changed = [...B].filter(([k, r]) => A.has(k) && JSON.stringify(A.get(k)) !== JSON.stringify(r)).map(([k, r]) => {
      const old = A.get(k);
      const fields = [...new Set([...Object.keys(old), ...Object.keys(r)])].filter(f => JSON.stringify(old[f]) !== JSON.stringify(r[f]));
      return { ...brief(r), fields, before: Object.fromEntries(fields.map(f => [f, old[f]])), after: Object.fromEntries(fields.map(f => [f, r[f]])) };
    });
    return { kind: 'records', added, removed, changed };
  }
  const A = a || {}, B = b || {};
  const keys = [...new Set([...Object.keys(A), ...Object.keys(B)])];
  return { kind: 'object', added: keys.filter(k => !(k in A)).map(k => ({ key: k, label: k })), removed: keys.filter(k => !(k in B)).map(k => ({ key: k, label: k })),
    changed: keys.filter(k => k in A && k in B && JSON.stringify(A[k]) !== JSON.stringify(B[k])).map(k => ({ key: k, label: k, fields: [] })) };
}

export async function listInbox(gh) {
  const prs = await gh.get('/repos/{repo}/pulls?state=open&base=main&per_page=50&sort=created&direction=desc');
  return prs.map(p => ({ number: p.number, title: p.title, branch: p.head.ref, kind: kindOf(p.head.ref), agent: AGENT_BRANCH.test(p.head.ref),
    created_at: p.created_at, author: p.user?.login, draft: p.draft, url: p.html_url }));
}

export async function getItem(gh, number) {
  const p = await gh.get(`/repos/{repo}/pulls/${number}`);
  const files = await gh.get(`/repos/{repo}/pulls/${number}/files?per_page=100`);
  const problems = [];
  if (p.state !== 'open') problems.push('this pull request is not open');
  if (p.base.ref !== 'main') problems.push('it does not target main');
  if (!AGENT_BRANCH.test(p.head.ref)) problems.push(`branch "${p.head.ref}" is not an agent branch (scan/, brief/, report/, data/, social/)`);
  const outside = files.filter(f => !PUBLISHABLE_PATH.test(f.filename) || (f.previous_filename && !PUBLISHABLE_PATH.test(f.previous_filename)));
  if (outside.length) problems.push(`it changes files outside data/, media/, newsletter/ and social/ (${outside.map(f => f.filename).slice(0, 5).join(', ')}); review it on GitHub`);
  if (files.length >= 100) problems.push('it changes 100 or more files; review it on GitHub');
  if (p.draft) problems.push('it is still a draft');
  if (p.mergeable === false) problems.push('it has conflicts with main');
  const data = [];
  for (const f of files.filter(f => /^data\/[^/]+\.json$/.test(f.filename))) {
    const [before, after] = await Promise.all([f.status === 'added' ? null : gh.fileAt(f.previous_filename || f.filename, p.base.sha), f.status === 'removed' ? null : gh.fileAt(f.filename, p.head.sha)]);
    data.push({ file: f.filename, ...recordDiff(before, after) });
  }
  return {
    number: p.number, title: p.title, body: p.body || '', branch: p.head.ref, kind: kindOf(p.head.ref), head_sha: p.head.sha,
    created_at: p.created_at, url: p.html_url, files: files.map(f => ({ name: f.filename, status: f.status, additions: f.additions, deletions: f.deletions })),
    data, problems, approvable: problems.length === 0,
  };
}

const cleanNote = n => String(n || '').replace(/\r/g, '').trim().slice(0, 2000);

export async function approve(gh, number, { email, headSha }) {
  const item = await getItem(gh, number);
  if (!item.approvable) throw Object.assign(new Error('Cannot approve: ' + item.problems.join('; ')), { status: 409 });
  if (!headSha || headSha !== item.head_sha) throw Object.assign(new Error('This pull request changed since you opened it. Reload and review it again.'), { status: 409 });
  const r = await gh.put(`/repos/{repo}/pulls/${number}/merge`, { merge_method: 'squash', sha: item.head_sha,
    commit_title: `${item.title} (#${number})`, commit_message: `Approved in the admin portal by ${email}.` });
  await gh.post(`/repos/{repo}/issues/${number}/comments`, { body: `Approved and published from the admin portal by ${email}.` }).catch(() => {});
  return { merged: !!r?.merged, sha: r?.sha };
}

export async function sendBack(gh, number, { email, note }) {
  const n = cleanNote(note); if (!n) throw Object.assign(new Error('Say what should change.'), { status: 400 });
  await gh.post(`/repos/{repo}/issues/${number}/comments`, { body: `**Sent back from the admin portal by ${email}:**\n\n${n}` });
  await gh.post(`/repos/{repo}/issues/${number}/labels`, { labels: ['changes-requested'] }).catch(() => {});
  return { ok: true };
}

export async function reject(gh, number, { email, note }) {
  const n = cleanNote(note);
  await gh.post(`/repos/{repo}/issues/${number}/comments`, { body: `**Rejected from the admin portal by ${email}.**${n ? `\n\n${n}` : ''}` });
  await gh.patch(`/repos/{repo}/pulls/${number}`, { state: 'closed' });
  return { ok: true };
}
