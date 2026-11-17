# Phase 2: seeding and maintaining content

The site's value is that a reader can trust every record. These are the rules Robotics MENA settled on, mostly after
finding out what goes wrong without them.

## Research method

1. **Split the territory and run agents in parallel.** For the first pass launch several research agents in one
   message, each with a slice (by country, sector or record type), today's date, the concept brief's scope rules,
   the exact record fields, and the rules below. Ask each to return records plus a list of what it rejected and why.
2. **Open every source.** A search snippet is a lead, not a source. Each fact is marked *verified* (page read in
   full) or *snippet-only*; only verified facts become records. Record the source name, URL and date.
3. **Prefer primary sources:** official releases, regulators, the organisation's own newsroom; credible press
   second. Use the organisation's own site alone only for what it is, never for claims about scale or results.
4. **Never invent, round up or tidy.** Flag company claims, projections, contract ceilings, single-source items and
   conflicting dates as what they are. A "TBC" is better than an invented date.
5. **Respect blocks.** If a page returns a bot check, paywall or 403, find another source. Never work around it.
   Note sources that block automated reading so the owner can check them by hand (registries often do).
6. **De-duplicate before adding:** search existing records by name and alternate spellings and transliterations.
7. **Second pass.** After the first pass, run another aimed at the gaps (thin categories, countries with few
   records), then re-check the thinnest existing records. Label records that rest on the organisation's own word
   ("Company-reported") or remove them.
8. **Keep a leads list** in `BACKLOG.md` under "Content and research": leads that are weak or blocked, with what
   would settle each. The weekly scan reads it.

Three solid records beat ten weak ones. Say so in every research prompt, or agents optimise for count.

## Record hygiene

- New records get `added: <today>`. If the site flags items as new, clear last period's flags in the same change.
- Every collection's records follow the existing ones exactly: same fields, same order, 2-space JSON.
- Run `npm run validate` after every batch; fix the data, never the rule, unless the rule is wrong.
- Decisions about scope made along the way ("not listing X", "country Y stays out") are recorded in `BACKLOG.md`
  with the date and who decided, and encoded in the validator.

## Images and logos

- **Only images you may use:** the organisation's own press or newsroom images, government media-office images, or
  the owner's own. **Never newspaper or agency photos**, even credited. Robotics MENA had to replace its
  highest-risk photos before launch; start with the rule instead.
- Credit every image where it appears and log it in a `SOURCES.md` beside the files (file, credit, source URL).
  Captions say when an image is a render or a composite.
- Prefer pictures of the thing itself over portraits.
- Resize before committing (for example 800×500 for cards, at most 1600px wide for heroes, JPEG quality about 82)
  with `python3 -I` and PIL. Trim letterbox bars.
- Logos: the organisation's own logo, trimmed and centred on a 256×256 tile, in `media/logos/<id>.png`. Records
  without one show initials or a name tile.
- If an item must have an image and none can be cleared, make a branded tile from the brand pack rather than
  borrowing a photo.

## Languages

- Write the second language as natural prose in that language, not a literal translation. Use its own quote marks
  and conventions; decide the digit style once.
- Fix one spelling for every name and one translation of the brand name, and add the rejected variants to
  `banned_terms` so they can't creep back.
- Check plural and number agreement wherever a count meets a noun, in the page logic as well as the data.
- Recommend a native-speaker read before launch and put it in the backlog; a model's read is not the same.
- Social and newsletter can start in one language even when the site has two. Record that choice.

## Editorial formats

- **Weekly brief:** a small fixed number of signals (Robotics MENA: five), each something that changed, with
  country, date, a one-or-two-sentence "why it matters", source and image. Archive each week's brief as its own
  file under `data/briefs/` so an archive page can list them; never edit old ones.
- **Long-form report:** one entry in a `stories` collection that a report page renders: chapters of blocks
  (paragraph, heading, quote, image, stats, list) and optional widgets (timeline, comparison, claims rated by how
  well they are evidenced, a watch list), sources numbered and cited, an opening chapter free and the rest behind
  the sign-up gate, plus PDF editions. `assets/reference/agent-skills/research-report/` has the full routine and
  field list; `assets/reference/scripts/report-pdf.cjs` renders the PDFs with Playwright.
- **Embeds from other platforms:** show hand-approved items as plain cards and load the platform's embed only on
  click (privacy). Keep them recent; let old ones drop off by date.
