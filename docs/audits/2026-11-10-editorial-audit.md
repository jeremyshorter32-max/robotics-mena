# Robotics MENA: editorial and content audit before launch

- **Audit date:** 10 Nov 2026
- **Build audited:** local build at http://127.0.0.1:8767. It was up throughout the audit.
- **Method:** Playwright read the visible text of every page in English and Arabic: home, map, database (all 4 tabs), policy (default, SA, QA, AE), events, spotlight, submit and work. It also opened these sample records:
  - 12 company cards
  - 6 deployment cards
  - 3 country cards (AE, LB, DZ)
  - 4 event cards
  - Arabic versions of 5 of these cards
- **Raw text dumps:** `txt/*.en.txt` and `txt/*.ar.txt`
- **Card dumps:** `cards.txt`
- **Already in the backlog:** items marked **[in BACKLOG]** are already listed in `BACKLOG.md`. Every other item is new.

**Israel check:** no mention of Israel or Israeli companies anywhere, in either language or in `data/*.json`. The Spotlight does discuss the 2026 "Iran war" strikes on ADNOC sites. That passage is sensitive, but it does not break the rule (see S17).

---

## MUST FIX (before launch)

**M1. The "About the team" link in the footer goes to the home page.** [in BACKLOG]
- **Where:** footer on every page, EN "About the team" / AR "تعرّف على الفريق". The link is `href="/"`.
- **Also:** no About or contact page exists. `/about` returns 404.
- **Fix:** write a short About page (who runs the site, independence, funding, contact), or remove the link.

**M2. "Read the policy" goes to the Submit form, and there is no editorial or corrections policy page.**
- **Where:** footer "EDITORIAL & SOURCING: … Corrections are logged. Read the policy" → `/submit`.
- **The claim:** Arabic says "ونسجّل التصحيحات علناً" (we log corrections publicly). Submit says "corrections are logged publicly". No corrections log exists anywhere. `/corrections` returns 404.
- **Fix:** publish a one-page editorial and corrections policy with a corrections log, even an empty one ("No corrections yet"), and point the link there. Otherwise change the copy to "Corrections: write to contact@…".

**M3. The "Open data & API" claim is false.** [in BACKLOG]
- **The claim (footer, every page):** "Companies, deployments, events and strategies are available as open data (CC BY 4.0) and a read-only JSON API. Explore the data". The Arabic says the same.
- **What happens:** the link goes to `/database`, which has no download, licence notice or API docs. `/api/companies.json` and `/data/companies.json` both return 404.
- **Also:** `/work` "Data & listings: Use the open dataset" assumes the dataset exists.
- **Fix:** publish the JSON files and a licence line, or reword the footer to "Open data coming soon" or drop it.

**M4. No privacy notice, although four forms collect emails and names.** [in BACKLOG]
- **The forms:** newsletter, Spotlight email gate, Submit and Work with us.
- **What is missing:** `/privacy` returns 404. There are also no terms of use and no image or copyright notice.
- **The email gate:** "Enter your email to unlock this piece. You'll also get the weekly brief" bundles newsletter consent with access to the article. Say this clearly and link the privacy page next to the button.
- **The privacy page should cover:** FormSubmit and Google Sheets as processors; Google Fonts (a third-party request); `localStorage` keys `rm-*`, which are functional only. No analytics were found, so no cookie banner is needed, but the privacy page should say so.

**M5. The newsletter is promised but does not exist yet, and the sample issue is numbered "NO. 45".** [partly in BACKLOG]
- **Where:**
  - home, policy and every "Get the brief" pop-up: "Five signals every Monday · 4-minute read · Unsubscribe any time"
  - sample issue: "SAMPLE ISSUE · NO. 45 · 9 NOV 2026" (AR "العدد 45")
- **The problem:** nothing sends the brief yet, and "No. 45" suggests 44 earlier issues. The number is actually the ISO week number.
- **Fix:** set up the mailing tool with one-click unsubscribe before launch. Relabel the sample "Sample issue · 9 Nov 2026" or "Issue 1".

