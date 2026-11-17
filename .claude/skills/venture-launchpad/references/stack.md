# The stack: what is used, what it costs, who sets it up

Everything below ran Robotics MENA from first commit to public launch and after. The only bill was the domain.
Plan limits change: when a limit matters to a decision, check the provider's current pricing page rather than
trusting the figures here (they are as understood in November 2026).

## Proven at Robotics MENA

| Need | Service | Cost | Limits worth knowing | Set up by |
|---|---|---|---|---|
| Hosting | GitHub Pages, deployed by a GitHub Action | Free on a public repository | Private repository needs GitHub Pro (~$4/month). Static files only. | Owner: Pages source and domain (step 1). Claude: workflow. |
| CI and scheduled checks | GitHub Actions | Free and unmetered on public repositories | Private: a monthly minute allowance (a deploy takes about a minute). | Claude |
| Private preview | StatiCrypt (run by `npx` in the build) | Free | Encrypts the HTML pages only. Files under `media/` and the repository stay readable. | Claude; owner sets the `SITE_PASSWORD` secret |
| Domain | Any registrar; DNS stays there | ~$10 to $15 a year | Leaving DNS at the registrar means existing email records are never touched. | Owner |
| Forms without a backend | FormSubmit (`formsubmit.co/ajax/<address>`) | Free | Needs a one-time activation click from the inbox. The address is visible in page code until switched to FormSubmit's alias. | Claude; owner clicks the email |
| Sign-up list and light CRM | Google Sheet + Apps Script web app | Free | The web app must be "Execute as: Me, access: Anyone". Each code change needs "New version" on the deployment. | Owner (step 3), script by Claude |
| Analytics | GoatCounter | Free for non-commercial use | No cookies or personal data, so no consent banner. Commercial projects should check its terms. | Owner (step 4) |
| Search indexing | IndexNow ping after each deploy; Google Search Console; Bing Webmaster Tools | Free | IndexNow needs only a key file on the site. Search Console needs a verification tag kept in the head. | Claude; owner verifies (step 6) |
| Recurring research and writing | Claude scheduled tasks running the project's skills | Included in the owner's Claude subscription | Uses the plan's usage allowance; a busy day can delay a run. Each run is a fresh cloud session that must be able to reach the repository. | Claude creates the tasks |
| Admin portal | Cloudflare Worker on `workers.dev` | Free | Generous daily request allowance, far above one owner's use. | Claude deploys |
| Portal sign-in | Cloudflare Access (Zero Trust free plan) | Free for small teams | May ask for a card at sign-up; nothing is charged. One-time PIN works immediately; Google sign-in can be added later. | Owner (step 5) |
| Portal's repository access | A GitHub App installed on the one repository | Free | Private key lives only in the Worker's secrets. | Owner creates (step 5c) |
| Newsletter | Kit (kit.com) free plan, double opt-in form | Free at small list sizes | Needs sender-domain DNS records; check them against existing email records. | Owner (step 8), script by Claude |
| Social scheduling | Buffer free plan, or each platform's own scheduler | Free | Three channels, a short queue per channel: enough for one week at a time. Reddit is always posted by hand. | Owner |
| Fonts, flags, maps | Google Fonts; flag-icons (MIT); world-atlas topojson, D3 | Free | Vendor JavaScript libraries into `vendor/` with integrity hashes rather than loading from a CDN. | Claude |
| Images, cards, PDFs | Playwright with Chromium (preinstalled in Claude cloud sessions), PIL | Free | Used for browser checks, social cards, report PDFs. Not a project dependency. | Claude |

## Deliberately not used

- **The Anthropic API for recurring work.** An API-driven weekly scanner was built first (about $1 to $3 a run) and
  then left switched off in favour of scheduled tasks on the subscription. The portal cannot start anything that
  bills.
- **A server, database or CMS.** The repository is the database; pull requests are the editing workflow.
- **A login on the public site.** A static site cannot keep a secret, so the admin lives on a separate address
  behind an identity provider. The site's "sign up to read" gate is a soft wall for lead capture, and the docs say so.
- **Moving DNS to Cloudflare.** Not needed for a `workers.dev` portal, and it risks the owner's email.
- **A headless-browser dependency in CI** for monitors. Blocked checks are reported as "check by hand" instead.

## Options not used at Robotics MENA (untested here; weigh before adopting)

- Cloudflare Web Analytics instead of GoatCounter for a commercial project.
- A custom portal address (`admin.<domain>`) once DNS is at Cloudflare.
- Auto-publishing social posts through platform APIs (each needs an app review or a paid tier).
- Serving a truly private archive from the Worker with emailed signed links, if a soft gate isn't enough.

## Who does what

**Claude, in the repository:** all code, data, research, images, copy, tests, the deploy workflow, the portal
code and deployment (when a Cloudflare connection exists), scheduled tasks, pull requests.

**Owner, in a browser (with Claude in Chrome clicking):** buying the domain and adding DNS records; GitHub Pages
source and the preview password; clicking the FormSubmit activation; deploying the Sheets web app; GoatCounter,
Cloudflare, Kit and social sign-ups; creating the GitHub App; verifying with search engines; web-filter
submissions; and approving everything agents draft.

**Never by an agent:** creating accounts, solving captchas, entering payment details, merging its own pull
requests, sending a newsletter, posting or replying on social, taking the password off.
