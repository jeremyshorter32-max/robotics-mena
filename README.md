# Robotics MENA website

Static site rebuilt from the Claude Design project "Robotics MENA" (v5 pages), hosted on GitHub Pages at https://roboticsmena.com.
Every push to `main` runs the **Deploy site** GitHub Action, which builds the site and publishes it within a minute or two.

## Pages

| Page | Layout | URL |
|---|---|---|
| Home / weekly brief | `pages/index.html` | `/` |
| Deployments map | `pages/map.html` | `/map` |
| Database: companies, deployments, countries, events | `pages/database.html` | `/database` (`?tab=companies\|deployments\|countries\|events&id=…` opens a record) |
| Policy & data | `pages/policy.html` | `/policy` (`?c=SA` etc. selects a country) |
| Events | `pages/events.html` | `/events` |
| Submit a record | `pages/submit.html` | `/submit` |
| Spotlight analysis (email-gated) | `pages/spotlight.html` | `/spotlight?s=<story id>` |

## How the site is put together

- `data/*.json`: **the database** (companies, deployments, events, countries) and `brief.json`, the home page's five signals (each with `image`, `image_credit` and `source_url`; images live in `media/brief/`, credits in `media/brief/SOURCES.md`). Every page reads from these files, so one edit updates the home stats, map, events, policy comparison and database at once.
- `src/logic.js`: the shared page logic (rendering, translations, search, the database page).
- `redirects/*.html`: small pages that forward old addresses (`/directory` now opens the database's Companies tab).
- `pages/*.html`: each page's layout. `@config` and `@logic` markers are filled in at build time.
- `scripts/build-site.sh`: checks the data, assembles the pages into `_site/`, then encrypts them behind the password (see below).
- `media/logos/`: square logo tiles for real organisations (sources in `media/logos/SOURCES.md`). Set an entry's `logo` to `/media/logos/<file>.png`; entries without one show their initials.
- `brand/` (served at `/brand/`), `favicon.ico`, `partials/`: brand pack v1.0 (Nov 2026): Datum Indigo #26246E, Paper #F3F1EC, Ink #111216; IBM Plex Sans, Plex Sans Arabic and Plex Mono; robot-arm logo lockups, favicons, app icons, share image and tokens (`brand/README.md`). Design sources in `docs/brand/`; the previous identity is archived in `docs/brand-archive-v2/`. `media/brand/robotics-mena-brand-kit.zip` is the downloadable kit.
- `support.js`, `mena-map.js`, `image-slot.js`, `vendor/`: runtime, map, image placeholders, and local copies of React, D3, topojson and the world map.

Language and theme are remembered in the visitor's browser, so links stay clean. Old-style links (`?lang=ar`, `index.html#top`) still work and are tidied in the address bar.

**Preview locally:** `npm run build` (no password), then serve `_site/` with any static server that maps `/map` to `map.html`.

## Spotlight analysis pieces

`data/stories.json` holds the long-form pieces linked from the home Spotlight. Each has `id`, `title`, `dek`, `hero`, `body` blocks (`p`, `h`, `quote`, `img`, `stats`, `list`, each with `en`/`ar`), `sources` and `related`. Readers see the opening blocks (`gate_after`), then an email box that unlocks the rest. Images live in `media/spotlight/` (credits in `media/brief/SOURCES.md`).

**New reports:** in a Claude Code session on this repo, ask for a research report on a topic (or type `/research-report <topic>`). The skill in `.claude/skills/research-report/` runs the research, writes the bilingual report data, adds the providers to the directory, makes the PDFs, tests and publishes. The newest report (first in `data/stories.json`) is the one shown on the home page Spotlight.

**PDF edition:** `npm install`, then `node scripts/report-pdf.cjs <story id>` writes branded English and Arabic PDFs to `media/reports/`. Readers download them from the report once unlocked. Re-run it whenever the report data changes.

**Preview locally:** `python3 scripts/serve-site.py _site` serves a build with clean URLs.

**Collecting emails and submissions:** the site has no backend, so it relays them through [FormSubmit](https://formsubmit.co) to `contact@roboticsmena.com`, set in `data/site.json` (`contact_email`, `signup_url` for the Spotlight gate and newsletter box, `form_url` for the Submit page). Each sign-up arrives as an email titled "New sign-up · …" with the address and where they signed up; each submission arrives as "New submission · …" with every field. FormSubmit needs a one-time activation: the first time anyone submits, it emails contact@roboticsmena.com a confirmation link, and nothing is delivered until that link is clicked. To also log every entry in a Google Sheet (one tab per form, with Status and Notes columns), follow [integrations/google-sheets/README.md](integrations/google-sheets/README.md) and put the web app URL in `data/site.json` as `sheet_url`. To switch to a mailing-list service later (Mailchimp, Buttondown, etc.), replace `signup_url` with its form endpoint. The gate still unlocks instantly even if delivery fails; the Submit page shows a fallback asking people to email contact@roboticsmena.com directly.

## Database entries

Each record type has a fixed set of fields. Categories must be one of the keys the site already knows (`SECTORS`, `TYPES`, `CATS`, `STAGES`, `ETYPES` in `src/logic.js`), and countries must be in `data/countries.json`.
**International suppliers:** companies headquartered outside MENA are listed when they have a concrete, sourced presence in the region (a deployment, contract, official pilot or local operation). Their records add `hq` (ISO country code), `hq_city`, `mena_countries` (every MENA country they're active in), and a `mena_link` ({en, ar}: one or two dated sentences on why they belong here) with `mena_source`, `mena_source_url` and `mena_date`. `country` stays their main MENA market. The database shows them with an "International" label, an Origin filter and a "Link to MENA" panel; flags for headquarters countries live in `media/flags/` (flag-icons, MIT).
`npm run validate` checks everything. It also runs on every build, so a bad entry stops the deploy instead of breaking the live site.

## Weekly scanner (automatic new entries)

`.github/workflows/scan.yml` is built and tested offline, but **not switched on yet** (see To do). Once set up, it runs every Monday at 04:23 UTC and can also be run by hand from the Actions tab.

1. **Research:** Claude (`claude-opus-5-5`) searches the web and reads articles about MENA robotics from the past week, in English and Arabic.
2. **Extract:** a second call turns the findings into entries that must match the database schema exactly.
3. **Merge:** `scripts/scan.mjs` drops anything that's a duplicate, has no source link, is outside the region, or is a past event. It then writes the new entries to `data/`.
4. **Review:** the workflow opens a pull request listing every new entry with its source. Merge it to publish, edit the `data/` files on the branch first, or close it to discard.

Setup (one time): add an `ANTHROPIC_API_KEY` repository secret, and allow Actions to open pull requests (Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests").
Test the merge step offline: `node scripts/scan.mjs --from-file findings.json`.
If Claude declines a request for policy reasons, the scanner uses the API's server-side fallback (`fallbacks: "default"`).

## Categorization monitor (web filters)

Work networks block sites their web filter hasn't categorised. After roboticsmena.com was submitted to the filter vendors
(see `docs/launch/web-filter-submissions.md`), `.github/workflows/categorization-monitor.yml` re-checks each vendor's
**public** lookup and alerts when the status changes, above all when the site reaches the target category.

**It is read-only.** It never submits or re-submits a categorization, never fills in or submits a form, never clicks
anything and never tries to solve a captcha or "verify you're human" check. Plain requests are GET only; in the
headless-browser strategy every non-GET request the vendor page tries to make is aborted. It honours `robots.txt`
(including `Crawl-delay`), sends a descriptive User-Agent, makes one lookup per vendor per domain per run, and retries
transient failures (network errors, 429, 5xx) with jittered back-off. `test/catmon/safety.test.mjs` enforces this.

**What to expect from the three v1 vendors (checked live on 14 Nov 2026):**

| Vendor | Automatic result today | Why |
|---|---|---|
| Fortinet | `BLOCKED`, needs manual check | its `robots.txt` has `Disallow: /*?*`, which covers the `webfilter?q=` lookup |
| Symantec / Broadcom | `BLOCKED`, needs manual check | the result is only fetched by the page's own POST after a human check; the read-only guard never sends it |
| McAfee / Trellix | `BLOCKED`, needs manual check | the site (and its `robots.txt`) answers automated clients with 403 |

So for now the monitor mainly records a dated history and, after `blockedAlertAfter` (3) blocked runs in a row, sends
**one** "please check manually" alert per vendor with the link. If a vendor opens up (robots rule removed, bot wall
dropped, a public read-only endpoint appears), the parsers already read the result pages and the alerts work as designed.

**Running it**

```
npm run catmon -- --check-once      # check every enabled vendor now and print; saves nothing, sends nothing
npm run catmon -- --status          # latest saved state + manual-check links (no network)
npm run catmon                      # what the schedule runs: due vendors only, saves history, notifies on change
npm run catmon -- --force --vendor fortinet --domain roboticsmena.com,example.org
npm test                            # parser, robots, agent and safety tests (node:test, no extra dependencies)
```

Behind the sandbox proxy, Node's `fetch` needs `NODE_USE_ENV_PROXY=1` (not needed on GitHub Actions).

**Statuses.** Each check is saved as a `CheckResult` (`vendor, domain, checked_at, raw_status, normalized_status,
current_category, target_category, target_reached, note`), where `normalized_status` is `UNCATEGORIZED`, `PENDING`,
`CATEGORIZED`, `BLOCKED` or `ERROR`. A parser that meets an unfamiliar page returns `ERROR` ("layout may have changed")
rather than guessing a category, and a parser crash only affects its own vendor.

**Files**
- `monitoring/categorization/config.json`: domains, vendors, cadence and notification channels (validated on load).
- `monitoring/categorization/history.jsonl`: every check, append-only. `state.json`: latest state per vendor and domain,
  seeded with the manual baseline of 14 Nov 2026 so a matching first result does not alert.
- `scripts/catmon/`: `run.mjs` (CLI), `agent.mjs` (the run), `decide.mjs` (cadence, change detection, de-duplication),
  `fetch.mjs`, `robots.mjs`, `notify.mjs`, `store.mjs`, `vendors/<id>.mjs` (one parser per vendor).

**Schedule.** The workflow runs at 05:17 and 17:17 UTC. Each vendor is checked when due: Fortinet every 12 h, the others
every 24 h, and weekly once the target category is reached (`afterTargetCadenceHours`; set it to `null` to stop).
Results are committed to `monitoring/`, which the Deploy site action ignores.

**Notifications** (only on a change, never twice for the same state; an alert that no channel delivered is retried next run):
- email to contact@roboticsmena.com through the FormSubmit relay the site's forms already use (no secret). After switching
  FormSubmit to its random alias, put the alias URL in the `CATMON_FORMSUBMIT_ENDPOINT` secret;
- a GitHub issue labelled `categorization` (GitHub emails you about it);
- optionally Slack or any incoming webhook: add the URL as the `CATMON_WEBHOOK_URL` secret.

**Adding a vendor**
1. Add an entry to `vendors` in `config.json`: `id`, `name`, `enabled`, `module`, `strategy` (`http` or `browser`),
   `lookupUrl` and `manualCheckUrl` (use `{domain}`), `targetCategory`, `cadenceHours`, `afterTargetCadenceHours`,
   `requiresLogin`, `notes`.
2. Add `scripts/catmon/vendors/<id>.mjs` exporting `parse(html, { domain, target })` that returns
   `{ raw_status, normalized_status, current_category, note }`, register it in `vendors/index.mjs`, and add fixtures and
   tests under `test/catmon/`. No other code changes are needed.

Palo Alto, Cisco Talos and Check Point are listed but disabled: their lookups need a login, which v1 does not support
(the config refuses `enabled: true` with `requiresLogin: true`). Zscaler and Netskope are customer-only and left out.
The `browser` strategy uses Playwright if it is installed; it is not a project dependency, so on GitHub Actions the
Symantec check records "browser strategy unavailable" (same outcome as the human check it would meet anyway).

## Admin portal

A private app for approving agent output, starting agent runs and adding leads: see `admin/README.md` (security model,
local demo with `npm run admin:demo`, one-time Cloudflare and GitHub App setup) and `docs/admin-portal/PLAN.md`.

## To do

- [ ] **Switch on the weekly scanner.**
  1. Create a Claude API key at https://console.anthropic.com/settings/keys (add billing if asked).
  2. Save it as the repository secret `ANTHROPIC_API_KEY` (Settings → Secrets and variables → Actions).
  3. Settings → Actions → General → Workflow permissions: tick "Allow GitHub Actions to create and approve pull requests", then Save.
  4. Do a first run by hand: Actions → Weekly database scan → Run workflow (try `days` = 30). Review the pull request it opens.
  5. Turn on the weekly schedule: in `.github/workflows/scan.yml`, remove the `#` from the two `schedule` lines.

  Estimated cost: roughly $1–3 per weekly run (web searches plus reading articles).

## Password protection (private preview)

While in private preview, every page, including the database contents, is encrypted behind a password screen (StatiCrypt), and search engines are told not to index it.

- **Public since 13 Nov 2026:** the Deploy site action builds with `PUBLIC_LAUNCH=true` (no password, search engines allowed, sitemap at /sitemap.xml).
- **Back to private:** set `SITE_PASSWORD` as a repository secret and replace `PUBLIC_LAUNCH: 'true'` in `.github/workflows` with `SITE_PASSWORD: ${{ secrets.SITE_PASSWORD }}`; the build then encrypts every page again.
- The source files and `data/` in this repo are readable on GitHub while the repo is public. The password protects the website, not the repo.

`CNAME` holds the custom domain. `.nojekyll` tells GitHub Pages to serve files as-is.