**M6. Every country card shows "Source not yet recorded", which contradicts the site's main promise.**
- **Where:** `/database?tab=countries&id=AE` (and LB, DZ, all 12). The card ends "Source not yet recorded".
- **The promise:** footer "Every record links to its primary source"; hero "Every entry links to its primary source".
- **Fix:** give each country record the source of its headline target, which is already in the policy dossier. Or hide the line and soften the claim to "every company, deployment and event".

**M7. The "Target year" field shows raw English and Arabic together.**
- **Where:** `/database?tab=countries`, table and cards, in English and Arabic:
  - Algeria: "2027 fire season,موسم حرائق 2027"
  - Kuwait: "31 Dec 2026,31 ديسمبر 2026"
- **Cause:** `target_year` is a bilingual array printed with `String()` (`src/logic.js`, ~line 422).
- **Fix:** pick the current language.

**M8. A deployment is linked to the wrong company.**
- **Where:** company card **Alat** (PIF/SoftBank industrial robots). Under "DEPLOYMENTS" it shows "Fully driverless robotaxi rides launched in Doha" (d24, operator "Mowasalat (Karwa) with Pony.ai"). The Arabic card shows the same.
- **Cause:** the operator match is a substring match: "Mow**alat**". It is the only such false match in the data.
- **Fix:** match on word boundaries or on explicit company ids.

**M9. Third-party press photos are used. Confirm the rights or replace them.**
- **Credits shown:**
  - "Photo: Victor Besa / The National" (home Spotlight and report hero)
  - "Image: Chris Whiteoak / The National"
  - "Image: WAM via AGBI"
  - "Image: Abu Dhabi Media Office"
  - "Image: Gulf Times"
  - "Photo: Asharq Al-Awsat"
  - "Image: MedEdge MEA"
  - "Image: X-GEN (promotional image)", plus company images
- **The risk:** a credit line is not a licence. Staff photos from newspapers are the riskiest.
- **Fix:** keep only images you have permission for, or that are official handout or press-kit images. Otherwise use a placeholder or a company logo.

**M10. Copy that is tied to dates will be wrong on launch day.** [week label in BACKLOG]
- **Home:**
  - "This week's five signals · Week 45 · 2 – 8 Nov 2026" is hard-coded
  - "Demos run 8 to 10 November at DECC"
  - "watch Cairo ICT (7 to 10 November) for its first products"
  - Both events end today.
- **Everywhere:** "Updated 9 Nov 2026" is a static string on every page, including the Submit and Work forms.
- **Policy deadlines:** "11 Nov 2026 · This week · Algeria".
- **Fix:** before the password comes off, refresh the brief and generate the week label and "Updated" date at build time. Rewrite event-dependent takeaways in the past tense once the event has passed.

---

## SHOULD FIX

**S1. Counts in the sample issue do not match the map, and the "Added this week" flags are hard-coded.**
- **The text:** "+ 3 deployments added to the map · 2 events this fortnight" (AR "فعاليتان خلال أسبوعين").
- **What the data says:**
  - 6 deployments carry the "Added this week" flag (d01–d06, set by a static `is_new: true`).
  - 5 events fall in the 9–22 Nov fortnight (Cairo ICT, MWC Doha, World Police Summit, Dubai Future Week, Emirates Robotics Competition).
- **Fix:** compute both from the data. Derive "Added this week" from the `added` date, not from `is_new`.

**S2. "Deployments" includes things that are not robots working on a site.**
- **The promise:** map and home say "Every robot we can verify, working on a real site in the region."
- **What the list includes:**
  - "Humanoid robot showroom on Sheikh Zayed Road" (a shop)
  - "Warehouse robotics firm opens Saudi HQ" (an office)
  - "Humanoid robotics centre of excellence in Bahrain"
  - "Humanoid robot rental service launched in Saudi"
  - "X-GEN robots and drones with local assembly" (market entry)
  - "Rebar-cage automation joint venture for NEOM" (a JV)
  - "Global challenge to build a villa entirely by robots" (a competition)
