# Robotics MENA admin portal (phase 1)

A private web app for approving and publishing what the agents produce, starting agent runs and adding leads.
Plan and later phases: `docs/admin-portal/PLAN.md`.

## What phase 1 does

- **Approvals:** lists the open pull requests the agents create (`scan/`, `brief/`, `report/`, `data/` branches). Each
  item shows, record by record, what would be added, changed or removed in `data/*.json`, with sources linked.
  **Approve and publish** (squash-merges; the site deploys in ~2 minutes), **Send back** with a note (comment +
  `changes-requested` label) or **Reject** (comment + close).
- **Agent runs:** recent GitHub Actions runs; the owner can start the weekly scan (days back) or a web-filter check.
- **Add a lead:** a link + note becomes a GitHub issue labelled `lead` for the next research run.

## Security model

- **No password and no public admin page.** The portal is a Cloudflare Worker on its own `workers.dev` address.
  Cloudflare Access stands in front of it: only allow-listed people get past Google sign-in. The Worker then re-checks
  Access's signed token on every request (signature, issuer, audience, expiry) and refuses anything unsigned. If Access
  is not configured, every request fails (fail-closed).
- **Roles** come from the `ROLES` secret: `owner` (everything), `editor` (approve, send back, reject, add leads),
  `viewer` (read only). Unknown emails get a 403 even if they get through Access.
- **It cannot publish code.** Only agent branches targeting `main` that change nothing but `data/`, `media/` and
  `newsletter/` can be approved, and approval is pinned to the exact commit that was reviewed.
- **Secrets stay on the server** (GitHub App key, Access settings); the browser only talks to the Worker.
- Writes require same-origin JSON requests (cross-site requests are refused). Strict CSP with a per-request script
  nonce, no framing, `no-store` caching. Text from GitHub is always rendered as text.
- Every change is a GitHub merge, comment or issue attributed to the person's email, so GitHub is the audit log;
  approvals and runs are also written to the Worker's logs.

## Run it locally

```
node admin/dev-server.mjs --demo        # sample data, no accounts needed → http://localhost:8788
GITHUB_TOKEN=… node admin/dev-server.mjs  # against the real repo with your own token (careful: buttons act for real)
npm test                                # includes admin/test (node:test, no extra dependencies)
```

## One-time setup (owner, about 20 minutes)

All free plans. Nothing here touches the domain, the live site or email.

1. **Cloudflare account:** sign up at https://dash.cloudflare.com/sign-up.
2. **Zero Trust:** in the dashboard open *Zero Trust*, pick a team name (e.g. `roboticsmena`, giving
   `roboticsmena.cloudflareaccess.com`) and choose the **Free** plan (it may ask for a card; nothing is charged).
3. **Google sign-in:** *Zero Trust → Settings → Authentication → Login methods → Add new → Google* and follow the
   steps (create an OAuth client in Google Cloud with the redirect URL Cloudflare shows). Quick alternative: the
   built-in **One-time PIN** (a code sent by email); it can be switched to Google later.
4. **GitHub App:** https://github.com/settings/apps/new
   - Name `robotics-mena-admin`, Homepage URL `https://roboticsmena.com`, untick *Webhook → Active*.
   - Repository permissions: **Contents** read & write, **Pull requests** read & write, **Issues** read & write,
     **Actions** read & write, Metadata read-only. *Where can this app be installed:* only this account.
   - Create it, note the **App ID**, then *Generate a private key* (downloads a `.pem`).
   - *Install App* → only select repository `robotics-mena`. The number at the end of the page URL is the
     **installation ID**.
5. **Deploy the Worker** (Claude can do this step with a Cloudflare API token, or on your computer):
   `npx wrangler@4 deploy --config admin/wrangler.toml`. Note the `https://roboticsmena-admin.<account>.workers.dev` URL.
6. **Lock it with Access:** *Zero Trust → Access → Applications → Add an application → Self-hosted*. Domain: the
   `workers.dev` hostname above. Policy: *Allow*, *Emails* = your email (add others later). Session: 24 hours.
   Save, then copy the **Application Audience (AUD) tag**.
7. **Secrets:** in *Workers → roboticsmena-admin → Settings → Variables and secrets* (or `npx wrangler@4 secret put`):
   `ACCESS_TEAM_DOMAIN` (e.g. `roboticsmena.cloudflareaccess.com`), `ACCESS_AUD`, `ROLES`
   (e.g. `{"you@example.com":"owner"}`), `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY`
   (paste the whole `.pem`).
8. Open the URL, sign in with Google, and check that *Approvals* loads.

**Adding someone later:** add their email to the Access policy and to `ROLES` with `editor` or `viewer`.
**Removing:** delete it from both. **Rolling back entirely:** delete the Access application, the Worker and the GitHub App;
nothing else depends on them.

## Files

`src/index.mjs` (routes), `src/auth.mjs` (Access token check, roles, cross-site guard), `src/github.mjs` (GitHub App
token, API), `src/inbox.mjs` (approvals and record-level diff), `src/runs.mjs` (allowed workflows, leads),
`src/ui.mjs` (the page), `wrangler.toml` (Worker config, no secrets), `dev-server.mjs` (local preview), `test/`.
