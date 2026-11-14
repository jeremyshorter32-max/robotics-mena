// Agent runs (GitHub Actions) and leads. Only the workflows listed here can be started from the portal, each with
// validated inputs and a minimum role.

export const WORKFLOWS = {
  'scan.yml': { name: 'Weekly database scan', role: 'owner', inputs: { days: v => { const n = Number(v ?? 7); if (!Number.isInteger(n) || n < 1 || n > 60) throw new Error('days must be 1–60'); return String(n); } } },
  'categorization-monitor.yml': { name: 'Categorization monitor', role: 'owner', inputs: { force: v => (v ? 'true' : 'false') } },
};

export async function listRuns(gh) {
  const j = await gh.get('/repos/{repo}/actions/runs?per_page=20&branch=main');
  return (j.workflow_runs || []).map(r => ({ id: r.id, name: r.name, event: r.event, status: r.status, conclusion: r.conclusion, created_at: r.created_at, url: r.html_url }));
}

export function workflowInputs(file, raw = {}) {
  const wf = WORKFLOWS[file];
  if (!wf) throw Object.assign(new Error('This workflow cannot be started from the portal'), { status: 404 });
  const inputs = {};
  try { for (const [k, fn] of Object.entries(wf.inputs)) inputs[k] = fn(raw[k]); } catch (e) { throw Object.assign(e, { status: 400 }); }
  return { wf, inputs };
}

export async function startRun(gh, file, raw) {
  const { inputs } = workflowInputs(file, raw);
  await gh.post(`/repos/{repo}/actions/workflows/${file}/dispatches`, { ref: 'main', inputs });
  return { started: true };
}

// A lead (URL + note) becomes a GitHub issue labelled "lead" for the next scan or research run to pick up.
export async function addLead(gh, { url, note, email }) {
  let u;
  try { u = new URL(String(url || '').trim()); } catch { throw Object.assign(new Error('Enter a full link starting with https://'), { status: 400 }); }
  if (!/^https?:$/.test(u.protocol)) throw Object.assign(new Error('Only web links (http/https) are accepted'), { status: 400 });
  const n = String(note || '').replace(/\r/g, '').trim().slice(0, 2000);
  const issue = await gh.post('/repos/{repo}/issues', { title: `Lead: ${u.hostname}${n ? ' · ' + n.split('\n')[0].slice(0, 80) : ''}`,
    body: `**Link:** ${u.href}\n\n${n ? `**Note:** ${n}\n\n` : ''}_Added from the admin portal by ${email}._`, labels: ['lead'] });
  return { number: issue.number, url: issue.html_url };
}