- **Fix:** reword the subtitle to "deployments and market entries" (the list header already says "Latest deployments & entrants"), or move entrants to a separate layer.

**S3. Readiness scores contradict the dossiers.**
- **Qatar:** the dossier says "Deployments tracked 2" next to "Verified deployments: **None**". By the method (10+ strong, 3–9 partial), 2 counts as none, but readers will see a contradiction. Rename the band "Few (0–2)" or "Limited".
- **UAE drones:** "Drone operations: Strong" (16/16), yet the same dossier lists "GCAA temporary suspension of drone operations (Safety Decision 2026-03) · Suspended … No official cancellation was found". The method says it scores "what is in force or operating today". Explain the score, or lower it to Partial.

**S4. The Qatar deployment headline overstates what the dossier says.**
- **The headline:** "Fully driverless robotaxi rides launched in Doha" (deployment d24, linked from the QA dossier).
- **The dossier:** "no MoT approval of a fully driverless public service was found" and "This is still a trial".
- **Fix:** retitle to "Robotaxi rides without a safety operator trialled in Doha".

**S5. Country coverage numbers disagree, and Lebanon is an empty shell.**
- **The numbers:**
  - home: "Countries covered 12"
  - policy page: 11 dossiers and scorecard rows
  - map: 9 countries with deployments
  - events: 7 countries
- **Lebanon:** its card has no summary, target "—", year "—", "Source not yet recorded". `/policy?c=LB` silently shows the UAE dossier instead.
- **The policy footnote:** "Countries marked 'Not yet profiled' are tracked but have no dossier yet", but nothing on the page is marked that way.
- **Fix:**
  - Add Lebanon to the compare table as "Not yet profiled", or drop it from the 12.
  - Make `?c=LB` show a "not yet profiled" note.
  - Consider "12 countries tracked · 11 profiled".

**S6. Arabic number agreement is wrong in many places.** Arabic plurals depend on the number.
- **Category tiles and database (AR):**
  - "12 شركات", "14 شركات", "15 شركات", "20 شركات", "39 شركات" → numbers 11 and up take the singular: "12 شركة", "39 شركة"
  - "1 عمليات نشر" → "عملية نشر واحدة"
  - "2 عمليات نشر" → "عمليتا نشر"
- **Policy deadline cards (AR):**
  - "+1 أهداف أخرى" → "+ هدف آخر"
  - "+2 أهداف أخرى" → "+ هدفان آخران"
- **Spotlight:** "5 مزوّدين للروبوتات" → "خمسة مزوّدي روبوتات".
- **Fix:** add a small Arabic plural helper (1 / 2 / 3–10 / 11+).

**S7. English left in Arabic mode.**
- **Home Spotlight stat:** "**Tens**" with Arabic label "روبوتات تُنشر يومياً في المنطقة" → "العشرات". The English is also awkward: "Tens / Robots deployed a day in the region" → "Tens of robots deployed daily".
- **Brief image credits:** "الصورة: X-GEN (promotional image)" → "(صورة ترويجية)"; "الصورة: WAM via AGBI" → "وام عبر AGBI".
- **Company source lines:** "المصدر: SoftBank Group (press release)" (and similar) → "(بيان صحفي)".
- **Spotlight stat:** "AED110 مليون درهم" names the currency twice → "110 ملايين درهم".
- **Morocco targets in AR:** "100 مليار درهم" is ambiguous next to UAE dirhams → "درهم مغربي".

**S8. Missing separator in "Dates TBC" on the events page (EN and AR).**
- **Examples:** "RiyadhDates TBC", "New CairoDates TBC", "DubaiDates TBC", "DohaDates TBC"; AR "الرياضالتواريخ قيد التأكيد".
- **Fix:** add " · " before the TBC label.

**S9. Date ranges that cross a month read wrong on the events page.**
- **Web Summit Qatar:** shows "31–3 Jan". It runs 31 Jan – 3 Feb.
- **ITSA:** shows "29–1 Nov". It runs 29 Nov – 1 Dec.
- **Fix:** show both months, e.g. "31 Jan – 3 Feb".

