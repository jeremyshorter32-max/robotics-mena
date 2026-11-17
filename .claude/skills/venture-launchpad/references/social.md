# Phase 6: the social desk

Optional, and best started in launch week. Four agents plan, write and render a week of posts and draft daily
replies; the owner approves in the portal and posts. Nothing is posted, replied to or followed automatically:
platforms punish automation and the owner's voice is the asset.

Everything here adapts `assets/reference/social/` and the `social-*` skills in `assets/reference/agent-skills/`.
They are Robotics MENA's and name its handles, platforms, events and numbers. Replace all of it.

## What to create, in order

1. **`social/STRATEGY.md`** (from `STRATEGY.md`): the goal stated honestly as targets not forecasts, what counts as
   a follower on each platform, dated milestones the Analyst tracks, the position ("the X desk for Y"), what the
   project has that nobody else does (its data, verification, comparisons), three to five content pillars, formats
   per platform, the rule for changing course (for example: more than 25% behind for two months means a different
   approach, not more posts), and what is deliberately not done. Choose platforms by where the audience is; two
   done well beat four done thinly.
2. **`social/VOICE.md`**: how the project sounds, with do and don't examples, banned phrases, and the sourcing rule
   (every claim in a post traces to a record or source).
3. **`social/SETUP.md`**: the owner's account checklist, one section per platform, with the exact handle and
   fallbacks, display name, bio within the platform's limit, link with UTM tags, category, and which brand file
   goes where. The owner creates accounts (agents can't); they tell you the final handles.
4. **`social/accounts.json`**: handle, URL and `status` per platform. Only accounts marked `live` are linked from
   the site (`site.social`), the structured data and the newsletter footer.
5. **`social/cadence.json`**: the weekly slots (platform, day, time in the owner's zone, format, pillar, what it
   is) and the allowed languages. The validator warns when a week misses a slot.
6. **Tooling**, adapted from `assets/reference/scripts/`:
   - `social.mjs` + `lib/social.mjs`: validate a week's queue (length limits per platform, a source and UTM link on
     every post, checked @handles, excluded content, allowed languages), list empty slots, build the posting pack
     (a page with copy buttons and images) and the pull-request body, record follower counts.
   - `social-cards.cjs`: render branded cards, PDF carousels and short vertical videos from HTML with Playwright,
     plus profile banners and highlight covers into `brand/social/`. This is the most brand-specific file: rebuild
     its layouts from the new brand pack.
   - `social-library.mjs` + `library-template.html`: one private page (published as an artifact) with every post,
     its media, copy and download buttons, and the daily engagement sheets; `library-refresh.md` is the routine
     that rebuilds and republishes it to the same address.
   - Tests in `assets/reference/tests/social.test.mjs`.
7. **The four skills:** `social-analyst` (counts, pace, what worked), `social-strategist` (the week's plan slot by
   slot, one experiment, monthly review), `social-creator` (copy, cards, validation, the pull request),
   `social-community` (weekday morning: conversations worth joining and draft replies, posted as a comment on the
   week's engagement issue).
8. **Portal:** add `social` to `AGENT_BRANCH` and `PUBLISHABLE_PATH` (it is in the template already) and redeploy.
9. **Scheduled tasks:** a weekly social run after the brief (Analyst → Strategist → Creator in one session) and a
   weekday-morning engagement run. Add both to `admin/scheduled-tasks.json`.
10. **A launch campaign** (`campaign-launch-example.md`): profile-filling posts before launch day, a launch-week
    outreach kit (personal posts, emails and DMs for the owner to send), and templates for the first event.

## The owner's routine (write it into `social/README.md`)

- Weekly, 15 to 20 minutes: approve the week's pull request, load the posts into the scheduler from the posting
  pack.
- Weekdays, 10 to 20 minutes: open the engagement sheet, post the replies they agree with.
- Weekly: give the follower counts the agents can't read (a comment in a fixed format the Analyst parses).

## Rules that came from experience

- **Images on cards** come only from an allow-list file of cleared press images, each credited on the card.
- **One language to start**, enforced by the validator; add the second later as a growth lever.
- **Reddit is different:** people join communities, not brand accounts, so the target is members of the project's
  own community; new accounts are restricted for weeks; at most one post in ten links to your own site; posts are
  plain text (its editor pastes Markdown literally); no scheduling tools; cloud sessions usually can't read
  Reddit, so the owner supplies counts and threads.
- **Don't scrape or log in** to any platform. Find organisations' posts through search, their newsrooms and
  embeds, and verify with the platform's public embed endpoint.
- **Handles are verified** before tagging (`social/handles.json`), never guessed.
- **Paid boosts, premium tiers and API publishing** are owner decisions; list them in the backlog with costs.
- Recommend two-factor authentication on every account in the set-up checklist.
