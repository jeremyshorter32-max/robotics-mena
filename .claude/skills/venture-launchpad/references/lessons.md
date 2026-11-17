# Lessons from building Robotics MENA

Each of these cost time or a fix the first time. They are grouped by the phase where they bite.

## Set-up and accounts
- **Start the owner's steps on day one.** DNS, certificates, account verifications and the FormSubmit activation
  all have waits that no amount of building shortens.
- **Register the domain early.** "Newly registered domain" is a block category on corporate networks for about a
  month after registration.
- **Leave DNS at the registrar.** The portal runs on `workers.dev`, so the owner's email records are never at risk.
- **Google account mix-ups:** Apps Script fails with "file cannot be opened" when several Google accounts are
  signed in. A private window with one account fixes it.
- **Apps Script changes need a new version:** Deploy → Manage deployments → edit → "New version". The address
  stays the same. Saving alone changes nothing.
- **FormSubmit delivers nothing until the activation link is clicked**, and it shows the inbox address in page
  code until switched to the alias.
- **Cloudflare's free Zero Trust plan may ask for a card.** Warn the owner; nothing is charged.
- **Keys go page to page.** The GoatCounter token, the GitHub App key and the Kit key were never pasted into a chat.

## Build
- **Don't hard-code anything that dates.** Week labels, counts, "new" flags and sample dates all went stale
  within days and were audit findings. Derive them.
- **The build must refuse to publish unprotected.** Requiring either a password or an explicit launch flag
  prevented an accidental public deploy.
- **The password protects pages, not the repository or `media/`.** Say so before anything sensitive is committed.
- **Cache-bust local scripts**, or returning visitors run last week's code against this week's data.
- **Every page needs its own title and description**; make the build fail without them.
- **Match by whole words** when linking names to records (a short name matched inside longer ones).
- **Test on real phone widths, in every language.** 320px overflow and tiny badge text only showed there.
- **Unknown query values** (`?id=` that doesn't exist) should show a notice, not an empty page.

## Content
- **Never use newspaper or agency photos.** The highest-risk images had to be replaced before launch. Use the
  organisation's own press images, and add a removal link to every credit.
- **Design files contain invented numbers.** Treat every figure in the imported design as a placeholder.
- **Remove what isn't built.** "Open data & API", "About the team" and "corrections are logged" were all in the
  design and not real. Each became a must-fix.
- **One spelling per name, enforced.** The build rejects the old brand transliteration.
- **Write scope decisions down the day they are made**, with the date and who decided, and put them in the
  validator. Several were re-asked before this became the habit.
- **Sites that block automated reading** (registries, some vendors, Reddit) go on a "check by hand" list. Never
  work around a block.
- **A soft gate is not privacy.** Content behind an email box is still in the page source. Fine for lead capture;
  say it plainly.

## Agents and portal
- **Scheduled sessions may start without the repository.** The first unattended runs were all "missed" for this
  reason. Every skill attaches the repository first, and every new task is fired once by hand.
- **Runs must log themselves**, or a silent failure looks the same as a quiet week.
- **Use what the session actually has for GitHub.** In those cloud sessions GraphQL was unavailable and REST
  worked. Test the pull-request step, don't assume.
- **Agents wrap values in backticks and quotes.** The run log strips them from links and summaries.
- **Portal approvals only cover content folders.** An agent pull request that touches code can't be approved there
  by design; agents must say so in the pull request.
- **Cap work per run** (three requests, reports count double) so one run stays within the plan's allowance.
- **Subscription over API.** The API-key scanner was built and never switched on once scheduled tasks existed.
- **Jitter the minutes.** Tasks at :00 queue behind everyone else's.
- **A scheduled task's own prompt is never approval** to send or publish. Only the owner's merge or message is.

## Social
- **Agents can't create accounts**, and shouldn't post. Draft, validate, render; the owner posts.
- **Reddit:** new accounts are restricted, links to your own site are rationed, Markdown pastes literally, and
  cloud sessions can't read it.
- **Start in one language** and have the validator enforce it; the owner switched to English-only on day one.
- **Cards were redesigned photo-led within a day**, which is only possible with an allow-list of cleared images.

## Launch
- **List the open backlog before the password comes off**, every time, and let the owner choose.
- **Submit to web filters on launch day** and log each vendor's answer; several need a free account.
- **Keep the Search Console tag** in the head forever.
- **A monitor that can't read a page should say "check by hand"**, not guess.

## Working with the owner
- Batch questions; give exact values and paste-ready prompts; report in plain words what is live, what is waiting
  on them, and what happens next.
- Record every decision in the backlog with its date. It is the project's memory across sessions.