**S10. Events with TBC dates show made-up exact dates in the database.**
- **Where:** `/database?tab=events`:
  - "Saudi Drone Champions League (Season 2) · 1 Jan 2027"
  - "Ai Everything MEA Egypt · 1 Jun 2027"
  - "Dubai World Congress for Self-Driving Transport · 1 Sept 2027"
  - "ROBOTECH Expo · 1 Nov 2027"
- **Why it matters:** these are placeholder first-of-month dates. The events page shows them as "TBC". The card says "Dates to be confirmed" but still displays "1 Jan 2027".
- **Fix:** show "Jan 2027 (TBC)".

**S11. An empty filter on the events page.**
- **Where:** "Type: … Meetup **0**".
- **Fix:** hide types with zero events, or add meetups. Community meetups fit the audience the site names.

**S12. The same organisations are named differently.**
- **ADNOC:** "Wall-climbing inspection robots across **Adnoc** facilities · Adnoc energy facilities" (map, database, policy) vs "**ADNOC**" (home Spotlight, report, operator field). → Use ADNOC everywhere.
- **Lootah:** "Lootah Robotics" (brief, deployment operator) vs company record "YS Lootah Robotics". AR "لوتاه للروبوتات" vs "واي إس لوتاه للروبوتات".
- **Gecko (AR):** "جيكو روبوتيكس" vs "جيكو روبوتكس" in the same card.
- **X-GEN (AR):** "إكس جين" vs "إكس-جين" vs "X-GEN".
- **Humanoids (AR):** "الروبوتات البشرية" vs "الروبوتات الشبيهة بالبشر".
- **Drones (AR):** "المسيّرات" vs "الطائرات المسيّرة". This one is acceptable, but pick a house style.

**S13. Headline targets and the table header are run together, so labels are repeated or garbled.**
- **Kuwait:** "Regulations executive regulations setting licensing procedures, conditions and fees, due by 31 December" → "Executive regulations (licensing, conditions, fees) due by 31 Dec 2026".
- **Qatar:** "SIRI level 2 Qatari factories' smart-industry readiness on the Smart Industry Readiness Index". AR "المستوى 2 في مؤشر SIRI جاهزية … وفق مؤشر جاهزية الصناعة الذكية" says the index name twice.
- **Bahrain (AR):** "الأول خليجياً والـ25 عالمياً الترتيب على مؤشر…" has the wrong word order → "المرتبة الأولى خليجياً والـ25 عالمياً على مؤشر…".

**S14. Deployment wording.**
- **d22 title:** "Humanoid robot rental service launched in **Saudi**" → "in Saudi Arabia".
- **d22 site and date:** the site reads "announced at LEAP 2026", but LEAP was in Feb 2026 and the record is dated 14 Sept 2026. Check the date.
- **d08:** "Security Forces Hospital · Security Forces Hospital, Riyadh" repeats the name. Show only "Riyadh" when the operator and site are the same.

**S15. Process promises the team may not be able to keep.**
- **Submit:** "We contact the company or operator to confirm." 139 companies were all listed between 7 and 9 Nov, and many are sourced only to their own website (see the backlog). Soften to "Where needed, we contact…".
- **Work:** "an editor will reply within five working days" (AR "خلال خمسة أيام عمل"). Keep this only if someone is staffing the inbox.
- **Footer and hero:** "Claims without a primary source are not published" / "Every entry links to its primary source". 28 companies use their own website as the source, and the country records have none (M6).

**S16. There is no 404 page.**
- **What happens:** unknown URLs (e.g. `/about`, `/privacy`) give the server's default 404.
- **What the app does with bad parameters:**
  - `/policy?c=XX` falls back silently to the UAE dossier.
  - `/spotlight?s=anything` silently shows the ADNOC report, including `?s=dubai-robot-villa`, the slug of the report that has not launched yet.
