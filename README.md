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
