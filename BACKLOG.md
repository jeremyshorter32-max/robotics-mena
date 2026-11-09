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
- [ ] **Add a short privacy page.** The forms collect emails and names; link a plain-language privacy notice
  (what is collected, why, FormSubmit + Google Sheets as processors, how to be removed) from the footer and
  next to each form.
- [ ] **Footer "Open data & API" claim.** It promises open data (CC BY 4.0) and a read-only JSON API, but no API
  is published. Either publish the data files (e.g. `/api/companies.json` …) or reword the footer.
- [ ] **Footer "About the team" link** goes to the home page. Add an About page or remove the link.
- [ ] **Brief week label is hard-coded** (`s1week: 'Week 45 · 2 – 8 Nov 2026'` in `src/logic.js`). Make it come
  from `data/brief.json` or the build date so it can't go stale.
- [ ] **Turn off the password** (only after the above): change `scripts/build-site.sh` so it publishes without
  StatiCrypt, remove the `noindex, nofollow` tag it adds and the robots block, delete the `SITE_PASSWORD`
  repository secret, then check every page, search engines' access and the social preview image.

## Content and research

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