- **Fix:** add a branded 404 page. Show a "not found" note for unknown slugs and country codes.

**S17. Spotlight report: accuracy and sensitivity.**
- **"a year":** the dek says "after **a year** of war damage", but the strikes it describes were in March–April 2026, about eight months ago. → "after months of war damage" or "after this year's strikes".
- **Sensitivity:** the report (gated chapters) names "Iranian missiles and drones" and cites "Gulf energy infrastructure damaged in Iran war". This is factual and sourced, but it is the site's most politically sensitive copy. Have the owner sign it off before launch. Israel is not mentioned.

---

## NICE TO HAVE

1. **Month abbreviations are inconsistent.** Qatar milestones use "Sep 2023 / Sep 2025"; everywhere else uses "Sept". Also "Jul 2022" vs "20 July 2022". Pick one style; Guardian/FT style is "Sept".
2. **Money spacing is inconsistent.** "AED110m" (Spotlight) vs "AED 44bn", "QR 40bn", "TND 13.5bn" (policy). Use "AED 110m".
3. **The "Listed" column says little.** On the companies tab, every company is listed 7–9 Nov 2026, so "Most recent" sorting means nothing and it shows the database was built in a weekend. Hide the column until there is real history, or label the date "Added at launch".
4. **Logo placeholders show as stray letters** in tables and cards: "B" (btr.tech), "M" (interpack MEA), "G" (Guanli), "D" (DeepFest), "CG", "SF", "KM". Use a neutral icon, or get the logos.
5. **Five events have no "Why it matters for robotics" line:** Emirates Robotics Competition, VertiExpo/DroneTech Dubai, RoboNexus World Championship, Dubai World Congress for Self-Driving Transport, ROBOTECH Expo. These are the most robotics-specific events, so they need it most.
6. **Cityscape Global appears twice** (1–4 Feb 2027 "Postponed from Nov 2026", and 15–18 Nov 2027). This is correct, but add "(2026 edition)" / "(2027 edition)" to the names.
7. **"Dubai Self-Driving Transport Strategy 2025–2040 · Roads & Transport Authority · 2016"** reads as a contradiction. Add "launched 2016, updated 2025".
8. **The deployment sector for the Lootah showroom and AgiBot rentals is "Hospitality".** "Retail" or "Sales & rental" fits better.
9. **The Spotlight is not in the top navigation.** It is reachable only from the home-page card, so add a "Spotlight" or "Research" link.
10. **Meta descriptions repeat.** Map, policy, events, spotlight and submit all reuse the home-page description. Write one per page for search and social previews.
11. **The "Updated 9 Nov 2026" line on Submit and Work** means nothing on a form. Remove it.
12. **The UAE country card's "Companies in this country" list is not in a clear order.** It appears to follow insertion order. Sort it A–Z or by relevance.
13. **"Robotics LLC" (Arabic name "روبوتكس")** is a very generic name. Add the brand or website name, if it has one, so readers can tell it apart.
14. **"SINAA Expo Industries · SAFEX – Palestine Pavilion"** is the real hall name at SAFEX Algiers, so it is fine. Writing "SAFEX (Palestine Hall), Algiers" makes it clear it is a venue.

---

## Checked and fine

- No "lorem", "TODO", "{{", "undefined", "NaN" or "null" in visible text, in English or Arabic.
- British spelling is consistent ("organisation", "programme", "centre", "licence"/"licenses" used correctly). US spellings appear only in proper names and quoted headlines.
- Headline counts agree across pages:
  - 139 companies
  - 33 deployments; the map country split adds up to 33
  - 39 events, split 27 / 9 / 3
  - "Events, next 90 days 18" matches the data as of 10 Nov
- Category deployment counts add up to 33.
- Every company, deployment and event has a `source_url` and Arabic name and summary fields.
- Arabic UI chrome is fully translated. External-link arrows are mirrored for RTL.
- No analytics or tracking scripts. The only storage is `localStorage` (`rm-lang`, theme, StatiCrypt).
