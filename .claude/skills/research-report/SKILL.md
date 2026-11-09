---
name: research-report
description: Research, write and publish a new Robotics MENA research report (the interactive, email-gated Spotlight report at /spotlight, plus branded English and Arabic PDFs). Use when the user asks to "run a research report", "do a new report/spotlight/deep dive" on a company, deployment, deal or trend, or invokes /research-report with a topic or link.
---

# Robotics MENA research report

Turns a topic (a link, a company, a deal, an event) into a published report:
- an interactive report page at `/spotlight?s=<id>`: email-gated, bilingual, with chapters and widgets;
- the home-page Spotlight block (it always shows the newest report);
- downloadable branded PDFs (`media/reports/<id>-en.pdf` and `-ar.pdf`);
- directory records for every provider the report profiles.

Everything is data: one entry in `data/stories.json`. The page (`pages/spotlight.html` + `src/logic.js`) and the PDF script (`scripts/report-pdf.cjs`) render whatever is there. Don't edit the layout for a new report unless the user asks for a design change.

The first report, `gecko-adnoc-raptor` in `data/stories.json`, is the reference example: copy its structure, tone and level of sourcing. `template.json` in this folder lists every field.

## 0. Scope the brief

The topic is in the user's message (`$ARGUMENTS` if invoked as `/research-report <topic>`). If there is no topic at all, ask for one. Otherwise don't ask; pick the angle yourself and say what you chose. Tell the user the plan in two lines and start.

## 1. Research (parallel agents)

Launch 2–3 `general-purpose` agents in one message, each with a different slice. Give each the full context: today's date, that this is for Robotics MENA (robotics and physical AI in the Middle East and North Africa), and the rules below. Typical slices:
1. **The core story:** every outlet covering it (English and Arabic: The National, Khaleej Times, Gulf News, Arabian Business, Zawya, WAM, Al Khaleej, Al Ittihad, Emarat Al Youm, Attaqa, Asharq), company press releases, and trade press. Get exact quotes, numbers, dates and named people.
2. **Context and history:** prior deals and deployments by the same operator or vendor, plus the market and policy background, with numbers.
3. **Providers and images:** for each robotics provider involved, its HQ, founding year, what it makes, its exact role, website, and logo. For images, 4–6 usable photos (official press images or article og:images) with the exact credit, downloaded into the scratchpad.

Rules to put in every research prompt:
- Mark each fact **verified** (page read in full) or **snippet-only**. Give source name, URL and date for every fact.
- Never invent or "round up" numbers. Flag company claims, projections, contract ceilings, single-source items and conflicting dates.
- Do not get around paywalls or bot blocks. If DuckDuckGo blocks, use Bing or Google News RSS. Skip hosts the network refuses.
- Prefer photos of robots and sites over portraits. Note whether an image is a render or composite.

## 2. Plan the report

- **Angle:** a clear argument in the Robotics MENA voice (independent, evidence-led, willing to push back). The title states the argument.
- **Chapters:** 5–7 chapters (`report.chapters`). The first chapter is the free teaser (`gate_after: 1`); make it strong. The last chapter is always **About the providers** (`{"t":"w","w":"providers"}`). Include a verdict chapter ("Our view") with one `lead` paragraph, and a "What we're watching" chapter.
- **Widgets:** place them inside chapter `blocks` as `{"t":"w","w":"<name>"}`. Each is optional except providers; use those the material supports:
  - `compare`: two side-by-side cards (e.g. hype vs reality, two approaches). Mark the robotics one `"physical": true`.
  - `attacks`: a dated event log plus a progress gauge (`now`/`target`). Rename it via `ui.attacks` (e.g. "Rollout log", "Funding log") to suit the topic.
  - `timeline`: clickable milestones (`date` as YYYY, YYYY-MM or YYYY-MM-DD; `future: true` for upcoming). Use 6–12 points.
  - `fleet`: robots/systems with `status` (live, deploying, delivered, due, ordered, trial). Set `co` to a company id to link to the directory.
  - `claims`: each headline number rated `level` 1–4 (1 company claim, 2 single source or projection, 3 documented with caveats, 4 reported by several outlets) with "what we found".
  - `watch`: open items. Add `due` (YYYY-MM-DD) only when there is a real deadline; it drives a countdown.
- **Glance:** 4 headline figures (`report.glance`, integers that count up; use `pre`/`suf` for units). **Findings:** 4 key findings.
- Every `src` is a 1-based index into `sources`. Every number in the text must trace to a source.

## 3. Write the data

