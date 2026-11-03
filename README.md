# Robotics MENA website

Static site rebuilt from the Claude Design project "Robotics MENA" (v5 pages).
Every push to `main` deploys to Netlify automatically.

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

Useful URL options: `?lang=ar` (Arabic, right-to-left), `?theme=light|dark`.

Run locally: `python3 -m http.server` in this folder, then open http://localhost:8000.
