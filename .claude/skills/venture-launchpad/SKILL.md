---
name: venture-launchpad
description: Master playbook for turning a concept and branding from Claude Design into a complete, live, self-running web venture on free services, the way Robotics MENA was built - data-driven static site on GitHub Pages behind a preview password, lead capture, privacy-friendly analytics, scheduled Claude agents that research and draft on the owner's subscription, a private admin portal for approvals, newsletter, social desk and launch plumbing - with a paste-ready owner checklist and Claude in Chrome prompts for every account only the owner can create. Use this whenever the user wants to spin up, launch, bootstrap or scaffold a new site, product, directory, tracker, publication or "solution" from a Claude Design project or handoff, says "do what we did for Robotics MENA", "set this up like Robotics MENA", "run the launchpad", or asks to add one of its parts (admin portal, scheduled agents, forms, social desk, launch checklist) to a new project, even if they don't name the skill.
---

# Venture launchpad

Takes a concept and brand designed in Claude Design and delivers what sits behind Robotics MENA
(roboticsmena.com): a live site fed by structured data, agents that keep it current, a private portal where the
owner approves their work, and the launch plumbing around it. Running cost: the domain, and nothing else.

You do the building. The owner makes decisions and creates the accounts only a person can create. The skill is
organised so those two tracks run **in parallel**, because the owner's steps (DNS, account sign-ups, confirmation
emails) are the slow path and nothing else should wait on them.

## What you are building

| Layer | What | Free service |
|---|---|---|
| Site | Pages from Claude Design + `data/*.json` + a build that validates data before every deploy | GitHub Pages + Actions |
| Private preview | Every page encrypted behind one password until launch | StatiCrypt |
| Capture | Sign-up and submission forms to an inbox and a spreadsheet | FormSubmit + Google Sheets |
| Trust | Privacy page, editorial and corrections page, image credits | none |
| Analytics and search | Cookie-free traffic; sitemap, share tags, structured data, instant indexing | GoatCounter, IndexNow, Search Console, Bing |
| Agents | Skills run by Claude scheduled tasks: research, weekly brief, requests, reports, social | The owner's Claude subscription (no API key) |
| Admin portal | Approve, send back or reject agent pull requests; requests; backlog; metrics; schedule | Cloudflare Workers + Access, a GitHub App |
| Growth | Newsletter, social desk with weekly content and daily engagement drafts | Kit, Buffer (free plans) |

`references/stack.md` has the limits of each free plan, what was chosen against, and who does each step.

## The principles that made it fast and cheap

These explain most of the decisions below. When a new project needs something the playbook doesn't cover, decide
with these.

1. **Everything is data.** Content lives in `data/*.json`; pages only render it. One edit updates every page, agents
   can add content without touching layout, and the portal can show a record-by-record preview of any change.
2. **A bad record can't deploy.** The validator runs on every build, so a mistake stops the deploy instead of
   breaking the live site. Encode every rule you can (required sources, allowed categories, exclusions) there rather
   than in instructions someone has to remember.
3. **Agents draft; the owner approves; git is the audit log.** Every agent output is a pull request. Nothing is
   merged, sent, posted or published by an agent. The portal can only merge data changes, never code.
4. **Subscription, not API.** Recurring work runs as Claude scheduled tasks on the owner's plan. Don't add an
   Anthropic API key, a server, a database or a paid SaaS unless the owner asks.
5. **Keep the design as designed.** Wire the Claude Design pages to data through the build. Don't re-implement them
   in a framework: that costs days and loses fidelity.
6. **Private until ready, honest when public.** Build behind the password, audit before launch, and never publish a
   claim, number or image you can't source.
7. **The owner's time is the scarce resource.** Batch what you need from them, give exact values to paste, and never
   ask for a secret in chat.

## How to run it

Work through the phases in order, but start the owner track at the end of Phase 0 and never wait idle for it.
`LAUNCHPAD.md` in the project records progress (the scaffold creates it). If it exists, read it first and resume
from the first unticked line; if it doesn't, this is a new project: start at Phase 0. Tick lines as they are
verified and log decisions there.

