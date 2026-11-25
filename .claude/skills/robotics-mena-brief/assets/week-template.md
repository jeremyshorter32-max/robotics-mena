# Robotics MENA brief · input · week NN
<!--
  HOW TO USE (about 15 minutes, Monday morning)
  1. Copy to newsletter/input/week-NN.md (NN = the brief's week, e.g. week-48.md).
  2. Type each value after its "key:" — the comment on the line is ignored, so leave it or delete it.
     One line per value. List items are "- a | b | c" with space-pipe-space between fields.
  3. Fastest source for most of it: data/briefs/<year>-wNN.json (the five signals are already there).
  4. Run:  node scripts/brief-body.mjs build newsletter/input/week-NN.md
     It lists anything missing, then writes newsletter/out/week-NN-body.html and -subject.txt and prints the checklist.
  Voice: factual, British spelling, name actor/place/date/number, MoU ≠ pilot ≠ live,
  company figures as claims ("by the company's count"), no "revolutionary/game-changing/exciting", no "!".
-->

week:        <!-- ISO week number, e.g. 48 -->
dates:       <!-- shown in the kicker: 23–29 November 2026 -->
published:   <!-- send date, YYYY-MM-DD (counts and the 90-day event window run from here) -->
theme:       <!-- the week's biggest theme, a few words (notes for you; not printed) -->
standfirst:  <!-- ONE sentence naming the theme. Printed under the week line. -->
take:        <!-- ~70 words of point of view: what the week means and what to watch next. Signed "— Robotics MENA" automatically. -->

## By the numbers
<!-- 3–4 items: VALUE | label. Get the live counts with:  node scripts/brief-body.mjs stats <published date>
     The build refuses numbers that don't match the live data. Two counts may share a line. -->
- 000 | companies tracked across the region
- 00 | deployments mapped in 00 countries
- 00 | events in the next 90 days
-  |  <!-- standout figure from this week, e.g. 1,300+ | robot-assisted surgeries at SSMC, by the hospital's count -->

<!-- ===== FIVE SIGNALS =====
  From data/briefs/<year>-wNN.json, items[0..4]:
    country ← items[i].country (write the name: UAE, Saudi Arabia, Qatar, Egypt, Oman…)   iso ← country code
    date ← date   headline ← title   takeaway ← takeaway   source ← source   url ← source_url
    image ← https://roboticsmena.com + image   credit ← "Photo: " + image_credit
  Rules: headline ≤ 95 characters with a concrete noun (ideally a number); takeaway EXACTLY 2 sentences
  (1: what happened. 2: why it matters). Image must be live under roboticsmena.com/media/brief/. -->

## Signal 1
country:   <!-- UAE -->
iso:       <!-- AE -->
date:      <!-- YYYY-MM-DD -->
facts:     <!-- your notes: actor, place, date, numbers; MoU, pilot or live? (not printed) -->
headline:  <!-- ≤ 95 characters -->
takeaway:  <!-- exactly 2 sentences -->
source:    <!-- publication name, e.g. The National -->
url:       <!-- https:// link to the primary source, never shortened -->
image:     <!-- https://roboticsmena.com/media/brief/<file>.jpg -->
alt:       <!-- what the photo shows -->
credit:    <!-- Photo: <owner>   (add "(illustrative)" for illustrations) -->

## Signal 2
country:
iso:
date:
facts:
headline:
takeaway:
source:
url:
image:
alt:
credit:

## Signal 3
country:
iso:
date:
facts:
headline:
takeaway:
source:
url:
image:
alt:
credit:

## Signal 4
country:
iso:
date:
facts:
headline:
takeaway:
source:
url:
image:
alt:
credit:

## Signal 5
country:
iso:
date:
facts:
headline:
takeaway:
source:
url:
image:
alt:
credit:

## Spotlight
<!-- Newest entry in data/stories.json. -->
title:     <!-- the report's title -->
body:      <!-- ~120 words: the argument, the key numbers, what is claimed vs measured -->
quote:     <!-- one line from the report or a named source -->
quote_by:  <!-- e.g. Robotics MENA Spotlight, 7 November 2026 -->
url:       <!-- https://roboticsmena.com/spotlight?s=<story id> -->

## Policy watch
<!-- 2–3 items: Country: one line, with date | Source name | https link -->
-  |  |
-  |  |
-  |  |

## On the calendar
<!-- 3–5 items within 90 days of "published": Event | City | Dates | https link. From data/events.json. -->
-  |  |  |
-  |  |  |
-  |  |  |
-  |  |  |

## Also noted
<!-- 4–6 items: Country: one line, ending with the date in brackets | Source name | https link.
     Good source: data/deployments.json entries dated this week that aren't signals. -->
-  |  |
-  |  |
-  |  |
-  |  |

## Subjects
<!-- Exactly 3 options, each ≤ 55 characters, leading with the most concrete fact, no clickbait. -->
-
-
-
preview:   <!-- ≤ 90 characters; adds what the subjects don't say -->
