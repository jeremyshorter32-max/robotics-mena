# Development backlog

Open items for roboticsmena.com. Tick items off (`[x]`) as they are done and add new ones as they come up.
**Before the password protection is turned off, go through every open item below.**

## Must do before going public

- [ ] **Connect the Google Sheet for form entries.** Deploy `integrations/google-sheets/Code.gs` as a web app
  from script.google.com (steps in `integrations/google-sheets/README.md`; it already points at the Sheet
  `1Af2GzhWl5YkrGS-XZ46HMJ3MlFqK2V1kAqFL9stzqXI`), put the `/exec` URL in `data/site.json` as `sheet_url`,
  publish, and send one test entry. Until then, forms only arrive by email.
- [ ] **Decide how the newsletter is sent and how people unsubscribe.** Sign-ups are collected, but nothing sends
  the weekly brief yet and unsubscribes are manual (reply or email). Pick a free mailing tool (e.g. Brevo or
  Mailchimp free tier), import the sign-ups, and use its one-click unsubscribe.
- [x] **Privacy page.** Published at /privacy (10 Nov 2026), linked from every footer and next to each form.<!-- The forms collect emails and names; link a plain-language privacy notice
  (what is collected, why, FormSubmit + Google Sheets as processors, how to be removed) from the footer and
  next to each form. -->
- [ ] **Privacy page: owner to confirm.** The retention periods (sign-ups until unsubscribe, enquiries up to 24 months)
  and whether to name a legal entity and address. Have it checked by a lawyer if the site will process EU/UK data at scale.
- [x] **Footer "Open data & API" claim.** Removed (10 Nov 2026), also from the Work page.<!-- It promises open data (CC BY 4.0) and a read-only JSON API, but no API
  is published. Either publish the data files (e.g. `/api/companies.json` …) or reword the footer. -->
- [x] **Footer "About the team" link** removed (10 Nov 2026).<!-- goes to the home page. Add an About page or remove the link. -->
- [ ] **Brief week label is hard-coded** (`s1week: 'Week 45 · 2 – 8 Nov 2026'` in `src/logic.js`). Make it come
  from `data/brief.json` or the build date so it can't go stale.
- [x] **Editorial policy and corrections (audit, 10 Nov).** Published at /editorial with a corrections log (`data/corrections.json`).<!-- Footer "Read the policy" goes to `/submit`, and the
  footer promises corrections are logged. Publish a short editorial and corrections page (or change the copy). -->
- [ ] **Image rights (audit).** Brief, Spotlight and policy images include agency and newspaper photos (The National,
  WAM, Gulf Times, Asharq Al-Awsat, MedEdge, Dubai Media Office). A credit is not a licence: confirm permission,
  switch to official press-kit images, or replace them before going public.
- [x] **Bugs found in the audit** fixed (10 Nov 2026): raw target dates, Alat/Mowasalat match (now whole-word,
  also for logos and photos), notices for unknown `?c=` / `?s=` links, events separators, cross-month ranges, TBC
  months instead of invented dates, empty event filters hidden, Kenyo link replaced with Gulf News.
- [ ] **Newsletter sample and stale copy (audit).** The sample is labelled "No. 45" (implies 44 past issues), its
  counts disagree with the data, "Updated 9 Nov 2026" is fixed text, two brief takeaways point to events ending
  10 Nov, and the "Added this week" flags are set by hand.
- [ ] **Country cards say "Source not yet recorded"** on every country, against "every record links to its
  primary source". Add sources or change the wording.
- [ ] **Arabic polish (audit):** number agreement ("12 شركات", "1 عمليات نشر"), English left in Arabic mode ("Tens",
  "(press release)"), "AED110 مليون درهم", inconsistent spellings of company names.
- [ ] **Score/dossier consistency (audit):** Qatar "Deployments tracked 2" vs "Verified deployments: None"; UAE drones
  "Strong" while the drone suspension is in force; Qatar robotaxi "launched" vs dossier "still a trial".
