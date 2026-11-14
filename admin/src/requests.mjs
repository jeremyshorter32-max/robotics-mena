// Requests for Claude: each becomes a GitHub issue labelled "agent-request". A scheduled Claude task (on the owner's
// Claude subscription, no API key) picks them up daily, does the work, and opens a pull request that appears under
// Approvals. Labels: request:<kind>, in-progress while Claude works, done/needs-info when it finishes.

export const KINDS = {
  lead: { label: 'Check a lead', role: 'editor', hint: 'A link to a company, deployment or event to verify and add' },
  fix: { label: 'Fix or update a record', role: 'editor', hint: 'Which record, what is wrong, and a source' },
  brief: { label: 'Change this week’s brief', role: 'editor', hint: 'What to change in the draft brief' },
  scan: { label: 'Run a focused scan', role: 'owner', hint: 'Countries, robot types or topics to search for, and how far back' },
  research: { label: 'Research report', role: 'owner', hint: 'Topic, company or deal for a Spotlight research report' },
  build: { label: 'Site or portal change', role: 'owner', hint: 'What to build or change; Claude opens a pull request you review on GitHub' },
};

export async function createRequest(gh, { kind, text, link, email }) {
  const k = KINDS[kind]; if (!k) throw Object.assign(new Error('Pick a request type'), { status: 400 });
  const t = String(text || '').replace(/\r/g, '').trim().slice(0, 4000);
  let url = '';
  if (link) { try { const u = new URL(String(link).trim()); if (!/^https?:$/.test(u.protocol)) throw 0; url = u.href; } catch { throw Object.assign(new Error('The link must start with https://'), { status: 400 }); } }
  if (!t && !url) throw Object.assign(new Error('Describe what you need'), { status: 400 });
  const first = (t.split('\n')[0] || new URL(url).hostname).slice(0, 90);
  const issue = await gh.post('/repos/{repo}/issues', {
    title: `[${k.label}] ${first}`,
    body: `${url ? `**Link:** ${url}\n\n` : ''}${t}\n\n---\n_Requested from the admin portal by ${email}. Claude's daily task picks this up, opens a pull request for approval, and comments here._`,
    labels: ['agent-request', `request:${kind}`],
  });
  return { number: issue.number, url: issue.html_url };
}

export async function listRequests(gh) {
  const items = await gh.get('/repos/{repo}/issues?labels=agent-request&state=all&per_page=40&sort=created&direction=desc');
  return items.filter(i => !i.pull_request).map(i => {
    const labels = (i.labels || []).map(l => (typeof l === 'string' ? l : l.name));
    const kind = (labels.find(l => l.startsWith('request:')) || 'request:other').slice(8);
    const status = i.state === 'closed' ? (labels.includes('needs-info') ? 'needs info' : 'done') : labels.includes('needs-info') ? 'needs info' : labels.includes('awaiting-approval') ? 'awaiting approval' : labels.includes('in-progress') ? 'in progress' : 'queued';
    return { number: i.number, title: i.title, kind, kindLabel: KINDS[kind]?.label || 'Request', status, comments: i.comments, created_at: i.created_at, closed_at: i.closed_at, url: i.html_url };
  });
}
