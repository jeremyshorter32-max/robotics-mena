# The site: architecture, wiring the design, capture, trust, plumbing

Contents: 1 Repository layout · 2 How a page is built · 3 Wiring Claude Design pages to data · 4 Data and the
validator · 5 Private preview · 6 Forms and the sign-up gate · 7 Trust pages · 8 Analytics and search plumbing ·
9 Checking in a browser · 10 Local commands

## 1. Repository layout (after the scaffold)

```
data/            the content: one JSON file per collection, site.json (settings), schema.json (rules)
pages/           one HTML file per page (from Claude Design); becomes /<name>
src/logic.js     page logic shared by every page
partials/        shared HTML: head-brand.html (icons, share image), password screen pieces, your own
brand/           logos, icons, share image, tokens (served at /brand/)
media/           images: logos/, and one folder per use, each with a SOURCES.md of credits
vendor/          local copies of third-party scripts (never a CDN)
static/          404.html, the IndexNow key file
scripts/         build-site.sh, assemble.cjs, validate-data.mjs, serve-site.py, indexnow.mjs, run-log.mjs
admin/           the admin portal (Cloudflare Worker), deployed separately
integrations/    google-sheets/ (form entries to a Sheet)
.claude/skills/  the routines the scheduled agents follow
.github/workflows/deploy.yml
BACKLOG.md  CLAUDE.md  LAUNCHPAD.md  launchpad.json  README.md
```

## 2. How a page is built

`scripts/build-site.sh` validates the data, then `scripts/assemble.cjs` writes each `pages/*.html` into `_site/`:

- `<script>/*@config {"page":"home"}*/</script>` becomes `window.SITE_PAGE` (that JSON) and `window.SITE_DATA`
  (every `data/*.json` by file name; each sub-folder of `data/` as a list, newest file name first; plus `builtAt`).
  Without the marker the data script is inserted before the page's first script. `<!--@no-data-->` leaves it out.
- `/*@logic*/` is replaced with `src/logic.js`.
- `<!--@partial:name-->` is replaced with `partials/name.html`.
- Every page gets `partials/head-brand.html`, a canonical link and Open Graph tags built from its own `<title>` and
  `<meta name="description">` (the build fails if either is missing, so every page has its own), and analytics.
- The home page gets Organization and WebSite structured data from `site.json` (`name`, `alt_name`, `logo`,
  `social`, and `search_url` such as `/database?q={search_term_string}` if the site has search).
- `sitemap.xml` lists every page not marked `noindex`; `static/404.html` becomes the not-found page.
- Local scripts and stylesheets get a content hash in their URL so returning visitors never run stale code.
- `site.json` keys reach the browser only if they are in the built-in public list or named in `site.public`.
  Put nothing secret in `data/` regardless: the repository may be public.
- `site.require_on_every_page` is a list of strings every indexable page must contain (Robotics MENA used it to
  guarantee the sign-up pop-up was on every page).

All data is embedded in every page. That is simple and fast up to a few hundred records. Past that, split: give
heavy pages their own data file fetched at runtime, and mark light pages `<!--@no-data-->`.

Addresses are root-relative (`/map`, `/brand/...`), which needs the custom domain. Until DNS is live, test locally
with `scripts/serve-site.py`, which serves clean URLs the way GitHub Pages does.

## 3. Wiring Claude Design pages to data

The aim is to keep the design pixel-for-pixel and change only where its content comes from.

**Always:**
- Name pages in lowercase; the home page is `pages/index.html`. Rewrite links between pages to clean root-relative
  addresses (`Projects.html` → `/projects`) and asset paths to root-relative ones (`../brand/logo.svg` →
  `/brand/logo.svg`).
- Keep the layout as designed, but fix real defects you find (overflow on phones, a font named but never loaded)
  with the smallest change, and note each under Decisions in `LAUNCHPAD.md`.
- Things the design promises but nothing delivers yet (an API link, "corrections are logged") stay visible during
  private preview and go into `BACKLOG.md` under "Must do before going public"; each is built or removed before
  launch.

**If the design is plain HTML with no script:** give each element that holds content an id, empty it, and fill it
from `window.SITE_DATA` in `src/logic.js` (one small render function per page, switched on
`window.SITE_PAGE.page`). Move the sample content into `data/*.json` with `"placeholder": true`.