- [ ] **Launch plumbing (audit):** add `sitemap.xml`, a branded `404.html`, canonical tags and per-page
  descriptions; confirm "Enforce HTTPS" is ticked in GitHub Pages settings; decide on (privacy-friendly)
  analytics. Consider the orange button contrast (white on #D65336 at small sizes is 4.07:1, below 4.5:1).
- [ ] **Turn off the password** (only after the above): change `scripts/build-site.sh` so it publishes without
  StatiCrypt, remove the `noindex, nofollow` tag it adds and the robots block, delete the `SITE_PASSWORD`
  repository secret, then check every page, search engines' access and the social preview image.

## Content and research

- [ ] **Launch the Dubai robotic villa report (ready, not launched).** Draft on branch `draft/robot-villa`
  (`/spotlight?s=dubai-robot-villa`, EN/AR PDFs, adds Würth Professional Solutions). To launch: merge the branch
  into `main` (it becomes the home-page Spotlight). Before launching, check for news since 9 Nov 2026 (consortium
  names, start date) and update the text if anything changed.

- [ ] **Defence and weapons drone makers: include or not?** Ten were found and held back pending an editorial
  decision: EDGE Group (UAE), SR2Vector, United Defense Company, INTRA Defense Technologies, Haris Unmanned
  Systems, SERB Advanced Industries (Saudi Arabia), Barzan Holdings (Qatar), Shield AI (US), Exail (France),
  Saildrone (US, Fifth Fleet). Records are ready to add if the answer is yes.
- [ ] **Second research pass.** The first pass (Nov 2026) added 63 companies but every agent stopped early on the
  session's web-search limit. Not yet covered well: medical, education, agriculture, service-robot distributors
  (Pudu/Keenon/Unitree dealers), Khalifa University/MBZUAI spin-outs, Jordan, Iraq, Libya, Bahrain, industrial
  arm makers (ABB, KUKA, FANUC…). Leads already noted: BTR.tech partners, Unique Group (UAE subsea), iFarm (UAE),
  Planys, Milkor UAE, Furhat, Elroy Air/Barq, LimX Dynamics, Jiangsu Yunmu humanoid deal, Robot Ahmed (Bahrain),
  Buildroid AI, Hollyway/XAR (Morocco), Tekever, Corvus Drones, Harmattan AI, Faraday Future (UAE partners),
  Yango Tech Robotics (confirm HQ), Black Buffalo 3D / Struxure.
- [ ] **Thinly sourced new entries to re-check.** Some new companies are sourced only from their own websites
  (e.g. Aerosmart, Airscope, Drone Film Arabia, RoboMecs, Shamal, Aerial Solutions, Lebotics, Avelabs, Robotics
  Corner, Clear Sky Drones, KAT) or from older coverage (Marakeb 2023, Firnas Aero 2020, ATLAN Space 2020).

- [ ] **VORTEXINFO in Qatar.** Listed with its Abu Dhabi showcase (ADSW, Jan 2026); no Qatar presence found.
  Add Qatar if a source turns up.
- [ ] **Link new deployments to policy programmes.** Add this step to the research-report skill
  (`.claude/skills/research-report/SKILL.md`) and the weekly scanner checklist, so programme "On the ground"
  lists on the policy page stay current.
- [ ] **Supplier map coordinates.** New international suppliers whose HQ city is not in `HQ_LL`
  (`src/logic.js`) are drawn from their country's capital. Add the city when a new one appears
  (a build warning for this would help).

## Nice to have

- [ ] Hide the inbox address in form URLs by switching FormSubmit to its random alias (offered in the
  FormSubmit dashboard after activation), so scrapers can't harvest contact@roboticsmena.com from the code.
- [ ] Run the map's guided tour on a loop on the home page.
- [ ] Map on phones: a swipe-up bottom sheet for the deployment list instead of the panel under the map.

## Done recently (for reference)

- [x] contact@roboticsmena.com site-wide; FormSubmit activated and tested (Work with us test arrived).
- [x] Get the brief pop-up, privacy promise on every sign-up, Work with us page and form.
- [x] Map: time-lapse, type pins, readiness layer, supplier arcs, tour, fan-out, performance, MENA-only start view.
