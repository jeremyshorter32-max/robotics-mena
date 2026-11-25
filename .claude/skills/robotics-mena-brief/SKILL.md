---
name: robotics-mena-brief
description: Build the Robotics MENA weekly email body (a paste-ready HTML fragment for the Kit template) and its subject lines from a short weekly input file. Use when the owner asks for "the newsletter body", "the email for week NN", "the Kit body", or to regenerate or fix this week's brief email. Produces files only; never sends, schedules or publishes.
---

# Robotics MENA brief: Kit email body

This skill turns `newsletter/input/week-NN.md` into two files:

- `newsletter/out/week-NN-body.html`: a body fragment to paste into the `{{ message_content }}` cell of
  `newsletter/kit-template.html`. It contains no `html`, `head`, `body`, `style` or wrapper table.
- `newsletter/out/week-NN-subject.txt`: three subject options and one preview line.

It is separate from the `weekly-brief` skill, which drafts the five signals for the site and manages the Kit draft through the API. This
skill only writes files for a human to paste.

## STOP POINTS

**The skill NEVER sends, schedules or publishes anything. It only produces files. A human pastes them into Kit and sends.**
Do not call the Kit API, `scripts/newsletter.mjs draft|schedule`, or any other publishing tool from this skill.

## Styling contract (verbatim; the Kit template styles these elements, so the body uses element semantics only)

| Element | Renders as |
|---|---|
| `<h2>` | Signal headline: 26px, 600, -0.035em, ink #111216 |
| `<h3>` | Sub-head or section label: 20px |
| `<p><strong>TEXT</strong></p>` (strong is the only child) | Kicker: 11px, uppercase, 0.1em tracking, indigo #26246E |
| `<img src="...">` | Full-bleed image, auto width |
| The `<p>` immediately after an `<img>` | Photo credit: 12px, grey #8E90A0 |
| `<p><em>TEXT</em></p>` (em only child) | Small grey italic note, 12px |
| `<p><a href>TEXT</a></p>` (a only child) | Source link: 14px, indigo, underlined |
| `<hr>` | Section divider |
| `<ul>` / `<ol>` / `<li>` | Styled lists |
| `<blockquote>` or `<p class="blockquotes">` | Pull quote |
| `<a class="email-button">` | Button |

- No invented classes. The only classes allowed are `email-button` and `blockquotes`.
- No inline font or colour. Inline styles are allowed only for table structure if a row must be built.

## Brand tokens (verbatim)

| Token | Value |
|---|---|
| Indigo (primary) | #26246E |
| Deep indigo (frame) | #1B1A4E |
| Mid indigo | #3C3A7A |
| Periwinkle rule | #4A478F |
| Light periwinkle | #A9A7DE |
| Cream card | #F3F1EC |
| Ink text | #111216 |
| Grey (credits) | #8E90A0 |
| Footer grey | #A6A8BC |
| Gold accent (sparing) | #E6B54E |

- Type: IBM Plex Sans / IBM Plex Sans Arabic, falling back to Segoe UI, Helvetica, Arial.
- Logo: `https://roboticsmena.com/brand/icons/icon-512.png`.

## Voice (verbatim)

- Factual, compressed, sceptical of hype.
- Name the actor, place, date and number.
- Distinguish a signed MoU from a pilot from a live deployment.
- Never use "revolutionary", "game-changing" or "exciting". No exclamation marks.
- Attribute company claims as claims ("by the company's count", "company claim").
- British spelling.

House rules that also apply: Israeli companies and the Israeli flag never appear. No defence or weapons makers. When a post looks back at
an older item, say when it happened.

## Structure (in order)

1. **Week line and standfirst.** "Week NN · D–D Month YYYY" as a kicker, then a one-sentence standfirst (`<h3>`) naming the week's biggest theme.
2. **The Take.** About 70 words of editorial point of view, signed "— Robotics MENA" (`<p><em>`).
3. **By the numbers.** 3–4 figures in a list: companies tracked, deployments mapped, countries covered, events in the next 90 days, plus a
   standout figure. Values come from the input file, which must match the live data (`build` refuses a mismatch).
