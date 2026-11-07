# Robotics MENA website

Static site rebuilt from the Claude Design project "Robotics MENA" (v5 pages), hosted on GitHub Pages at https://roboticsmena.com.
Every push to `main` runs the **Deploy site** GitHub Action, which builds the site and publishes it within a minute or two.

## Pages

| Page | Layout | URL |
|---|---|---|
| Home / weekly brief | `pages/index.html` | `/` |
| Deployments map | `pages/map.html` | `/map` |
| Company directory | `pages/directory.html` | `/directory` |
| Database (search every record) | `pages/database.html` | `/database` (`?tab=companies\|deployments\|countries\|events&id=…` opens a record) |
| Policy & data | `pages/policy.html` | `/policy` (`?c=SA` etc. selects a country) |
| Events | `pages/events.html` | `/events` |
| Submit a record | `pages/submit.html` | `/submit` |

## How the site is put together

- `data/*.json`: **the database** (companies, deployments, events, countries). Every page reads from these files, so one edit updates the home stats, map, directory, events, policy comparison and database at once.
- `src/logic.js`: the shared page logic (rendering, translations, search, the database page).
- `pages/*.html`: each page's layout. `@config` and `@logic` markers are filled in at build time.
- `scripts/build-site.sh`: checks the data, assembles the pages into `_site/`, then encrypts them behind the password (see below).
- `support.js`, `mena-map.js`, `image-slot.js`, `vendor/`: runtime, map, image placeholders, and local copies of React, D3, topojson and the world map.

Language and theme are remembered in the visitor's browser, so links stay clean. Old-style links (`?lang=ar`, `index.html#top`) still work and are tidied in the address bar.

**Preview locally:** `npm run build` (no password), then serve `_site/` with any static server that maps `/map` to `map.html`.

## Database entries

Each record type has a fixed set of fields. Categories must be one of the keys the site already knows (`SECTORS`, `TYPES`, `CATS`, `STAGES`, `ETYPES` in `src/logic.js`), and countries must be in `data/countries.json`.
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

- **Password:** the `SITE_PASSWORD` repository secret (Settings → Secrets and variables → Actions). Change it there, then re-run the Deploy site action.
- **Launch publicly:** add a repository *variable* `PUBLIC_LAUNCH` = `true` (same settings page, Variables tab), then re-run the action.
- **Safety:** if `SITE_PASSWORD` is missing and `PUBLIC_LAUNCH` isn't `true`, the deploy fails instead of publishing unprotected.
- The source files and `data/` in this repo are readable on GitHub while the repo is public. The password protects the website, not the repo.

`CNAME` holds the custom domain. `.nojekyll` tells GitHub Pages to serve files as-is.
