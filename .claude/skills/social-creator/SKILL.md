---
name: social-creator
description: Robotics MENA social Creator. Turns the week's plan into ready-to-post content for LinkedIn, Instagram, X and Reddit (copy in English, branded cards, LinkedIn PDF carousels, Instagram Reels), validates it, renders the images and opens one pull request for approval in the admin portal. Use for the Sunday social run (after social-strategist), or when the owner asks to "write the social posts", "make a post about <x>", "redo <post>" or "draft a breaking-news post".
---

# Social Creator: write, design, validate, send for approval

You write every post in `social/queue/<week>.json` and render its images. Nothing is posted by you. The owner approves the
pull request in the admin portal and then schedules or posts. Read `social/VOICE.md` and the week's `social/plans/<week>.md` first.

## 0. Set up
Same as the Strategist (repository, `npm install`). Work on the branch `social/<week>`. If `social/plans/<week>.md` is missing,
run the `social-strategist` skill first.

## 1. Write the queue
Create or update `social/queue/<week>.json` (copy the shape of the newest existing week). One entry per planned slot:
- `id` `w<NN>-<platform short>-<slug>` (li, ig, x, rd), `platform`, `format`, `pillar`, `slot` (`YYYY-MM-DDTHH:MM+04:00`),
  `lang` (`en`; posts are English only while `social/cadence.json` languages is ["en"]), `status: "draft"`, the copy, `cards`, `sources` (`{name, url}`), and optionally `tags`, `media_note` and `first_comment`.
- **Copy per platform** (the limits are checked by the validator):
  - LinkedIn: `text` with a hook under 210 characters, ▸ bullets, 3 to 5 hashtags at the end. Links go in `first_comment`, never in `text`. A `document`
    post is a carousel (3 or more cards, which becomes a PDF). A `poll` needs `poll.question` and 2 to 4 `poll.options` of 30 characters or fewer.
  - X: `text` (post) or `thread` (list of posts), each 280 weighted characters or fewer (a link counts as 23). 0 to 2 hashtags. A country flag emoji leads a signal.
  - Instagram: `text` is the caption (hook first, in English, 5 to 8 specific hashtags, "link in bio"). Use `carousel` with 2 to 20
    `portrait` cards, or `reel`, which needs `story`-size cards and becomes an MP4 slideshow. Always add a `media_note` reminding the owner to add a trending audio track.
  - Reddit: `subreddit`, `title` and `text` (markdown). It's a person talking: no hashtags, no emoji, no UTM tags. Disclose
    that roboticsmena.com is ours. Outside r/RoboticsMENA, at most 1 post a week may link to our site, and only once the account is 4 weeks old.
- **Links** to roboticsmena.com carry `utm_source=<platform>&utm_medium=social&utm_campaign=<week>` (except on Reddit). Deep-link to records:
  `/database?tab=deployments&id=<id>`, `/database?tab=companies&id=<id>`, `/policy?c=<CC>`, `/spotlight?s=<id>`, `/map`, `/events`.
- **@-mentions** on X and Instagram only for handles in `social/handles.json`. Otherwise name the organisation in plain text and put
  "tag if confirmed: <org>" in `tags`. On LinkedIn, write the organisation's name and list it in `tags`, because the owner picks the company page when posting.
- **English only for now** (owner, 14 Nov 2026). Write every post, card and kit text in English. Use companies' English names as the site
  does. Arabic comes back only when `social/cadence.json` languages includes "ar"; then use the site's Arabic spellings (`title_ar`, `operator_ar`).

## 2. Cards (images)
Each card in `cards` is a spec rendered by `scripts/social-cards.cjs` (the header of that file lists the fields):
`cover` (dark, carousel opener), `signal` (kicker, title, body, source), `stat` (big `value` and `label`), `bars` (ranked `rows` from the database),
`list` (up to 5 `items`), `cta` (closing slide). Sizes: `portrait` (LinkedIn and Instagram feed), `story` (Reels and Stories),
`landscape` (X), `square`. `**bold**` in a title shows in the brand colour. Every factual card has a `foot` with "Source: <name>, <date>".
- **Photos lead (design v2).** Give every signal, deployment and cover card an `image` when `social/images.json` has a cleared photo
  of that company, operator or programme. Only images listed there can be used: company or government press images, or the owner's own.
  The renderer prints "Photo: <credit>" itself. Set `caption: true` when the photo is illustrative rather than of the exact story, so the
  credit also says what it shows. Never use a photo that implies something false (another company's robot on a "deployed at X" card, or
  stand photos for an event the photo isn't from). To add an image, check its source page, add it to `media/` and `social/images.json` with
  credit, `shows` and `source`. Never newspaper or agency photos, and never AI-generated images of real people, places or robots.
  Layouts: photo band over text (portrait, square, story), split text and photo (landscape), indigo-toned cover (`cover` + `image`),
  and a photo mosaic on `cta` slides. Cards render as JPEG.
- Counts and rankings are computed from `data/*.json` on the day you write them (use node one-liners), never from memory, and the
  card's foot says "Source: roboticsmena.com, <date>".

## 3. Check and render
1. `node scripts/social.mjs validate <week>`: fix every error. Fill every empty slot or explain why in the queue's `notes`.
2. Fact-check: every number, name and date in the copy must appear in the cited source or in `data/*.json`. Open each source URL
   you haven't already checked this week (`curl -sL -o /dev/null -w "%{http_code}"`). Remove anything you can't verify.
3. `node scripts/social-cards.cjs week <week>` (about a minute). Look at a few rendered PNGs (Read the image) to catch layout
   problems: text cut off, an empty slide, a wrong credit.
4. `node scripts/social.mjs validate <week> --media` must pass.
5. `node scripts/social.mjs preview <week>` writes the posting pack `social/out/<week>.html` (not committed).
6. Rebuild the Content Library (`node scripts/social-library.mjs`, see `social/README.md`). In an interactive session, republish it to
   the owner's existing Content Library artifact (its URL is in `social/README.md`).

## 4. Send for approval
1. Commit `social/queue/<week>.json`, `social/cards/<week>/`, the plan and any reports to `social/<week>` (repository author, attribution trailer). Push.
2. Open the pull request (REST): `gh api repos/jeremyshorter32-max/robotics-mena/pulls -f title="Social: week <NN>" -f head=social/<week> -f base=main -F body=@<file>`,
   with the body from `node scripts/social.mjs pack <week> > <file>` plus a short note on the theme and experiment. Only `social/` may change
   in this pull request, so the portal can approve it.
3. In an interactive session, also send the owner the posting pack (SendUserFile, display "render"), and list anything that needs their action
   (handles to confirm, footage to film, accounts still to create).
4. **Approval = the owner merging the pull request in the portal.** Never merge it yourself.

## Breaking news (on request, or from the Community agent)
For a major verified story mid-week: add posts to the current week's queue with `status: "draft"` on a branch `social/<week>-<slug>`,
then validate, render and open a small pull request titled "Social (breaking): <headline>". Speed matters, but never skip the source check.

## Rules
CLAUDE.md applies: no Israeli companies, flag or sources (the validator checks this); no defence or weapons makers while that is open; no politics.
Follow `social/VOICE.md`. Never invent a quote, number, date or handle.
