#!/usr/bin/env node
// Local preview of the admin portal: node admin/dev-server.mjs [--demo] [--port 8788]
//   --demo   sample inbox data, no GitHub access needed
//   (no flag) uses GITHUB_TOKEN (a personal token) and GITHUB_REPO from the environment, read-only use recommended
// Signs you in as DEV_AUTH_EMAIL (default owner@localhost) with DEV_ROLE (default owner). Localhost only.
import http from 'node:http';
import { handle } from './src/index.mjs';
import fs from 'node:fs';
const local = p => { try { return fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'); } catch { return null; } };

const args = process.argv.slice(2), port = Number(args[args.indexOf('--port') + 1]) || 8788, demo = args.includes('--demo');
const email = process.env.DEV_AUTH_EMAIL || 'owner@localhost';
const env = { DEV_AUTH_EMAIL: email, ROLES: JSON.stringify({ [email]: process.env.DEV_ROLE || 'owner' }), GITHUB_REPO: process.env.GITHUB_REPO || 'jeremyshorter32-max/robotics-mena', GITHUB_TOKEN: process.env.GITHUB_TOKEN };

function demoGitHub() {
  const base = [{ id: 'kuka', name: 'KUKA', country: 'SA' }, { id: 'oldco', name: 'OldCo', country: 'AE' }];
  const head = [{ id: 'kuka', name: 'KUKA', country: 'SA', mena_countries: ['SA', 'AE'] },
    { id: 'aramco-robotics-lab', name: 'Aramco Robotics Lab', country: 'SA', source_url: 'https://www.aramco.com/en/news-media', added: '2026-11-16' },
    { id: 'ncr-drone', name: 'NCR Drone Services', country: 'QA', source_url: 'https://www.qna.org.qa/', added: '2026-11-16' }];
  const prs = [
    { number: 12, state: 'open', title: 'Weekly scan: new database entries (16 Nov 2026)', body: '2 new companies, 1 updated.\nAll sources opened and dated.', draft: false, mergeable: true, base: { ref: 'main', sha: 'b' }, head: { ref: 'scan/2026-11-16-1', sha: 'h12' }, html_url: '#', created_at: '2026-11-16T05:00:00Z', user: { login: 'scanner' } },
    { number: 13, state: 'open', title: 'Weekly brief: week 47', body: 'Five signals.', draft: false, mergeable: true, base: { ref: 'main', sha: 'b' }, head: { ref: 'brief/2026-w47', sha: 'h13' }, html_url: '#', created_at: '2026-11-16T06:00:00Z', user: { login: 'claude' } },
    { number: 14, state: 'open', title: 'Refactor map code', body: '', draft: false, mergeable: true, base: { ref: 'main', sha: 'b' }, head: { ref: 'feature/map', sha: 'h14' }, html_url: '#', created_at: '2026-11-15T06:00:00Z', user: { login: 'dev' } },
  ];
  const files = { 12: [{ filename: 'data/companies.json', status: 'modified', additions: 30, deletions: 2 }], 13: [{ filename: 'data/brief.json', status: 'modified', additions: 60, deletions: 60 }, { filename: 'media/brief/x.jpg', status: 'added', additions: 0, deletions: 0 }], 14: [{ filename: 'mena-map.js', status: 'modified', additions: 40, deletions: 12 }] };
  const ok = async () => ({});
  return {
    get: async p => { let m;
      if (p.startsWith('/repos/{repo}/pulls?')) return prs;
      if ((m = /^\/repos\/\{repo\}\/pulls\/(\d+)$/.exec(p))) return prs.find(x => x.number === +m[1]);
      if ((m = /^\/repos\/\{repo\}\/pulls\/(\d+)\/files/.exec(p))) return files[m[1]];
      if (p === '/repos/{repo}/contents/BACKLOG.md?ref=main') return { sha: 'demo', content: Buffer.from(local('BACKLOG.md') || '', 'utf8').toString('base64') };
      if (p.startsWith('/repos/{repo}/issues?labels=agent-request')) return [
        { number: 21, title: '[Check a lead] Aramco robotics lab in Dhahran', state: 'open', labels: [{ name: 'agent-request' }, { name: 'request:lead' }, { name: 'in-progress' }], comments: 1, created_at: '2026-11-15T09:00:00Z', html_url: '#' },
        { number: 20, title: '[Research report] Saudi humanoid deployments', state: 'open', labels: [{ name: 'agent-request' }, { name: 'request:research' }], comments: 0, created_at: '2026-11-15T08:00:00Z', html_url: '#' },
        { number: 18, title: '[Fix or update a record] KUKA HQ city', state: 'closed', labels: [{ name: 'agent-request' }, { name: 'request:fix' }], comments: 2, created_at: '2026-11-13T08:00:00Z', closed_at: '2026-11-14T08:00:00Z', html_url: '#' }];
      if (p.startsWith('/repos/{repo}/actions/runs')) return { workflow_runs: [{ id: 1, name: 'Deploy site', event: 'push', status: 'completed', conclusion: 'success', created_at: '2026-11-16T05:10:00Z', html_url: '#' }, { id: 2, name: 'Categorization monitor', event: 'schedule', status: 'completed', conclusion: 'success', created_at: '2026-11-16T05:17:00Z', html_url: '#' }, { id: 3, name: 'Weekly database scan', event: 'workflow_dispatch', status: 'in_progress', conclusion: null, created_at: '2026-11-16T06:00:00Z', html_url: '#' }] };
      throw Object.assign(new Error('not in demo'), { status: 404 }); },
    post: async p => (p === '/repos/{repo}/issues' ? { number: 101, html_url: '#' } : {}), put: async () => ({ merged: true, sha: 'demo' }), patch: ok,
    fileAt: async (path, ref) => (path === 'data/companies.json' && ref !== 'main' ? JSON.stringify(ref === 'b' ? base : head) : ref === 'main' ? local(path) : '[]'),
  };
}

const github = demo ? demoGitHub() : undefined;
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const r = new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
  const out = await handle(r, env, { github });
  res.writeHead(out.status, Object.fromEntries(out.headers)); res.end(Buffer.from(await out.arrayBuffer()));
}).listen(port, '127.0.0.1', () => console.log(`Admin portal preview: http://localhost:${port}/ (${demo ? 'demo data' : 'GitHub: ' + env.GITHUB_REPO}) as ${email}`));