**If the design ships its own runtime** (as Robotics MENA's did):
1. Copy each real page into `pages/<name>.html`. Copy the design's runtime scripts
   to the repository root and its libraries into `vendor/`. Change CDN script tags to the local copies and add
   `integrity` hashes. Keep Google Fonts links (or self-host the fonts in `brand/`).
2. Give each page a specific `<title>` and `<meta name="description">`, and add the `@config` marker in the head.
3. Find where the page defines its logic. Claude Design pages usually have a template (in Robotics MENA, an
   `<x-dc>` element) and a script holding a component class with the page's state and sample data. If several
   pages share the same class with small differences, move it to `src/logic.js` once and put `/*@logic*/` where each
   page had it; use `window.SITE_PAGE.page` for per-page differences. If pages are independent, leave their logic
   in place.
4. Replace hard-coded sample content with reads from `window.SITE_DATA`. Move the sample records into `data/*.json`
   as the first draft of the schema, each with `"placeholder": true`: the validator excuses a placeholder from
   the source rule, and a public build (`PUBLIC_LAUNCH=true`) fails while any remain.
5. Derive anything that can go stale from the data or `builtAt`: counts, "this week" labels, "new" badges (expire
   them a fixed number of days after `added`), dates in sample newsletters. Hard-coded dates were the most common
   bug found in Robotics MENA's pre-launch audit. Labels like "this week" come from the newest item's date, and
   anything relative to today ("new", "upcoming") is computed in the browser, since `builtAt` only moves on deploy.
6. Language and theme: remember the visitor's choice in `localStorage` under a project prefix and keep URLs clean.
   For a right-to-left language set `dir="rtl"` and use logical CSS properties; check number and plural agreement.
7. Replace design-time image placeholders with real, cleared images (Phase 2) or remove the slot.
8. Shared chrome (nav, footer, sign-up pop-up) belongs in a partial or the shared logic so a change lands everywhere.

Don't port the design to a framework or add a bundler. If the design runtime compiles templates in the browser and
that becomes a measurable speed problem after launch, add it to the backlog rather than solving it now.

## 4. Data and the validator

One JSON file per collection, each a list of records with a stable `id`, written with 2-space indentation so
diffs are readable. Conventions that paid off:

- `added: YYYY-MM-DD` on every record (drives "new" badges, growth metrics, and the portal's preview).
- A source on every record: `source` (name) and `source_url` (a page the agent opened).
- Translated text as `<field>` and `<field>_<lang>` (`title`, `title_ar`).
- Categories as short keys, never free text. Put the labels in a small data file (`data/statuses.json`:
  `[{ "id": "operating", "label": "Operating" }]`) and reference it with `refs`, so pages can show them;
  `schema.json` itself is not sent to the browser.
- Sub-folders (`data/briefs/2026-w47.json`) are read as a list named after the folder, by both the build and the
  validator. The portal's record-by-record preview covers top-level files only; a sub-folder file shows as a
  changed file.
- The portal's Metrics tab expects, until you edit it, `companies`, `deployments`, `events` and a `brief` list with
  a `date` on each item (`admin-portal.md`, adapt points).
- References by id or code (`country: "AE"`), checked against the referenced collection.
- Site paths for files (`/media/logos/<id>.png`) that must exist in the repository.
- A corrections log (`data/corrections.json`) if the site promises corrections.

`data/schema.json` expresses these per collection (`required`, `enums`, `dates`, `urls`, `refs`, `files`,
`translated`, `source`, `numbers`, `lists`, `banned`) plus `banned_terms` for text that must never appear (an old brand name, an
excluded subject). The header of `scripts/validate-data.mjs` documents every key. Rules that don't fit go in
`scripts/validate-extra.mjs` (`export default function (data, errors, { site, env }) {}`): coordinate ranges, a required image on
every featured item, date-matches-id checks, anything specific. Add a test for each custom rule.

When a rule is decided in conversation ("we don't list X"), put it in the validator the same day and in `CLAUDE.md`.
Instructions get forgotten; a failing build does not.

## 5. Private preview

`build-site.sh` refuses to build without one of: `SITE_PASSWORD` (encrypt every page; robots.txt disallows all),
`PUBLIC_LAUNCH=true` (public), or `DEV=1` (local only). So the site can't be published unprotected by accident.
The password screen is branded by `partials/password-head.html` and `password-logo.html`.

Tell the owner plainly: the password protects the pages, not `media/` files or the repository. Sensitive drafts
shouldn't be committed to a public repository before launch.

## 6. Forms and the sign-up gate

No backend. Each form does two things from the browser, and shows success as soon as the first resolves:

```js
// 1. Email to the inbox (and the visitor sees a result)
fetch(site.signup_url /* https://formsubmit.co/ajax/<address or alias> */, { method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ _subject: 'New sign-up · ' + where, email, signed_up_from: where, page: location.pathname }) });
// 2. A row in the Sheet (fire and forget; the Apps Script web app can't send CORS headers)
if (site.sheet_url) fetch(site.sheet_url, { method: 'POST', mode: 'no-cors', keepalive: true,
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify({ kind: 'signup', email, signed_up_from: where, page: location.pathname, consent, consent_at }) });
```

- `kind` picks the Sheet tab (`signup`, `submission`, `work`; edit `TABS` in `Code.gs` for other forms). New fields
  become new columns by themselves. Include a hidden honeypot field named `website_url_check`; the script drops
  entries that fill it.
- Always send where the sign-up happened (`signed_up_from`) and, if the sign-up is a subscription, the consent
  wording and time. The portal's metrics group sign-ups by source.
- If delivery fails, still unlock or thank the visitor, and show a fallback line with the contact address.
- Put a one-line privacy promise and a link to the privacy page beside every form.
- **Sign-up gate** (optional): show the opening of a report or archive, then an email box that unlocks the rest and
  is remembered in `localStorage`, so one sign-up unlocks everything. It is a soft wall: the content is in the
  page source. That is fine for lead capture; say so if the owner assumes it is private.
- Before the newsletter service exists, label every sign-up "Join the waitlist". The Sheet's sign-ups are imported
  later (`syncAllSignupsToKit` in `Code.gs`).

After the forms are live, send one test entry per form yourself (curl or the browser), ask the owner to click
FormSubmit's activation email, then confirm a row arrived in each Sheet tab.

## 7. Trust pages

Write these as real pages in the site's design, in every language:

- **Privacy** (`/privacy`): what is collected (emails, names, form text), why, each processor by name (FormSubmit,
  Google Sheets, the analytics tool, the newsletter service once connected, any embed that loads on click), how
  long it is kept, and how to be removed. Link it from every footer and beside each form. Don't name a legal entity
  or make legal claims the owner hasn't confirmed; flag the page for their review.
- **Editorial and corrections** (`/editorial`), if the site states facts: what gets listed, the sourcing standard,
  how to report an error, a corrections log rendered from `data/corrections.json` (an empty log saying "No
  corrections yet" is fine), and how to ask for an image to be removed.
- **Image credits:** a credit on every image, with a "Request removal" link that emails the contact address with
  the image and page filled in.
- **Submit** and **Work with us** forms, if the concept takes submissions or enquiries.

Remove any link, badge or claim the design shows for something that doesn't exist (an API, an About page, open
data licences). The audit in `launch.md` checks for these.

## 8. Analytics and search plumbing

All handled by the scaffold once the values exist:
- `site.goatcounter`: the GoatCounter code. Counting is switched off on any host but the live domain. To serve the
  counter script from the site itself, save GoatCounter's `count.js` as `vendor/goatcounter-count.js`.
- `site.indexnow_key`: make up a 32-character hex key, save a file `static/<key>.txt` containing just the key, and
  set the value. The deploy workflow then pings IndexNow after every deploy. Do this before launch; it starts
  working once the site is public.
- The Search Console verification tag goes in `partials/head-brand.html` and must stay there.
- Share image: `brand/social/og-image.png`, 1200×630, referenced by `head-brand.html`.
- `site.social`: `[{ "id": "linkedin", "name": "LinkedIn", "url": "https://..." }]` for live accounts only; feeds
  the structured data. Render footer links from the same list.

## 9. Checking in a browser

After any visible change, build, serve and look, using the preinstalled Playwright (`require('playwright')`,
`chromium.launch()`):
- every page loads with no console or page errors and no failed requests;
- each language, and each theme the design has;
- phone widths 320, 390 and 430: `document.documentElement.scrollWidth` equals the viewport width, text is at
  least 11px, tap targets aren't cramped;
- forms: submit with network calls intercepted, check the success and failure states;
- against a password build: fill `input[type=password]`, click `.staticrypt-decrypt-button`, and check the page
  appears.
Take screenshots and look at them; a page can pass every assertion and still be visibly broken.

## 10. Local commands

```bash
npm run build                      # validate + assemble into _site/ (no password)
npm run preview                    # build, then serve at http://127.0.0.1:8767 with clean URLs
npm run validate                   # data only
npm test                           # validator, run-log and admin portal tests
SITE_PASSWORD=test ./scripts/build-site.sh    # check the encrypted build
npm run admin:demo                 # the admin portal with sample data at http://localhost:8788
```
