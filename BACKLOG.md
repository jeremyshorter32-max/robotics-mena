# Development backlog

Open items for roboticsmena.com. Tick items off (`[x]`) as they are done and add new ones as they come up.
**Before the password protection is turned off, go through every open item below.**

## Must do before going public

- [x] **Google Sheet connected** (10 Nov 2026): web app deployed, `sheet_url` set, test entries sent.<!-- Connect the Google Sheet for form entries. Deploy `integrations/google-sheets/Code.gs` as a web app
  from script.google.com (steps in `integrations/google-sheets/README.md`; it already points at the Sheet
  `1Af2GzhWl5YkrGS-XZ46HMJ3MlFqK2V1kAqFL9stzqXI`), put the `/exec` URL in `data/site.json` as `sheet_url`,
  publish, and send one test entry. Until then, forms only arrive by email. -->
- [ ] **Newsletter on Kit (in progress, 11 Nov 2026).** Until it is ready, the site runs a **waitlist** (13 Nov 2026): every sign-up form says
  "Join the waitlist" and entries go to the inbox and the Google Sheet "Sign-ups" tab; import them into Kit as the first
  subscribers (`syncAllSignupsToKit`), then switch the copy back to "Subscribe" in `src/logic.js` (nl*, subscribe, gate*, privBody). Decided: Kit free plan, English only, Monday 07:00 Gulf,
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
- [x] **Image rights (audit).** Done 13 Nov 2026: the five highest-risk newspaper photos (six placements: Lootah
  brief tile, Spotlight cover and home tile, Gecko chapter image, ADNOC humanoid, Saudi policy feature) were replaced with
  company images (YS Lootah, Gecko, Taurob, GMT Robotics) and the report PDFs rebuilt. Every image credit on the site now
  has a "Request removal" link (email to contact@roboticsmena.com, image and page prefilled). The remaining agency and
  newspaper photos stay credited, covered by that link and the editorial page's removal line.
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
- [x] **Launch plumbing (audit), site side** done 13 Nov 2026: `sitemap.xml` and a public `robots.txt` built by
  `scripts/assemble.cjs` / `build-site.sh`, branded bilingual `404.html` (`static/404.html`), canonical and per-page
  Open Graph tags from each page's title and description, every page has its own description. GoatCounter added
  (site code `roboticsmena`). (Button contrast fixed by the indigo rebrand, 10 Nov 2026.)
- [x] **Launch plumbing, owner side** (13 Nov 2026): "Enforce HTTPS" ticked; GoatCounter account created (`roboticsmena`).
- [ ] **After launch:** add the site to Google Search Console and Bing Webmaster Tools and submit
  https://roboticsmena.com/sitemap.xml.
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
  decision (add Marakeb Technologies: UAE Navy combat-system partner, also civilian USVs; listed for now): EDGE Group (UAE), SR2Vector, United Defense Company, INTRA Defense Technologies, Haris Unmanned
  Systems, SERB Advanced Industries (Saudi Arabia), Barzan Holdings (Qatar), Shield AI (US), Exail (France),
  Saildrone (US, Fifth Fleet). Records are ready to add if the answer is yes.
- [x] **Second research pass** (13 Nov 2026): +26 companies, +25 deployments (medical, agri, education, cleaning-robot
  operators and dealers, KAUST/KU spin-outs, Qatar/Oman/Jordan/Bahrain), every source opened and checked to load.
- [ ] **Leads from the second pass, not yet publishable** (low confidence or own-site only): LYBOTICS (Libya), EduRobotKits,
  DARBCO (Jordan), ATLAB, Al Yousuf Robotics, Jacky's, Hygiene Tech, Inc Robotics, Albariq, Ednex, Icosium, Hollyway/XAR
  (Morocco), Iraq's first robotic surgery at Warith (date unconfirmed), Jiangsu Yunmu humanoid pact (sponsored content only),
  AgiBot–Vodafone Qatar MoU (8 Nov 2026), iFarm, AgriEdge, Nupology. Industrial arm makers (ABB/Almarai, Kawasaki RAK,
  FANUC, KUKA…) still uncovered: their sites block automated access.
- [ ] **Miral HQ cleaning robot.** Not publicly sourced yet. Likely operated by FM contractor Berkeley Services (not listed:
  FM companies are out of scope); the robot maker is unknown. Add the maker and a deployment when a public source exists.
- [ ] **Bahrain drones.** Search results say Bahrain suspended civil drone activity from April 2026; confirm from the official
  notice and reflect it in Bahrain's records.
- [x] **Thin entries re-checked** (13 Nov 2026): Shamal, Avelabs (now part of Arrow), Marakeb, Firnas, ATLAN confirmed;
  Aerosmart, Airscope, Drone Film Arabia, RoboMecs, Lebotics, Clear Sky Drones, KAT, Robotics Corner labelled
  "Company-reported" on the site; Aerial Solutions removed (military drone JV, Defense News 2022).

- [ ] **VORTEXINFO in Qatar.** Checked 13 Nov 2026 in English and Chinese: no Qatar office, registration, deployment,
  MoU or client found; record stays UAE-only. Still to check: parent Hanjia Design's annual-report subsidiary list,
  the QFC public register and Qatar's commercial registry.
- [x] **Link deployments to policy programmes** (13 Nov 2026): `scripts/link-programmes.mjs` suggests and applies links;
  wired into the scanner PR, the research-report and weekly-brief skills. The 16 unlinked deployments were reviewed:
  none is clearly driven by a profiled programme, so none was linked.
- [x] **Supplier map coordinates** (13 Nov 2026): Mountain View added; the build warns when an international
  supplier's HQ city has no coordinates.

## Nice to have

- [ ] Hide the inbox address in form URLs by switching FormSubmit to its random alias (offered in the
  FormSubmit dashboard after activation), so scrapers can't harvest contact@roboticsmena.com from the code.
- [x] Home-page map runs an ambient looping tour while in view; stops at first interaction; off with reduced motion (13 Nov 2026).
- [x] Map page on phones: swipe-up bottom sheet (peek / half / full) for the deployment list; full mobile check of
  every page on 3 phone sizes, EN and AR (13 Nov 2026): fixed 320px-wide overflow and 9–10px badge text.

## Done recently (for reference)

- [x] contact@roboticsmena.com site-wide; FormSubmit activated and tested (Work with us test arrived).
- [x] Get the brief pop-up, privacy promise on every sign-up, Work with us page and form.
- [x] Map: time-lapse, type pins, readiness layer, supplier arcs, tour, fan-out, performance, MENA-only start view.
