# {{PROJECT_NAME}}

{{TAGLINE}}

Static site hosted on GitHub Pages at https://{{DOMAIN}}. Every push to `main` runs the **Deploy site** GitHub Action,
which checks the data, builds the site and publishes it within a minute or two.

## How it is put together

- `data/*.json`: the content. Every page reads from these files, so one edit updates everything. `data/schema.json`
  says what each record must contain; `npm run validate` (and every build) enforces it, so a bad entry stops the
  deploy instead of breaking the live site. `data/site.json` holds the site's settings.
- `pages/*.html`: each page's layout (from the Claude Design project). `src/logic.js`: shared page logic.
  `partials/`: shared pieces. `brand/`: logos, icons, share image, tokens. `media/`: images.
- `scripts/build-site.sh`: checks the data, assembles the pages into `_site/`, then (during private preview)
  encrypts them behind the password.
- `admin/`: the private admin portal (approvals, requests, backlog, metrics, schedule): see `admin/README.md`.
- `.claude/skills/`: the routines the scheduled Claude tasks follow.
- `integrations/google-sheets/`: logs every form entry in a Google Sheet.

**Preview locally:** `npm run preview`, then open http://127.0.0.1:8767.

## Password protection (private preview)

Until launch, every page is encrypted behind a password screen (StatiCrypt) and search engines are told not to index it.
The password is the repository secret `SITE_PASSWORD`. To launch, replace that line in `.github/workflows/deploy.yml`
with `PUBLIC_LAUNCH: 'true'`. The password protects the website, not the repository or the files under `media/`.