1. Copy `template.json` (and the whole `ui` object from the existing report) into a new entry at the **top** of `data/stories.json`. The first entry is what the home page and `/spotlight` show.
2. Write every string in English **and** Arabic (Modern Standard Arabic, natural, not literal; Arabic quote marks «»; keep Latin digits). Use British English. Plain words, short sentences, no hype.
3. Add the `home` block (see the existing report): kicker, title, dek, quote, who, 3 stats, src line, img, cap and credit. The home Spotlight renders it.
4. **Images:** save to `media/spotlight/<descriptive-name>.jpg`. Resize to at most 1600px wide, JPEG quality ~82, using `python3 -I` with PIL. Trim letterbox bars. The hero should be landscape. Portrait images get `"maxw": "380px"`. Add a row per image to `media/brief/SOURCES.md` (file, credit, source URL). Captions must say if an image is a render.
5. **Providers:** every provider in `report.providers` must exist in `data/companies.json`. Add missing ones following the existing records, e.g. `gecko-robotics`, `taurob`:
   - set `country` to their main MENA market, `hq` to the real headquarters (ISO code) with `hq_city`, and `mena_countries` to every MENA country they're active in;
   - for international companies (HQ outside MENA) add `mena_link` {en, ar}, one or two dated sentences on why they belong in a MENA directory, plus `mena_source`, `mena_source_url` and `mena_date`. Add the HQ flag to `media/flags/<cc>.svg` from flag-icons if it's missing;
   - use a valid category (arm, amr, av, drone, humanoid, inspection, marine, service, medical, construction, agri, software, integrator, education; optional `secondary` from the same list; the list lives in `CATS` in `src/logic.js`) and stage (seed, a, b, growth, corp);
   - add a logo at `media/logos/<id>.png`: official logo, trimmed and centred on a white 256×256 tile, plus a row in `media/logos/SOURCES.md`.
6. Add `related` links (directory records, deployments, `/map`), and `pdf` paths `/media/reports/<id>-en.pdf` and `/media/reports/<id>-ar.pdf`.
7. Optionally add a deployment record to `data/deployments.json` if the story is a new deployment and it isn't there yet.

Run `npm run validate`. It checks the report: required fields, Arabic present, images exist, source numbers in range, providers in the directory, and statuses known. Fix everything it reports.

## 4. Make the PDFs

```bash
npm install            # once per session, for pdf-lib
node scripts/report-pdf.cjs <id>            # writes media/reports/<id>-en.pdf and -ar.pdf
```
It needs Playwright Chromium (preinstalled) and Google Fonts access. Review it, don't just generate it:
```bash
pdftoppm -r 40 -png media/reports/<id>-en.pdf /tmp/<scratch>/pg   # then tile and look at every page
```
Check that the cover isn't overflowing, no image or card is split badly, the Arabic is right-to-left and readable, and there are no empty pages. Re-run after any data change, because the PDF is a snapshot.

## 5. Build and test in a browser

```bash
SITE_PASSWORD=testpass123 ./scripts/build-site.sh
python3 scripts/serve-site.py _site 8767 &      # restart it after every build (the build deletes _site)
```
With Playwright (`require('playwright')`): unlock the password screen (fill `input[type=password]`, tick the remember checkbox, click `.staticrypt-decrypt-button`), then check:
- **Locked:** `/spotlight?s=<id>` shows the cover, glance, findings, chapter 1 and the `#gate` form; the PDF button says "Unlock to download".
- **Unlocked:** after submitting an email, all chapters show. Click a timeline point, a fleet filter and card, a claim card, and open the lightbox (arrow keys, Escape). The PDF link returns 200.
- **Variants:** Arabic (nav button "العربية"), dark theme, and a 390px-wide phone with no horizontal scroll (`document.documentElement.scrollWidth === 390`).
- **Other pages:** the home Spotlight shows the new story and links to it; the providers' "View in directory" links open the right records.
- **Errors:** no page errors. Only `{{ … }}` placeholder 404s are expected.

Screenshot each and look at them before publishing.

## 6. Publish

Commit on `main` (author: the repo owner, as in recent commits) with the attribution lines from the session's system reminder, then `git push origin main`. The Deploy site action publishes in about a minute. Check it with `gh run list -L1`.

## 7. Report back to the user

Lead with the link (`https://roboticsmena.com/spotlight?s=<id>`) and the report's argument in one line. Then:
- what's in it (chapters and widgets);
- the PDFs;
- providers added to the directory;
- anything single-source, unverified, conflicting or rights-sensitive (photos belong to their owners).

Keep it short and plain.

## Notes

- Emails from the gate are only stored in the reader's browser until a sign-up endpoint is set in `data/site.json` (`signup_url`). Mention it if the user asks about sign-ups.
- The site is password-protected during private preview, but `media/` files (images, PDFs) and the repo itself are public. Mention this if a report is sensitive before launch.
- Older reports stay reachable at `/spotlight?s=<their id>`.
- Israeli companies are not listed on this site, and the Israeli flag is not used. The validator and the scanner reject them (`EXCLUDED_COUNTRIES` in `scripts/lib/taxonomy.mjs`).