The session's skill list may include another project's agents (for example Robotics MENA's `weekly-scan`). Those
belong to that project: don't run them here. This project gets its own in Phase 4.

If the user asks for only one part ("add the admin portal to this repo"), do that part: scaffold with
`--only`, read the matching reference, and skip the rest.

### Phase 0: intake (one sitting)

Read `references/intake.md`. In short, in this order:
1. Inventory what came from Claude Design (pages, brand pack, runtime files) and keep an untouched copy under
   `docs/design/`.
2. Write the concept brief from what the design already says. Ask the owner only for what you can't infer and
   only they can decide: the domain, the contact address, the languages, what the records are, what is in and out
   of scope, the update rhythm, and the time zone. Ask these together, once.
3. Write `launchpad.json` (`node <skill>/scripts/scaffold.mjs --example` shows every field).
4. Scaffold once (below), then **send the owner their set-up page straight away**
   (`docs/launch/owner-setup.md`, filled in by the scaffold): it has each step in the order that unblocks you,
   with a Claude in Chrome prompt for each. Tell them step 1 (domain and Pages) is the one to do today.

```bash
node <skill>/scripts/scaffold.mjs --config launchpad.json --out .     # in the project's git repository
npm run build && npm test
```
The scaffold writes the build pipeline, validator, deploy workflow, admin portal, Sheets script, backlog, notes and
progress file, with a placeholder page and record so the pipeline works before any real content exists. It never
overwrites existing files, so it is safe to re-run.

### Phase 1: foundation

Following `references/site.md`:
1. Move the design's pages into `pages/`, its brand files into `brand/`, and wire the pages to `window.SITE_DATA`.
2. Replace the starter schema, sample record and placeholder logic with the project's own. Sample records taken
   from the design are marked `"placeholder": true` until Phase 2 sources them; the build refuses to publish them.
3. Commit, push, and confirm the Deploy site action publishes the password-protected site once owner step 1 is done.
4. Check every page in a real browser (Playwright): each language, a 390px phone, dark theme if the design has
   one, no console errors, no horizontal scroll.

### Phase 2: content

Read `references/content.md`. Seed the data with parallel research agents, each fact tied to a source you opened and
a date; clear and credit every image; write the second language properly rather than literally. Quality over
volume: a small database where everything is verified beats a large one nobody can trust.

### Phase 3: capture and trust

`references/site.md` (forms, gate, trust pages, analytics). Forms post to FormSubmit and to the Sheet web app;
the privacy page names every processor; an editorial page says how records are sourced and corrected.

### Phase 4: agents and portal

Read `references/agents.md`, then `references/admin-portal.md`.
1. Write the project's agent skills into `.claude/skills/` by adapting the examples in
   `assets/reference/agent-skills/` (they are Robotics MENA's real ones; keep the anatomy, replace the domain rules).
2. Deploy the portal, lock it with Access, and connect the GitHub App (owner step 5).
3. Create the scheduled tasks, record their ids in `admin/scheduled-tasks.json`, and run each once by hand to
   check it opens a pull request and shows on the portal's Schedule tab.

### Phase 5: launch

Read `references/launch.md`. Audit every page as a reader would, fix the must-fix items, then list the open
`BACKLOG.md` items by section and ask the owner which to finish first. Taking the password off is the owner's
call: do it only on their explicit say-so. Then search engines and web filters (owner steps 6 and 7).

### Phase 6: growth

Newsletter (`references/agents.md`, weekly brief) and the social desk (`references/social.md`). These can wait
until after launch; Robotics MENA launched with a waitlist and added both in the following days.

## Working with the owner

- **One batch of questions, then build.** Pick sensible defaults and say what you chose; they can change it.
- **Secrets never pass through chat.** Passwords, API keys and private keys go from the page that shows them
  straight into the page that stores them (the set-up page is written this way), or through the session's secure
  credential form. Ids, URLs and audience tags are fine to send.
- **Claude in Chrome does the clicking, the owner does sign-ins.** Every prompt in the set-up page tells it to stop
  for sign-in, captcha, payment and two-factor, and to report back exactly what you need. When you write a new one,
  keep that shape: one job, every value spelled out, existing settings left alone, a clear "finish by giving me".
- **Do it yourself when you hold the access.** If the session has a connected service (GitHub tools, a Cloudflare
  connection), use it rather than sending the owner to a dashboard. Check what is connected before writing a step
  for them.
- **Keep `BACKLOG.md` current.** Deferred work goes there, grouped by section, so the portal's Backlog tab and the
  pre-launch review both work.
- **Write for a non-developer.** Plain words, dated notes, what changed and what they need to do next.

## What is bundled

- `scripts/scaffold.mjs`: stamps `assets/template/` into a repository from `launchpad.json`. Safe to re-run;
  `--only admin` (or `scripts`, `integrations`, `docs`, ...) adds one part.
- `assets/template/`: tested, project-neutral machinery. Build script with the password gate, page assembler
  (data injection, shared logic and partials, share tags, structured data, sitemap, analytics, cache-busting),
  schema-driven validator, local preview server, IndexNow ping, run log, deploy workflow, the whole admin portal
  with its tests, the Sheets script, a 404 page, and the backlog, notes, progress and owner set-up documents.
- `assets/reference/`: Robotics MENA's own domain-specific pieces as of 17 Nov 2026, to adapt rather than copy:
  the eight agent skills, the social desk (strategy, voice, account set-up, cadence, validator, card renderer,
  content library), newsletter and report-PDF scripts, the web-filter monitor, the pre-launch audit, the portal
  plan and the web-filter submission pack. They contain Robotics MENA names, rules and ids: replace all of them.
- `references/`: `intake.md`, `stack.md`, `site.md`, `content.md`, `agents.md`, `admin-portal.md`, `social.md`,
  `launch.md`, and `lessons.md` (what went wrong the first time, so it doesn't again: read it before Phase 4 and
  again before launch).

If the Robotics MENA repository itself is attached to the session, it is the fullest reference (for example
`src/logic.js` and the page layouts, which are too project-specific to bundle). The bundled copies are enough
without it.

## Finishing a session

End each session with: what is live and checked, what is waiting on the owner (by step number), and what you
will do next. Update `LAUNCHPAD.md` and `BACKLOG.md` in the same commit as the work.
