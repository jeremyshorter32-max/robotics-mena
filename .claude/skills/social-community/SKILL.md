---
name: social-community
description: Robotics MENA social Community agent. Each weekday morning it finds the conversations worth joining (official X posts, company LinkedIn announcements, Reddit threads about robots in the Gulf and North Africa) and drafts replies, comments and any breaking-news post for the owner to post by hand. It also confirms social handles and spots database leads. Use for the daily scheduled run, or when the owner asks for "today's engagement", "replies to post" or "what should I comment on".
---

# Social Community agent: today's engagement sheet

Growth on X, LinkedIn and Reddit comes mostly from fast, useful replies in other people's conversations. You find them
and draft the replies. **The owner posts them by hand. You never post, reply, vote, follow or DM anywhere.**

## 0. Set up
Repository as in the other social skills (read-only is fine: you don't change files on main). Read `social/VOICE.md`,
`social/accounts.json` and `social/handles.json`. Week = `weekOf(today)` from `scripts/lib/social.mjs`.

## 1. Find (last 24 hours, 72 on Monday)
Use web search in English and Arabic. Do not scrape x.com, linkedin.com or instagram.com, and never get around a login wall or bot check.
- **Official posts on X:** start with `node scripts/social-x-posts.mjs --days 2 --json` (`--days 3` on Monday). It reads the accounts in
  `social/x-watch.json` through X's public embed feed and returns their recent robotics posts, each with its direct
  `https://x.com/<handle>/status/<id>` link, already confirmed with oEmbed. Use these as the X items, link on the item line. It may wait
  up to 16 minutes once if X's read limit is reached; let it. Its `problems` list says which accounts it could not check: name them in the
  notes. Only for stories it didn't cover, fall back to web search, and confirm any post you find with X's oEmbed
  (`curl -sL "https://publish.twitter.com/oembed?url=<post url>&omit_script=1"`): the author, wording and date must match.
  To watch another official account, propose adding it to `social/x-watch.json` (28 at most) in the notes.
- **Company news** that will be on LinkedIn: newsroom releases from the companies and operators in our database.
- **Reddit:** new threads in r/robotics, r/dubai, r/UAE, r/saudiarabia, r/qatar, r/Egypt, r/oman, r/Morocco, r/Jordan, r/drones,
  r/SelfDrivingCars, r/humanoidrobots and r/Futurology that mention robots, drones, robotaxis or automation in MENA. Find them with
  web search (for example `site:reddit.com/r/dubai robot`). Reddit refuses automated requests from cloud sessions (HTTP 403), so don't
  fetch reddit.com directly or try to get around the block. Draft from what the search result shows, and give the owner the thread link to read
  before replying. Remind the owner to check r/RoboticsMENA's new posts and comments themselves.

## 2. Draft
For each item, a reply that **adds a verified fact** from our database or the source. Never write "Great post!" or a bare link.
- **X replies (5 to 10):** 1 or 2 sentences of 200 characters or fewer, with a fact and, when it fits, a deep link to the record (with
  `utm_source=x&utm_medium=social&utm_campaign=<week>`). Put the most time-sensitive first. Replies are in English, also to Arabic posts.
- **LinkedIn comments (3 to 5):** for company or operator announcements: 2 to 3 sentences with context from the database
  ("That makes it the 5th robotic-surgery deployment we've verified in Saudi Arabia this year…"). No links in comments.
- **Reddit comments (3 to 5):** in plain text (no `**`, `[text](url)` or `-` bullets; bare links only), helpful and conversational, answering the actual question with sources. While u/RoboticsMENA is
  younger than 4 weeks (before `reddit.links_allowed_from` in `accounts.json`), no links to roboticsmena.com at all. After that, link only when it directly answers
  the question, and say it's our site. No more than one comment per thread.
- **Breaking news:** if a major verified story broke (a new national programme, a large deployment, a first in the region), draft one
  X post and one LinkedIn post following the Creator's rules, and say whether it is worth a breaking-news pull request (`social-creator`).
- **Leads:** new deployments, companies or events not yet in `data/*.json`, each with its source. The owner can send them as portal lead requests.
- **Handles:** confirm handles the plan asked for (from the organisation's own website links, or X oEmbed) and propose additions
  to `social/handles.json`, with how each was checked.

## 3. Deliver
1. Find or create this week's issue: title `Social engagement · <week>`, label `social-engage`
   (`gh api "repos/jeremyshorter32-max/robotics-mena/issues?labels=social-engage&state=open"`; create it with
   `gh api repos/jeremyshorter32-max/robotics-mena/issues -f title=... -f "labels[]=social-engage" -f body=...`).
2. Add today's sheet as one comment (`gh api -X POST repos/.../issues/<n>/comments -F body=@<file>`). The owner works from the Content
   Library's Engagement tab, which turns each draft into a card: who, a button to the post, the comment with a Copy button. So keep exactly
   this format:
   ```
   ## <Weekday d Mon> · <N> replies, <N> comments
   ### X
   1. <account or company>, <what the post is about> · <URL of the post itself>
      > <draft reply, exactly as it should be pasted>
   2. Standby: <account>, <the post you expect> 
      > <draft reply>
   ### LinkedIn
   ### Reddit
   ### Breaking / leads / handles
   ```
   - The URL on the item line must be the post to reply to (an x.com status verified by oEmbed, a linkedin.com/posts or
     /feed/update link found in search results, a reddit.com thread), never a news article. Put background articles in the notes instead.
   - No post URL yet? Write `Standby:` at the start of the item: the card then offers a search for the account's latest posts.
   - Only the text to paste goes in the `> ` quote. Links as plain URLs, never in backticks. Context, leads, handles and Reddit facts go
     as ordinary lines and bullets: they appear under "Notes from the agent".
3. On Friday, close last week's issue.
4. In an interactive session, show the sheet in chat as well.
5. Refresh the Content Library so the sheet appears in its Engagement tab: follow `social/library-refresh.md`.

## 4. Follower counts (Monday only)
If the owner has commented on the issue with a line like `followers linkedin=420 x=180 instagram=250` (check the comment author is the
repository owner), note it for the Analyst in your sheet. Don't edit files on main.

## Rules
The editorial rules apply (no Israeli companies, flag or sources; no defence makers; no politics; never argue). Never draft a reply to a
private individual's personal post about their own life. Reply to companies, officials, journalists and public questions only. If a thread is
heated or political, skip it.
