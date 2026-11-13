# Robotics MENA: notes for Claude

- **Backlog:** open development items live in `BACKLOG.md`. Keep it current: tick items off when they are done
  and add new ones when work is deferred ("add this to the backlog").
- **Launched 13 Nov 2026:** the owner removed the password with every open `BACKLOG.md` item deferred. If the site is ever
  made private again and the owner asks to relaunch, first list the open backlog items, grouped as they are there, and ask
  which ones to finish before the password comes off.
- Build: `PUBLIC_LAUNCH=true ./scripts/build-site.sh` (the live site has been public since 13 Nov 2026), serve with
  `python3 scripts/serve-site.py _site 8767`. Pages are `pages/*.html` + `src/logic.js` + `data/*.json`,
  assembled by `scripts/assemble.cjs`; shared pop-up in `partials/brief-modal.html`.
- Israeli companies and the Israeli flag must never appear on the site (enforced by
  `EXCLUDED_COUNTRIES` in the validator).