4. **This week's five signals.** For each: image, then credit line; kicker "NN · COUNTRY · DD MON YYYY"; `<h2>` headline, max 95 characters,
   with a concrete noun and ideally a number; takeaway of exactly 2 sentences (what happened; why it matters); source link
   "Source: Publication →". `<hr>` between signals.
5. **Spotlight.** About 120 words, a blockquote with attribution, and a link to the full analysis on roboticsmena.com.
6. **Policy watch.** 2–3 one-line items, each with a source link.
7. **On the calendar.** 3–5 items (event · city · dates) within the next 90 days.
8. **Also noted.** 4–6 one-liners, each with a linked source.
9. **Close.** A line pointing to the archive, map and database; the standing line (independent, ad-free, every item sourced to a named
   primary source); and "Forward this to someone tracking the region".

Template: `.claude/skills/robotics-mena-brief/assets/body.template.html`. `scripts/brief-body.mjs` fills it; do not hand-write the HTML.

## Email rules

- Every `<img>` has alt text and `width="504"` (the 600px card minus its padding), and is hosted on roboticsmena.com under `/media/brief/`.
- Under 100KB.
- No background images, flex, grid, position, JS or web fonts. No dark-mode CSS.
- No link shorteners (no t.co, bit.ly, lnkd.in); link straight to the primary source.
- Must read correctly with images blocked: never put information only in an image. Every fact in a photo is also in the text.

## INPUT: `newsletter/input/week-NN.md`

Plain text. `## Section` headings, `key: value` lines (one line each), and `- a | b | c` list items. `#` titles and `<!-- -->` comments are
ignored, wherever they sit (a comment after `key:` is not part of the value). Blank template bullets (`-  |  |`) are skipped.

**Start each week from `assets/week-template.md`** (copy it to `newsletter/input/week-NN.md`): it has every key, a comment on
each saying what goes there and where to copy it from, and the right number of blank list items. `newsletter/input/week-47.md` is a
complete filled example.

**Header (before the first `##`)**

| Key | Example | Notes |
|---|---|---|
| `week` | `47` | ISO week of the brief |
| `dates` | `16–22 November 2026` | Shown in the kicker after "Week NN ·" |
| `published` | `2026-11-23` | Send date; the 90-day event window and live counts run from here |
| `theme` | free text | The week's biggest theme (source material for the standfirst) |
| `standfirst` | one sentence | Written by the skill from `theme` |
| `take` | ~70 words | Written by the skill |

**`## By the numbers`**: 3–4 items `- VALUE | label`. Include the 4 stat values (companies tracked, deployments mapped, countries
covered, events in the next 90 days) plus a standout figure; two may share an item ("70 | deployments mapped in 12 countries").

**`## Signal 1` … `## Signal 5`** (exactly five)

| Key | Notes |
|---|---|
| `country` | Display name in the kicker: `UAE`, `Saudi Arabia`, `Oman`… |
| `iso` | ISO 3166 alpha-2 (`AE`, `SA`, `OM`) |
| `date` | `YYYY-MM-DD` (date of the event or announcement) |
| `facts` | Headline facts and the source material for the takeaway: actor, place, date, numbers, and whether it is an MoU, pilot or live |
| `headline` | ≤ 95 characters; written by the skill from `facts` |
| `takeaway` | Exactly 2 sentences; written by the skill from `facts` |
| `source` | Publication name, as shown after "Source:" |
| `url` | Primary source URL (https, not shortened) |
| `image` | `https://roboticsmena.com/media/brief/<file>.jpg` (must be live) |
| `alt` | What the image shows |
| `credit` | `Photo: <owner>`; mark illustrative images as such |

**`## Spotlight`**: `title`, `body` (~120 words), `quote`, `quote_by`, `url` (roboticsmena.com/spotlight?s=…).

