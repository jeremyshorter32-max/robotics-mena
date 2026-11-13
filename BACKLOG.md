# Development backlog

Open items for roboticsmena.com. Tick items off (`[x]`) as they are done and add new ones as they come up.
**Before the password protection is turned off, go through every open item below.**

## Must do before going public

- [x] **Google Sheet connected** (10 Nov 2026): web app deployed, `sheet_url` set, test entries sent.<!-- Connect the Google Sheet for form entries. Deploy `integrations/google-sheets/Code.gs` as a web app
  from script.google.com (steps in `integrations/google-sheets/README.md`; it already points at the Sheet
  `1Af2GzhWl5YkrGS-XZ46HMJ3MlFqK2V1kAqFL9stzqXI`), put the `/exec` URL in `data/site.json` as `sheet_url`,
  publish, and send one test entry. Until then, forms only arrive by email. -->
- [ ] **Newsletter on Kit (in progress, 11 Nov 2026).** Decided: Kit free plan, English only, Monday 07:00 Gulf,
  owner approves each issue in a Claude conversation. Built: `scripts/newsletter.mjs` (email from site data, Kit
  draft/schedule), `.claude/skills/weekly-brief/SKILL.md` (Sunday routine), Kit sign-up sync in
  `integrations/google-sheets/Code.gs`. Still to do: owner creates the Kit account (sender address, domain
  records, double opt-in form, API key), key saved to the environment, Apps Script properties + redeploy,
  import existing sign-ups, first test draft, then the Sunday scheduled task. Update the privacy page to name
  Kit as the newsletter processor.
- [x] **Privacy page.** Published at /privacy (10 Nov 2026), linked from every footer and next to each form.<!-- The forms collect emails and names; link a plain-language privacy notice
  (what is collected, why, FormSubmit + Google Sheets as processors, how to be removed) from the footer and
  next to each form. -->
- [x] **Privacy page retention periods** set from GDPR/UK ICO, CNIL, CCPA and the UAE/Saudi/Qatar laws (11 Nov 2026).
  No legal entity is named, by the owner's decision.
- [x] **Footer "Open data & API" claim.** Removed (10 Nov 2026), also from the Work page.<!-- It promises open data (CC BY 4.0) and a read-only JSON API, but no API
  is published. Either publish the data files (e.g. `/api/companies.json` …) or reword the footer. -->
- [x] **Footer "About the team" link** removed (10 Nov 2026).<!-- goes to the home page. Add an About page or remove the link. -->
- [x] **Brief week label** now worked out from the newest brief item (10 Nov 2026).<!-- Brief week label is hard-coded (`s1week: 'Week 45 · 2 – 8 Nov 2026'` in `src/logic.js`). Make it come
  from `data/brief.json` or the build date so it can't go stale. -->
- [x] **Editorial policy and corrections (audit, 10 Nov).** Published at /editorial with a corrections log (`data/corrections.json`).<!-- Footer "Read the policy" goes to `/submit`, and the
  footer promises corrections are logged. Publish a short editorial and corrections page (or change the copy). -->
- [ ] **Image rights (audit).** Brief, Spotlight and policy images include agency and newspaper photos (The National,
  WAM, Gulf Times, Asharq Al-Awsat, MedEdge, Dubai Media Office). A credit is not a licence: confirm permission,
  switch to official press-kit images, or replace them before going public.
- [x] **Bugs found in the audit** fixed (10 Nov 2026): raw target dates, Alat/Mowasalat match (now whole-word,
  also for logos and photos), notices for unknown `?c=` / `?s=` links, events separators, cross-month ranges, TBC
  months instead of invented dates, empty event filters hidden, Kenyo link replaced with Gulf News.
- [x] **Newsletter sample and stale copy** (11 Nov 2026): sample issue date, counts, tracker date and "new" flags
  now come from the data (flags expire 14 days after a record is added); time-bound brief takeaways reworded.
- [x] **Country card sources** (11 Nov 2026): cards link to the dossier's source list; countries without a dossier
  explain that counts come from the linked records.
- [x] **Arabic polish** (11 Nov 2026): number agreement everywhere a count meets a noun, "(press release)" and stat
  values translated, "110 ملايين درهم", one spelling per company name. A native-speaker read before launch is still advised.
- [x] **Score/dossier consistency** (11 Nov 2026): any verified deployment now scores at least Partial; UAE drones
  Partial while the GCAA suspension stands; Doha robotaxi record says trial (logged in corrections).
- [ ] **Launch plumbing (audit):** add `sitemap.xml`, a branded `404.html`, canonical tags and per-page
  descriptions; confirm "Enforce HTTPS" is ticked in GitHub Pages settings; decide on (privacy-friendly)
  analytics. (Button contrast fixed by the indigo rebrand, 10 Nov 2026.)
- [ ] **Turn off the password** (only after the above): change `scripts/build-site.sh` so it publishes without
  StatiCrypt, remove the `noindex, nofollow` tag it adds and the robots block, delete the `SITE_PASSWORD`
  repository secret, then check every page, search engines' access and the social preview image.
  Then submit roboticsmena.com for web-filter categorisation (Science/Technology or News) so work networks stop
  blocking it as "Miscellaneous or Unknown": Zscaler (sitereview.zscaler.com), Palo Alto, Fortinet, Cisco Talos,
  Symantec/Broadcom, Netskope, Forcepoint, McAfee/Trellix, Check Point.

- [x] **"From X this week" strip** (12 Nov 2026): hand-picked posts from official accounts in `data/xposts.json`,
  shown as plain cards; X's embed loads only on "Show post" (privacy page updated). Posts appear only once their
  status is "approved". The Sunday routine suggests new ones.

## Content and research

- [x] **Arabic brand name** (13 Nov 2026): «روبوتات الشرق الأوسط وشمال أفريقيا» everywhere (short forms such as
  «سجلّنا» in running text); the build now rejects the old «روبوتكس مينا».
- [ ] **Launch the Dubai robotic villa report (ready, not launched).** Draft on branch `draft/robot-villa`
  (`/spotlight?s=dubai-robot-villa`, EN/AR PDFs, adds Würth Professional Solutions). To launch: merge the branch
  into `main` (it predates the Nov 2026 rebrand: re-run `node scripts/report-pdf.cjs dubai-robot-villa` after merging) (it becomes the home-page Spotlight). Before launching, check for news since 9 Nov 2026 (consortium
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
