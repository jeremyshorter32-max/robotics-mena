---
name: weekly-scan
description: Weekly Robotics MENA database scan run by a Claude scheduled task on the owner's subscription (no API key). Researches the past week's MENA robotics news, adds verified companies, deployments and events to data/*.json on a scan/ branch, and opens a pull request for approval in the admin portal. Use for the Saturday scheduled run or when asked to "run the weekly scan".
---

# Weekly database scan (Claude task, zero cost)

You do the research yourself in this session. Never call the Anthropic API, never use `scripts/scan.mjs` (it needs a paid
API key), never merge anything. The owner approves in the admin portal (Approvals tab), which merges your pull request.

## 0. Set up
1. If the repository is not in this session, use the `add_repo` tool (owner `jeremyshorter32-max`, repo `robotics-mena`,
   access `push`), clone it as the tool says, then call `register_repo_root`.
2. `git checkout main && git pull`. Create branch `scan/<YYYY-MM-DD>` (today, UTC).
3. Read `CLAUDE.md` and the "Content and research" section of `BACKLOG.md` (open leads to check).

## 1. Research (last 7 days, English and Arabic)
- Find new robotics, physical-AI and automation companies, deployments and events in the countries in `data/countries.json`.
- Portal requests (GitHub issues labelled `agent-request`) are handled by the daily `agent-requests` task, not here.
- Prefer official releases (WAM, SPA, QNA, ministries, regulators, company newsrooms); credible press when needed.
- Open every source and confirm the fact and date (curl with a normal browser user agent works for most news sites).
  If a page is blocked (403, bot challenge, paywall), find another source. Never get around a block.
- Rules: no Israeli companies or anything about Israel's robotics sector; no defence or weapons makers (decision pending);
  no facilities-management companies; images only from company or government press pages, never news or agency photos.

## 2. Write the records
- Follow the existing records in `data/companies.json`, `data/deployments.json`, `data/events.json` exactly (same fields,
  2-space JSON, English and Arabic text). New records get `added: <today>`; deployments get `is_new: true` and clear
  last week's `is_new`. International companies need `hq`, `hq_city`, `mena_countries`, `mena_link` (en/ar),
  `mena_source`, `mena_source_url`, `mena_date`. Every record needs a primary or credible `source_url` you opened.
- Skip duplicates (search by name and alternate spellings first). Quality over quantity: 3 solid records beat 10 weak ones.
- New companies need a logo tile in `media/logos/<id>.png` (256×256): the company's own logo, or a name tile.
- `node scripts/link-programmes.mjs --new`, and link only where a source shows the programme drives the deployment.

## 3. Check and open the pull request
1. `PUBLIC_LAUNCH=true ./scripts/build-site.sh` must pass, and `npm test` must pass.
2. Commit as the repository's usual author (copy it from `git log -1 --format='%an <%ae>'`) with the session's
   attribution trailer, then push the branch.
3. Open the pull request with the REST API (GraphQL is not available):
   `gh api repos/jeremyshorter32-max/robotics-mena/pulls -f title="Weekly scan: <n> new entries (<date>)" -f head=scan/<date> -f base=main -f body="$(cat summary.md)"`
   The body lists every new record with its country, one line on why it matters, and its source link, plus anything you
   skipped and why. Only files under `data/` and `media/` may change, or the portal cannot approve it.
4. If nothing new passed the bar, open no pull request; just say so in your final message.

Finish with a short report: what you added, what you skipped, and the pull request link.