**`## Policy watch`**: 2–3 items `- one line | Source name | https URL`.

**`## On the calendar`**: 3–5 items `- Event | City | Dates | https URL`, all within 90 days of `published`.

**`## Also noted`**: 4–6 items `- one line | Source name | https URL`.

**`## Subjects`**: exactly 3 items `- subject line` and a `preview: …` line.

## STEPS

1. **Read the input.** If `newsletter/input/week-NN.md` doesn't exist, copy `assets/week-template.md` there and fill it from the repo: the five signals from
   `data/briefs/<year>-wNN.json` (country, date, title, takeaway, source, source_url, image, image_credit); the Spotlight from the newest
   `data/stories.json` entry; policy from `data/policy.json` and official posts in `data/xposts.json`; events from `data/events.json`;
   also-noted from `data/deployments.json` entries dated in the week that aren't already signals. Get the live counts with
   `node scripts/brief-body.mjs stats <published>`. If the repo doesn't have this week's brief, ask the owner for the input data and stop.
2. **Validate the input.** Every signal has a primary-source URL, a live `/media/brief/` image (`curl -sI` returns 200), a credit and a date
   inside or just before the week. Company figures are marked as claims. MoUs, pilots and live services are named as what they are.
3. **Write the copy** into the input file: `standfirst`, `take`, each `headline` and `takeaway`, the Spotlight `body`, and the three
   subjects and preview, following the voice rules above.
   - Subjects: max 55 characters, no clickbait, leading with the most concrete fact.
   - Preview: max 90 characters, not repeating the subject.
4. **Generate the body and run the checks**: `node scripts/brief-body.mjs build newsletter/input/week-NN.md`. It validates the input,
   refuses stale "By the numbers" values, writes `newsletter/out/week-NN-body.html` and `newsletter/out/week-NN-subject.txt`, and prints
   the checklist. Fix the input and rebuild until every box is ticked. Missing fields are listed per section before anything is built.
   `--dry-run` does the same but writes to a temp folder (never `newsletter/out`) and reports stale numbers instead of stopping; use it
   to test the template or a half-filled input.
5. **Look at it.** Put the body into `newsletter/kit-template.html` in place of `{{ message_content }}`, screenshot it at 700px and 390px
   wide, and once with images blocked. Read the screenshots.
6. **Report** the checklist (below) with a tick or cross on each line, send the owner the body, subject file and
   `newsletter/out/week-NN-kit-prompt.txt` (SendUserFile), and commit the input and outputs to the working branch. Then stop.
   The owner pastes the kit-prompt into Claude in Chrome, which builds a Kit **draft** with the body in an HTML block on the Robotics MENA
   template and sends a test to the owner. The owner reviews the test and clicks Send in Kit themselves.

## VALIDATION CHECKLIST (run and report on before finishing)

`node scripts/brief-body.mjs check newsletter/out/week-NN-body.html newsletter/out/week-NN-subject.txt` runs all of these.

- [ ] no `<html>`/`<head>`/`<body>`/`<style>` tags in output
- [ ] every signal has exactly one h2, one kicker, one image, one credit p and one source p
- [ ] every `<a>` has an absolute https href; zero bare or placeholder hrefs
- [ ] every `<img>` has alt and width, and resolves to a roboticsmena.com URL (`build` also fetches each one and needs HTTP 200)
- [ ] no invented CSS classes outside email-button and blockquotes
- [ ] takeaways are exactly 2 sentences
- [ ] headlines are 95 characters or fewer
- [ ] file size is under 100KB
- [ ] no banned hype words
- [ ] subject is 55 characters or fewer, preview 90 or fewer, with no duplication

The script also checks that "By the numbers" matches the live data, and for unfilled placeholders (TODO, TBC, `[..]`), inline styles outside tables, exclamation marks, flex/grid/position/background images/scripts/web fonts and
Israeli content. The checker cannot judge tone or accuracy: re-read every line against its source before reporting.
