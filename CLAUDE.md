# Robotics MENA: notes for Claude

- **Backlog:** open development items live in `BACKLOG.md`. Keep it current: tick items off when they are done
  and add new ones when work is deferred ("add this to the backlog").
- **Before going public:** when the owner asks to turn off / remove the password protection (StatiCrypt) or
  to launch the site, first list every open item in `BACKLOG.md`, grouped as it is there, and ask which ones
  to finish before the password comes off. Do not remove the password until they confirm.
- Build: `SITE_PASSWORD=testpass123 ./scripts/build-site.sh` (local test password), serve with
  `python3 scripts/serve-site.py _site 8767`. Pages are `pages/*.html` + `src/logic.js` + `data/*.json`,
  assembled by `scripts/assemble.cjs`; shared pop-up in `partials/brief-modal.html`.
- Israeli companies and the Israeli flag must never appear on the site (enforced by
  `EXCLUDED_COUNTRIES` in the validator).
