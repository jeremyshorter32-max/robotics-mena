// Notification channels. Each send() resolves to { channel, ok, detail } and never throws.
//  console       prints the message (always on; does not count as "delivered" for de-duplication)
//  email         FormSubmit AJAX relay to the inbox the site's forms already use (no secret needed;
//                set CATMON_FORMSUBMIT_ENDPOINT to the FormSubmit random-alias URL once it exists)
//  github-issue  opens an issue in this repository (GitHub emails watchers); needs GITHUB_TOKEN in Actions
//  webhook       Slack-compatible incoming webhook ({ text }); URL from a secret, skipped when unset

export function makeNotifier(channels, { env = process.env, fetchImpl = fetch, log = console.log } = {}) {
  const senders = channels.map(ch => async n => {
    try {
      if (ch.type === 'console') { log(`\n[notify] ${n.subject}\n${n.text}\n`); return { channel: 'console', ok: true, delivered: false, detail: 'printed' }; }
      if (ch.type === 'email') {
        const endpoint = (ch.endpointEnv && env[ch.endpointEnv]) || `https://formsubmit.co/ajax/${ch.to}`;
        const r = await fetchImpl(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ _subject: `[Robotics MENA monitor] ${n.subject}`, _template: 'box', _captcha: 'false', name: 'Categorization monitor', message: n.text }) });
        // FormSubmit answers 200 with { success: "false", message } when it refuses (e.g. address not activated).
        const j = await r.json().catch(() => ({}));
        const ok = r.ok && String(j.success) !== 'false';
        return { channel: 'email', ok, delivered: ok, detail: `HTTP ${r.status}${j.message ? ' · ' + j.message : ''}` };
      }
      if (ch.type === 'github-issue') {
        const token = env[ch.tokenEnv], repo = env[ch.repoEnv];
        if (!token || !repo) return { channel: 'github-issue', ok: false, delivered: false, detail: 'skipped (no token/repo; runs only in GitHub Actions)' };
        const r = await fetchImpl(`https://api.github.com/repos/${repo}/issues`, { method: 'POST',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: n.subject, body: '```\n' + n.text + '\n```\n_Opened automatically by the categorization monitor._', labels: ch.label ? [ch.label] : [] }) });
        return { channel: 'github-issue', ok: r.ok, delivered: r.ok, detail: `HTTP ${r.status}` };
      }
      if (ch.type === 'webhook') {
        const url = env[ch.urlEnv];
        if (!url) return { channel: 'webhook', ok: false, delivered: false, detail: `skipped (${ch.urlEnv} not set)` };
        const r = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: `*${n.subject}*\n${n.text}` }) });
        return { channel: 'webhook', ok: r.ok, delivered: r.ok, detail: `HTTP ${r.status}` };
      }
      return { channel: ch.type, ok: false, delivered: false, detail: 'unknown channel' };
    } catch (e) { return { channel: ch.type, ok: false, delivered: false, detail: e.message }; }
  });
  return { async send(n) { return Promise.all(senders.map(s => s(n))); } };
}
