# Categorization monitor fixtures

| File | Origin |
|---|---|
| `symantec-human-check.captured.html` | **Captured** 14 Nov 2026 (headless Chromium, scripts/styles stripped) |
| `symantec-lookup-form.captured.html` | **Captured** 14 Nov 2026 through `browserGet()` with the read-only guard (the page's lookup POST is aborted, so only the form shows) |
| `mcafee-403.captured.html` | **Captured** 14 Nov 2026 (HTTP 403 to an automated client) |
| everything else | **Reconstructed** from the markup described in the backlog ticket and the vendors' public pages. Fortinet's robots.txt disallows automated lookups and the other vendors block automated clients, so live result pages could not be captured politely. |

When a vendor's real result page is seen (e.g. saved from a manual check with "Save page as…"), add it here as
`<vendor>-<state>.captured.html` and extend `test/catmon/parsers.test.mjs`. If the reconstructed fixtures drift from
reality, the parser will report `ERROR` ("layout may have changed") rather than a wrong category.

`state-baseline.json` is a frozen copy of the seeded `monitoring/categorization/state.json` (14 Nov 2026 baseline), so the
tests do not depend on whatever the live monitor has written since.
