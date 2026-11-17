# Phase 4: the admin portal

A private web app where the owner approves agent work from a phone: one Cloudflare Worker, no database, no
password. The scaffold copies it into `admin/` with its tests; `admin/README.md` there is the owner-facing
description. This file is what you need to adapt and deploy it.

## Why it is built this way

- **Not on the public site.** A static site can't keep a secret and a home-made login is the weakest link. The
  portal is a separate Worker on a `workers.dev` address, so the domain's DNS and email are never touched.
- **Identity by Cloudflare Access.** Only allow-listed emails get past the sign-in. The Worker then verifies
  Access's signed token on every request (signature, issuer, audience, expiry) and fails closed if Access isn't
  configured. Roles (`owner`, `editor`, `viewer`) come from the `ROLES` secret.
- **It cannot publish code.** A pull request is approvable only if it is open, targets `main`, comes from an agent
  branch, and changes only content folders; approval is pinned to the commit that was reviewed. Everything else
  says "review it on GitHub".
- **GitHub is the audit log.** Every action is a merge, comment, issue or commit attributed to the person's email.
- **Secrets stay in the Worker.** The browser only talks to the Worker; strict CSP, same-origin writes only.

## Tabs

Approvals (agent pull requests with a record-by-record preview; approve and publish, send back with a note,
reject) · Requests (ask Claude for work; becomes a labelled issue) · Backlog (`BACKLOG.md` by section; tick or
add) · Metrics (traffic, sign-ups, content growth, last deploy) · Schedule (each scheduled task: next run, last
result, missed runs, links) · Runs (GitHub Actions runs).

## Adapt points (small, but do them before deploying)

| File | What to change for a new project |
|---|---|
| `admin/src/inbox.mjs` | `AGENT_BRANCH` and `KIND`: the branch prefixes and their labels. `PUBLISHABLE_PATH`: the content folders a portal approval may touch. Keep both tight. |
| `admin/src/requests.mjs` | `KINDS`: the request types, each with a label, the minimum role and a hint. |
| `admin/src/metrics.mjs` | `databaseStats` and `getMetrics` read `data/companies.json`, `deployments.json`, `events.json` and `brief.json`: point them at this project's collections and rename the labels shown in `ui.mjs`. The web-filter panel reads `monitoring/categorization/state.json`; remove it if the monitor isn't used. |
| `admin/src/runs.mjs` | `WORKFLOWS`: which GitHub Actions workflows may be started from the portal. Leave empty unless there is one. Never list anything that bills. |
| `admin/src/ui.mjs` | Tab labels and wording that mention the old collections. Brand colours are already filled in. |
| `admin/dev-server.mjs` and `admin/test/*` | Demo data and fixtures use Robotics MENA-style records. They pass as they are; update the ones tied to code you change. |
| `admin/scheduled-tasks.json` | The project's tasks (see `agents.md`). Any IANA time zone works in `CRON_TZ=`. |
| `admin/README.md` | Rewrite the task table and remove parts the project doesn't have. |

Run `npm test` after each change and `npm run admin:demo` to look at it with sample data
(http://localhost:8788). `GITHUB_TOKEN=... node admin/dev-server.mjs` runs it against the real repository; the
buttons then act for real.

## Deploy

1. Owner step 5a first (Cloudflare account and Zero Trust team).
2. Deploy: `npx wrangler@4 deploy --config admin/wrangler.toml`. If the session has a Cloudflare connection,
   run it there (give wrangler a placeholder token if it insists on one; the connection supplies the real
   credential). Otherwise the owner runs it on their computer after `npx wrangler login`. Note the
   `https://<slug>-admin.<account>.workers.dev` address and give it to the owner for step 5b.
   Keep `preview_urls = false` in `wrangler.toml`: preview addresses would not be behind Access.
3. Owner steps 5b (Access application, AUD tag) and 5c (GitHub App, ids, private key).
4. Secrets on the Worker (`npx wrangler@4 secret put <NAME> --config admin/wrangler.toml`, the Cloudflare API, or
   the dashboard): `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ROLES`, `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID`, and
   `GITHUB_APP_PRIVATE_KEY`. You can set the first five from values the owner sends. The private key is pasted
   by the owner in the dashboard; it must never be sent through chat.
5. Check, with the owner: the address shows Cloudflare's sign-in, not the portal; after signing in, Approvals
   loads; an address from outside the allow-list is refused; a request with no Access token gets an error.
6. Optional metrics secrets, when the owner has done those steps: `GOATCOUNTER_TOKEN` (read-only) and
   `SHEET_STATS_URL` + `SHEET_STATS_KEY`. Set `GOATCOUNTER_SITE` as a plain variable if the code differs from
   the default.

Redeploy (step 2 again) whenever `admin/src/` changes; secrets are kept. The deploy workflow ignores `admin/`, so
portal changes never redeploy the site.

## Adding people, and rolling back

Add an email to both the Access policy and `ROLES` (`editor` can approve and add requests; `viewer` reads).
Remove from both to revoke. To remove the portal entirely, delete the Access application, the Worker and the
GitHub App: nothing else depends on them, and approvals fall back to merging pull requests on GitHub.

## If the repository becomes private

The portal keeps working (the GitHub App is installed on the repository), as do the scheduled tasks. GitHub Pages
on a private repository needs a paid GitHub plan. Check after switching: the next push deploys, Approvals lists
pull requests, the Schedule tab reads the run log.
