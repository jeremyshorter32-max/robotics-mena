# Robotics MENA website

Static site rebuilt from the Claude Design project "Robotics MENA" (v5 pages).
Hosted on GitHub Pages at https://roboticsmena.com. Every push to `main` runs the **Deploy site** GitHub Action, which publishes it within a minute or two.

## Password protection (private preview)

While in private preview, every page is encrypted behind a password screen (StatiCrypt) and search engines are told not to index it.

- **Password:** the `SITE_PASSWORD` repository secret (Settings → Secrets and variables → Actions). Change it there, then re-run the Deploy site action.
- **Launch publicly:** add a repository *variable* `PUBLIC_LAUNCH` = `true` (same settings page, Variables tab), then re-run the action.
- **Safety:** if `SITE_PASSWORD` is missing and `PUBLIC_LAUNCH` isn't `true`, the deploy fails instead of publishing unprotected.
- The source files in this repo are readable on GitHub while the repo is public; the password protects the website, not the repo.

Build locally: `SITE_PASSWORD=test ./scripts/build-site.sh` (output in `_site/`).

| Page | File | URL |
|---|---|---|
| Home / weekly brief | `index.html` | `/` |
| Deployments map | `map.html` | `/map` |
| Company directory | `directory.html` | `/directory` |
| Policy & data | `policy.html` | `/policy` |
| Events | `events.html` | `/events` |
| Submit a record | `submit.html` | `/submit` |

- `support.js` — small runtime that renders the pages (uses React from `vendor/`).
- `mena-map.js` — the D3 map used on Home and Map.
- `image-slot.js` — image placeholders (e.g. the spotlight photo on Home).
- `vendor/` — local copies of React 18.3.1, D3 7.9.0, topojson-client 3.1.0, world-atlas 2.0.2, Babel standalone 7.29.0.

`CNAME` holds the custom domain; `.nojekyll` tells GitHub Pages to serve files as-is.

Useful URL options: `?lang=ar` (Arabic, right-to-left), `?theme=light|dark`.

Run locally: `python3 -m http.server` in this folder, then open http://localhost:8000.
