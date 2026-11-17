# Phase 5: audit, launch and the first week

## 1. Pre-launch audit

Do this as a reader, not as the builder. `assets/reference/docs/2026-11-10-editorial-audit.md` is the audit that
was run on Robotics MENA: use its shape (Must fix / Should fix / Nice to have, each item with where, what and
the fix).

Method: build, serve, and with Playwright read the visible text of **every page in every language**, and open a
sample of every kind of record. Save the text dumps in the scratchpad and read them. Look for:

- **Broken promises:** links that go nowhere or to the wrong page; pages the footer mentions that don't exist;
  claims about things not built (an API, open data, a team page, "corrections are logged" with no log).
- **Stale or hard-coded copy:** dates, week labels, counts and "new" flags typed into the layout instead of
  derived from data; sample-issue dates; "watch this event" phrasing that expires.
- **Unsourced or inflated claims:** every number on the site traces to a record or a source.
- **Scope rules:** nothing excluded appears, in either language, in pages or data.
- **Raw values leaking:** ISO dates, keys, `undefined`, untranslated strings, placeholder text, empty filters.
- **Second-language quality:** agreement, mixed scripts, one spelling per name, direction of punctuation.
- **Images:** every one credited and cleared; none from news agencies.
- **Behaviour:** unknown query parameters show a notice instead of a blank page; forms succeed and fail gracefully.
- **Phones:** 320, 390 and 430 wide, no horizontal scroll, readable badges, usable sheets and menus.
- **Accessibility basics:** contrast of buttons and muted text, focus outlines, alt text, reduced-motion respected.

Write the audit to `docs/audits/<date>-prelaunch-audit.md`, fix the must-fix items, and put the rest in
`BACKLOG.md`.

## 2. Launch checklist

Site side (you):
- [ ] `sitemap.xml`, public `robots.txt`, branded 404, canonical and share tags, a description on every page
- [ ] Share image renders in a link preview (1200×630)
- [ ] Analytics code set and counting on the live domain only
- [ ] IndexNow key file and `indexnow_key` set
- [ ] Forms tested end to end; FormSubmit activated; Sheet receiving
- [ ] Privacy and editorial pages published and linked
- [ ] All tests and the build pass; no console errors on any page

Owner side:
- [ ] Custom domain resolves; "Enforce HTTPS" ticked
- [ ] Portal reachable and locked; first agent pull request approved through it
- [ ] Has read the audit summary

## 3. Taking the password off

1. List every open `BACKLOG.md` item, grouped by its section, and ask the owner which to finish before launch.
   They may defer all of them; record that with the date.
2. Only on the owner's explicit instruction: in `.github/workflows/deploy.yml` replace the
   `SITE_PASSWORD: ${{ secrets.SITE_PASSWORD }}` line with `PUBLIC_LAUNCH: 'true'`, commit, push.
3. After the deploy: open the live site logged out, check robots.txt allows crawling and the sitemap loads, check
   the IndexNow step's status in the workflow log (200 or 202), and view a page's source for the analytics tag.
4. Update `CLAUDE.md`, `README.md` and `LAUNCHPAD.md` to say the site is public since that date. Suggest deleting
   the `SITE_PASSWORD` secret.

To go private again: restore the `SITE_PASSWORD` line and secret.

## 4. Search engines (owner step 6)

Search Console: URL-prefix property, HTML-tag verification. The owner sends you the tag; add it to
`partials/head-brand.html`, deploy, then they verify and submit `sitemap.xml`. Bing: import from Search Console.
IndexNow already tells Bing and others about every deploy. Never remove the verification tag.

## 5. Web filters (owner step 7)

Corporate networks block domains their filter hasn't classified, and a domain registered in the last month is
often tagged "newly registered / high risk". For a site aimed at people at work this decides whether they can open
it, so submit on launch day.

- `assets/reference/docs/web-filter-submissions.md` is the full pack: vendor list in order of reach, where to
  submit, which category name each vendor uses, and what happened. Write the project's own version into
  `docs/launch/web-filter-submissions.md`.
- What Robotics MENA found: some vendors had already categorised the site correctly within days (nothing to do);
  one needed a submission; three need a free account to request a change; two no longer offer a public tool. Look
  up first, submit only where needed, and log each result in `BACKLOG.md`.
- Optional monitor: `assets/reference/scripts/catmon/` re-checks vendors' public lookup pages on a schedule and
  alerts on change. It is strictly read-only (GET only, honours robots.txt, never submits a form or solves a
  human check) and in practice most vendors block automated lookups, so it mostly reminds the owner to check by
  hand. Add it only if the owner wants the reminder; a dated backlog item does the same job.

## 6. The first week

- Watch the first unattended run of each scheduled task on the portal's Schedule tab.
- Check the inbox and Sheet for real sign-ups; reply to submissions.
- Switch FormSubmit to its alias address so the inbox address isn't in the page code.
- Start the social launch campaign if there is a social desk.
- Connect the newsletter (owner step 8) and import the waitlist.
- Review the backlog with the owner and agree what the agents and you do next.

## 7. Decisions to raise with the owner around launch

- Public or private repository (cost and what a public one reveals).
- A native-speaker read of the second language.
- Whether the sign-up gate needs to be truly private.
- Who else gets portal access, and in which role.
