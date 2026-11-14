# Social: the Robotics MENA social desk

Goal: **10K followers each on LinkedIn, Instagram, X and Reddit (r/RoboticsMENA)**. The plan is in [STRATEGY.md](STRATEGY.md),
the house style in [VOICE.md](VOICE.md), and account creation in [SETUP.md](SETUP.md).

## The agents (skills in `.claude/skills/`)

| Agent | When | Does | Output |
|---|---|---|---|
| `social-analyst` | Sun (start of the social run) | Follower counts, pace against milestones, post performance, experiment result | `reports/<week>.md`, `metrics.json` |
| `social-strategist` | Sun, after the Analyst; 1st of the month | Week plan: slot by slot, events, tags, one experiment; monthly review and plan changes | `plans/<week>.md`, `STRATEGY.md` |
| `social-creator` | Sun, after the Strategist; breaking news | Copy for all 4 platforms (English), branded cards, PDF carousels, Reels; validates; opens the pull request | `queue/<week>.json`, `cards/<week>/`, PR `social/<week>` |
| `social-community` | Mon to Fri mornings | Replies, comments and Reddit threads to join, breaking news, leads, handle checks | A comment on the `social-engage` issue |

The agents draft. **The owner approves (in the admin portal) and posts.** Nothing is published automatically.

## The owner's routine
- **Sun or Mon (15 to 20 min):** approve the "Social: week NN" pull request in the portal. Open the posting pack, load the week into Buffer
  (LinkedIn, Instagram, X) or the native schedulers, and add trending audio to Reels in Instagram.
- **Every weekday (10 to 20 min):** open the week's "Social engagement" issue. Post the replies and comments you agree with, and post Reddit items by hand.
- **Monday:** comment `followers linkedin=N x=N instagram=N reddit=N` (reddit = r/RoboticsMENA members) on the engagement issue (the Analyst records it).
- **1st of the month:** use LinkedIn's "Invite to follow" credits.

## Content Library (view and download everything)
**https://claude.ai/artifact/VLvATizyqX8AuX4t3WtmM2** (private to the owner). It shows every post from last week onwards plus campaigns, with copy buttons,
media previews, per-file downloads, a "Download all media (.zip)" button per collection, the profile kit, and a "Posted" tick per post
(remembered in your browser). Rebuild it after any change with `node scripts/social-library.mjs` (writes `social/out/library/`, not committed),
then republish `social/out/library/index.html` to that URL with `root: social/out/library`, the files listed in `social/out/library/files.json`
and the `downloads` capability.

## Design v2 and images
Cards are photo-led wherever a cleared press image exists (see `scripts/social-cards.cjs` for the layouts). Only images in `social/images.json`
can appear on a card: company or government press images and the owner's own, never newspaper or agency photos, each credited on the card.
The v2 sign-off page is https://claude.ai/artifact/Ao2fSzm4HETqS8Toybg9EU (`node scripts/social-library.mjs --review --intro <file>` builds it;
decisions are stored in its `reviews` collection, one document per post id).

## Campaigns
`campaigns/<id>.json` has the same shape as a weekly queue, plus `"campaign": "<id>"`, a `kit` of ready-to-paste copy (personal posts, emails,
DMs, checklists) and optional `"template": true` posts with `[[placeholders]]`. `campaigns/<id>.md` is the plan. The Strategist copies each campaign
post into its week's queue. Current: **launch-2026** (Launch to GITEX, 15 Nov to 14 Dec 2026).

## Tools
```bash
node scripts/social.mjs validate [week|all] [--media]   # limits, sources, utm, handles, excluded content
node scripts/social.mjs slots 2026-w48                    # cadence slots and which are empty
node scripts/social-cards.cjs week 2026-w47               # render cards → cards/<week>/ (+ PDF carousels, Reel MP4s); also a campaign id
node scripts/social-library.mjs                           # rebuild the Content Library page → out/library/
node scripts/social.mjs preview 2026-w47                  # posting pack → out/2026-w47.html (copy buttons + images)
node scripts/social.mjs pack 2026-w47                     # pull-request body
node scripts/social.mjs metrics add linkedin=420 x=180    # record counts; `metrics report` for pace
node scripts/social-cards.cjs banners                     # profile headers + Instagram highlight covers → brand/social/
```
Tests: `npm test` (`test/social/`). Every committed queue must validate and fill `cadence.json`.

## Files
`accounts.json` handles and status · `handles.json` checked @handles of organisations we tag · `cadence.json` weekly slots ·
`metrics.json` counts and milestones · `queue/` weekly posts · `cards/` rendered media · `plans/` and `reports/` agent notes ·
`reddit-community.md` rules and flairs for r/RoboticsMENA. `out/` (the posting pack) is not committed.
This folder is not published on the website.
