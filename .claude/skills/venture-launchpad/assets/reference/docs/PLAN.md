# Robotics MENA admin portal: plan (draft, 14 Nov 2026)

One private place to approve and publish data, run the research agents, and see traffic and sign-ups.

## Security decision: no admin page on the public site

A "hidden" page on roboticsmena.com would not be secure. The site is static (GitHub Pages): every file it serves can be
downloaded, the repository is readable, and anything secret in a page's code is public. A home-made username/password
login would also be the weakest link. So:

- **The public site stays read-only.** Nothing on roboticsmena.com can change data.
- **The portal is a separate app (first on a Cloudflare `workers.dev` address, later optionally `admin.roboticsmena.com`)**, and nobody reaches even its login page without first
  passing an identity gate run by a specialist provider (recommended: **Cloudflare Access**, free for small teams):
  - only the owner's identity is on the allow-list (Google or GitHub sign-in, with a passkey / hardware key as the
    second factor); there is **no portal password** to steal or brute-force;
  - short sessions, re-authentication before publishing, optional country / device rules;
  - the portal's backend re-checks the signed Access token on every request (defence in depth).
- **Secrets never reach the browser.** The backend (a Cloudflare Worker) holds the keys: a GitHub App limited to this one
  repository, the Kit key, the GoatCounter token, the Anthropic key, the Google Sheet endpoint.
- **Every change is a git commit or pull request.** That gives a full audit trail, previews before publishing and a
  one-click revert. The portal never edits the live site directly.

Alternatives considered: a password-protected page on the site (rejected: static, public code); GitHub as the portal
(works today through pull requests and the Actions tab, but is not a dashboard); a local app on the owner's laptop
(secure but not usable from a phone).

## What it does (phased)

**Phase 1: approvals inbox and publishing**
- One queue of everything waiting for a decision: the weekly scanner's pull requests, the Sunday brief draft, suggested
  X posts, research-report drafts, submissions and corrections sent through the site's forms.
- Each item shows the record as it will appear on the site, its sources (with a live "does this link still load"
  check), and what changes. Buttons: approve and publish, edit, send back with a note, reject.
- Ad-hoc push: paste a URL or a note ("Aramco signed with X") → an agent drafts the company/deployment record with
  sources → it lands in the queue for approval.
- History and one-click rollback of any publish.

**Phase 2: agent control room**
- Run on demand, with parameters, and watch progress: weekly scan (days, countries, robot types), deep research report
  (topic, depth), lead verification, source re-check (dead or moved links), logo/image finder (company press images
  only), Arabic copy check, categorization monitor.
- Each run shows status, sources found, cost estimate/actual, and produces a pull request, never a direct publish.
- Saved "playbooks", e.g. "every Friday: scan Saudi + UAE construction robotics, then draft the brief".
- Guard rails shown and enforced in one place: excluded countries, no defence makers (pending decision), no newspaper
  photos, no paywall or bot-block circumvention.

**Phase 3: audience and site health**
- Traffic from GoatCounter (views, top pages and records, referrers, countries, search terms used on the site).
- Waitlist / newsletter: sign-ups over time from the Google Sheet and Kit, export, unsubscribes, later open rates.
- Data health: stale records, missing logos or images, "new" flags expiring, broken source links, records without a
  primary source, policy dossier dates.
- Ops: last deploy, IndexNow pings, categorization monitor status, sitemap, uptime.

**Ideas for later**
- "What changed this week" digest generated for the owner on Monday morning.
- Lead pipeline board (found → verifying → ready → published / rejected) fed by every agent.
- Coverage map of gaps (countries × robot types with few records) that suggests the next scan.
- Duplicate and conflict detector (same company under two names, contradictory dates).
- Source quality score per outlet, so agents prefer primary sources.
- Sponsor / partner enquiries inbox from the Work-with-us form.
- Arabic and English side-by-side editor for record text.
- Mobile-first approvals (approve from the phone in two taps after the identity check).

## Architecture (proposed)

```
Owner (browser / phone)
   │  Cloudflare Access: allow-list of one identity + passkey
   ▼
admin.roboticsmena.com  — static UI (same brand tokens as the site)
   │  fetch /api/* with the Access token
   ▼
Cloudflare Worker (API) — verifies token, holds secrets, rate-limits, logs every action
   ├─ GitHub App (this repo only): read PRs/files, open/merge PRs, trigger workflows, revert
   ├─ GitHub Actions: scan.yml, weekly brief, research report, categorization monitor (existing)
   ├─ GoatCounter API (read)            ├─ Google Sheet web app (read sign-ups)
   └─ Kit API (subscribers, broadcasts) └─ Anthropic API (only through the existing workflows)
```

Agent runs stay in GitHub Actions (where the scanner already runs), so the portal only starts them and reads results.

## Decisions (14 Nov 2026)

**Where DNS lives (checked 14 Nov 2026):** GoDaddy (nameservers `ns47/ns48.domaincontrol.com`). The site points at GitHub
Pages (four A records, `www` CNAME to GitHub), and the domain's **email runs on Microsoft 365 through GoDaddy** (MX to
`roboticsmena-com.mail.protection.outlook.com`, GoDaddy SPF and the Microsoft tenant TXT record).

**Decision: do not move DNS.** Moving the nameservers to Cloudflare would be free and reversible, but it is the one step
that could interrupt email (every Microsoft 365 record GoDaddy manages would have to be copied exactly) and it buys
little: Cloudflare Access can protect a Worker on its own `*.workers.dev` address without the domain being on
Cloudflare. So v1 lives at a Cloudflare address such as `roboticsmena-admin.<account>.workers.dev`, protected by
Cloudflare Access. Nothing about the live site or email changes. A friendlier `admin.roboticsmena.com` can come later by
moving DNS (free; do it with an email checklist) and is a one-line change in the portal.

**Cost:** $0. Workers free plan (100,000 requests/day) and Cloudflare Zero Trust free plan (up to 50 users). Cloudflare
may ask for a card when Zero Trust is first enabled even on the free plan; nothing is charged unless a paid plan is chosen.

**Sign-in:** Google sign-in (the owner already uses Google for the sign-up Sheet; it works on phone and supports
passkeys), set up as an identity provider in Cloudflare Access. Fully reversible: the identity provider and the allowed
emails are settings in Cloudflare and can be swapped (e.g. to GitHub or one-time email codes) at any time.

**Other people later:** designed in from the start. Access lets in only listed emails; the portal maps each email to a role:
`owner` (everything, including running agents and secrets), `editor` (approve, edit and send back items; no agent
runs, no settings), `viewer` (dashboards only). Adding someone = add their email in Cloudflare and give them a role;
removing = delete it. Every action is logged with who did it. Emails are kept in Cloudflare/Worker settings, not in the
public repo.

**One-time setup the owner does (about 15 minutes, guided when we get there):** create a free Cloudflare account, enable
Zero Trust (free plan), add Google as a login method, and create a GitHub App for this repository (its key goes into the
Worker's secrets, never into the repo).

## Next steps

1. ~~Build phase 1 code (UI + Worker API + tests) in `admin/`~~ done 14 Nov 2026 (see `admin/README.md`).
2. Owner does the one-time Cloudflare and GitHub App setup, then deploy and lock down with Access.
3. Build phase 1 in a separate folder (`admin/`) with tests; nothing public changes.
4. Turn on the weekly scanner (README "To do") so the approvals inbox has real items.
