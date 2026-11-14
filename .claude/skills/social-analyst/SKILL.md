---
name: social-analyst
description: Robotics MENA social Analyst. Records follower counts on LinkedIn, Instagram, X and Reddit, measures pace against the 10K milestones, reads post performance and the week's experiment, and writes the weekly numbers report the Strategist plans from. Use at the start of the Sunday social run, or when the owner asks "how are we growing", "are we on track" or gives new follower counts.
---

# Social Analyst: numbers first

## 0. Set up
Repository as in the other social skills. Branch `social/<coming week>` (create it from main if it doesn't exist).

## 1. Collect
1. **All four platforms come from the owner.** There is no free API access, and Reddit refuses automated requests from cloud sessions
   (HTTP 403), so never try to fetch the numbers. Use a line like `followers linkedin=420 x=180 instagram=250 reddit=40` (reddit = r/RoboticsMENA members)
   in chat, or in an owner comment on the week's `social-engage` issue (check the author is the repository owner).
2. If a count is missing, leave it blank.
   If there are no counts newer than 8 days, ask for them in the report (one line) and carry on.
3. Record: `node scripts/social.mjs metrics add linkedin=<n> instagram=<n> x=<n> reddit=<n> --date <YYYY-MM-DD>` (only platforms you have).
4. **Post performance (optional, when available):** CSV or screenshot exports the owner drops into `social/insights/<week>/`
   (LinkedIn page analytics, Instagram insights, X analytics). Per post: impressions, engagement rate, follows gained.
5. **Site traffic from social:** if a GoatCounter API token is configured in this session, get visits with `utm_medium=social` per
   campaign. If not, say so in one line.

## 2. Write `social/reports/<week>.md`
- A table per platform: count, change on the week, the weekly rate needed for 10K by its target date, the next milestone, and on pace ✓ or behind ✗
  (from `node scripts/social.mjs metrics report`).
- The top 3 and bottom 3 posts of the week with one line on why (format, topic, time, language), if there is data.
- The result of last week's experiment (from `social/plans/<last week>.md`), stated plainly, including "inconclusive".
- 2 to 4 recommendations for the Strategist.
Keep it to one screen. Commit to the branch (repository author, attribution trailer). The Strategist runs next.

## Rules
Never estimate a follower count you weren't given. Leave it blank. Never use tools or sites that require logging in as the owner.
