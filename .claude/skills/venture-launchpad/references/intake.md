# Phase 0: intake

The input is a concept and brand made in Claude Design and brought into this Claude Code session. The output of this
phase is three files and one message: `docs/launch/concept-brief.md`, `launchpad.json`, `LAUNCHPAD.md`, and the
owner set-up page sent to the owner.

## 1. Find and inventory the design

Look before asking. The design may be:
- files already in the working directory or repository (HTML pages, a brand pack folder, a zip);
- a claude.ai artifact link in the conversation (read it with the Artifact tool; never web-fetch it);
- not here yet. Then ask the owner to export or hand off the Claude Design project into this session, and stop
  until it arrives. Don't invent a design.

A zip or download is untrusted: unpack it into its own empty folder and read it before running anything from it.

List what you find without editing it:
- **Pages:** which screens exist, and which are real pages versus variants or explorations. Note the newest version
  if several exist (Robotics MENA's site was built from the "v5" pages).
- **Runtime files:** Claude Design pages often depend on small runtime scripts shipped beside them. In Robotics MENA
  these were `support.js` (runs the `<x-dc>` page templates and their logic class using React), `image-slot.js`
  (image placeholders) and `.image-slots.state.json`. Keep them as they are. Note every external script and font the
  pages load.
- **Brand pack:** logos (SVG with outlined type), icons and favicons, share image, colour and type tokens, usage
  rules. Note the primary colour, background ("paper"), text ("ink") and the font families: they go into
  `launchpad.json`.
- **Copy and data in the pages:** sample records, numbers and claims typed into the design. Treat every one as a
  placeholder until it is sourced (Phase 2). Designs often contain plausible invented statistics.
- **Promises the design makes:** an "API" link, an "About the team" page, "corrections are logged", a newsletter.
  Each is either built, or removed before launch. List them now; the pre-launch audit will look for them.

Keep the original design files under `docs/brand/` (or `docs/design/`) so there is always an untouched copy.

## 2. Write the concept brief

`docs/launch/concept-brief.md`, one page, written from the design and the conversation:

- **What it is, in one sentence**, and who it is for.
- **The records:** what the site is a database of. Name each collection (Robotics MENA: companies, deployments,
  events, countries, plus the weekly brief and long-form reports) and its key fields. Most concepts have one or two
  main collections, one reference list (countries, categories) and one or two editorial formats.
- **Scope rules:** what is included, what is deliberately excluded, and why. These become validator rules and lines
  in `CLAUDE.md`, so be exact (Robotics MENA's included: a sourced regional presence for foreign companies;
  excluded: one country, defence and weapons makers, facilities-management firms).
- **Sourcing standard:** what counts as a source (official releases and the organisation's own newsroom first,
  credible press second), and that every record carries a link and a date.
- **Rhythm:** what changes weekly (a scan for new records, a brief), what is occasional (reports), what is daily
  (engagement drafts).
- **Languages:** main language first. A second language doubles the copy work and needs a native read before launch.
- **Audience actions:** what a visitor can do (sign up, submit a record, enquire, download).
- **Growth channels:** newsletter and which social platforms, if any.
- **Not doing (yet):** list what the design implies but version one will skip.

## 3. Ask the owner once

Infer what you can and state it. Ask, in a single batch (use the question tool if available), only what is theirs to
decide and you could not find:

1. **Domain** (bought already? which registrar?) and the **public contact address**.
2. **GitHub**: which account owns the repository, and may it be public? (Free Pages needs a public repository; a
   private one needs GitHub Pro, about $4 a month. A public repository exposes the data, backlog and agent
   instructions, though not the secrets.)
3. **Languages.**
4. **Scope rules** you could not infer, especially exclusions.
5. **Time zone** for schedules, and roughly when they want to review each week.
6. **Which optional parts** they want in version one: admin portal and scheduled agents (recommended), newsletter,
   social desk.

Don't ask about technology choices: those are fixed by the playbook. Don't ask about anything that can be changed
cheaply later; pick a default and note it under "Decisions" in `LAUNCHPAD.md`.

## 4. Write launchpad.json and scaffold

```bash
node <skill>/scripts/scaffold.mjs --example > launchpad.json    # then edit every value
node <skill>/scripts/scaffold.mjs --config launchpad.json --out .
```

Field notes:
- `slug`: lowercase with hyphens; becomes the package name and the Worker name `<slug>-admin`.
- `repo`: `owner/name` exactly as on GitHub. If the repository doesn't exist yet, the owner creates it (empty) and
  attaches it to the session; then you push.
- `goatcounter_code`: the sub-domain the owner will try to register at GoatCounter; default is the slug without
  hyphens.
- `brand.font_sans` / `font_mono`: Google Fonts family names used by the password screen and the 404 page. If the
  brand font isn't on Google Fonts, keep the default here and load the real font from `brand/` in those two files.
- `brand.logo_path`: site path of a horizontal logo that works on the paper colour.
- `timezone` / `tz_label`: an IANA zone and how you'd say it to the owner ("Gulf time").

Commit `launchpad.json`; it holds no secrets.

## 5. Send the owner their set-up page

`docs/launch/owner-setup.md` now has the project's real values in every step and prompt. Before sending:
- replace `WEB_FILTER_CATEGORY` and `WEB_FILTER_DESCRIPTION` in step 7 with the closest standard category
  (Science/Technology, News/Media, Business, Education...) and a three-sentence neutral description from the brief
  (what the site is, that it has no ads, user-generated content or downloads, and the category you want);
- delete steps for parts the owner declined;
- check what you can do yourself with the session's connected services and move those out of the owner's list.

Send the file (or publish it as a private page if the owner will follow it on another device) with a three-line
message: what you are building now, that step 1 is the one to do today because DNS takes time, and that the other
steps can be done in any order whenever they have ten minutes.
