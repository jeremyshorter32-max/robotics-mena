# {{PROJECT_NAME}}: owner set-up

These are the steps only you can do, because they need your sign-in, your phone or your card. Everything else Claude
does in the repository. They are in the order that unblocks the most work, and every service is on a free plan
(the domain is the only thing you pay for).

**How to use this page.** Each step has a **Claude in Chrome prompt**: open Claude in Chrome, paste it, and stay nearby
for sign-ins. Claude in Chrome works in your own browser, so passwords, captchas, two-factor codes and card details
stay with you. Each prompt ends by telling you what to send back to Claude Code. **Never paste a password, API key
or private key into a chat.** Where a key is needed, the step moves it straight from one page to the other.

| # | Step | Time | Unblocks |
|---|---|---|---|
| 1 | Domain and GitHub Pages | 15 min + DNS wait | The site at https://{{DOMAIN}} |
| 2 | Form relay (FormSubmit) | 2 min | Sign-ups and submissions by email |
| 3 | Google Sheet for form entries | 5 min | A sign-up list you can work from |
| 4 | Analytics (GoatCounter) | 3 min | Traffic numbers |
| 5 | Admin portal (Cloudflare + GitHub App) | 20 min | Approving Claude's work from your phone |
| 6 | Search engines (after launch) | 10 min | Google and Bing indexing |
| 7 | Web filters (after launch) | 20 min | The site opening on office networks |
| 8 | Newsletter (Kit), optional, can wait until after launch | 20 min | Sending the brief by email |

Tick each one off in `BACKLOG.md` (or tell Claude "step 3 done") as you go.

---

## Before step 1: the repository

If https://github.com/{{REPO}} doesn't exist yet: create it at https://github.com/new (owner {{REPO_OWNER}}, no
README or licence, so it starts empty), then add it to the Claude Code session so Claude can push to it. Public
repositories get free hosting; a private one needs a paid GitHub plan.

## 1. Domain and GitHub Pages

Buy **{{DOMAIN}}** from any registrar first if you haven't: the earlier it is registered, the sooner web filters stop
treating it as "newly registered" (about 30 days). Keep the DNS at the registrar; nothing here needs it moved.

Choose the preview password yourself and keep it somewhere safe; you will type it once in step 1a.

```
Help me set up GitHub Pages for my repository {{REPO}}. Work in a new tab and stop and tell me whenever a page
asks me to sign in, confirm my password or enter a code.

1a. Open https://github.com/{{REPO}}/settings/secrets/actions and click "New repository secret". Name it
    SITE_PASSWORD. Leave the value box empty and stop: I will type the value and click "Add secret" myself.
1b. Open https://github.com/{{REPO}}/settings/pages. Under "Build and deployment", set Source to "GitHub Actions".
1c. On the same page, under "Custom domain", enter {{DOMAIN}} and click Save. Tell me what the DNS check says.
1d. Tell me which registrar manages {{DOMAIN}} (look it up at https://lookup.icann.org/en/lookup if I haven't said),
    open its DNS settings page for the domain, and add these records, leaving every existing record (especially
    MX and TXT records for email) untouched:
      A      @     185.199.108.153
      A      @     185.199.109.153
      A      @     185.199.110.153
      A      @     185.199.111.153
      CNAME  www   {{REPO_OWNER}}.github.io
    If an old A record or a "parked page" record for @ exists, show it to me and ask before removing it.
1e. Go back to https://github.com/{{REPO}}/settings/pages. If the DNS check has passed and "Enforce HTTPS" can be
    ticked, tick it. If it is still greyed out, tell me: the certificate can take up to an hour.

When you finish, list what you changed and anything that is still waiting.
```

Send back to Claude Code: "Pages is on" (and whether Enforce HTTPS is ticked yet).

---

## 2. Form relay (FormSubmit)

Nothing to sign up for. Once Claude has published the forms, it sends one test entry. FormSubmit then emails
**{{CONTACT_EMAIL}}** a confirmation link: **click it**. Nothing is delivered until you do.

Send back: "FormSubmit activated".

Later (optional, hides the address from scrapers): FormSubmit's confirmation email offers a random alias address.
Send Claude the alias URL and it replaces the address in `data/site.json`.

---

## 3. Google Sheet for form entries

```
Help me connect a Google Sheet to my website's forms. Use a new tab. If Google shows "file cannot be opened" or
mixes up my accounts, stop and tell me to retry in a private window signed in to one account only.

1. Open https://sheets.new and name the new sheet "{{PROJECT_NAME}} forms". Copy its ID: the long part of the
   address between /d/ and /edit.
2. Open https://github.com/{{REPO}}/blob/main/integrations/google-sheets/Code.gs, click "Raw" and copy all of it.
   (If the page says not found, the repository is private: stop and ask me to paste the file in.)
3. Open https://script.google.com/home and click "New project". Name it "{{PROJECT_NAME}} forms". Replace the
   sample code with what you copied. On the line that starts with  var SHEET_ID = ''  put the Sheet ID between
   the quotes. Save.
4. Click Deploy > New deployment. Click the gear next to "Select type" and choose "Web app".
   Description: Website forms.  Execute as: Me.  Who has access: Anyone.  Click Deploy.
5. When Google asks to authorize, stop and let me do it (I choose my account, then Advanced > Go to the project,
   then Allow).
6. Copy the "Web app URL" (it ends in /exec). Open it in a new tab and check that it shows {"ok":true ...}.

Finish by giving me the Web app URL.
```

Send back to Claude Code: the Web app URL (it is not a secret). Claude puts it in `data/site.json` as `sheet_url`
and sends a test entry.

**For the portal's sign-up counts** (after step 5): in the Apps Script project open Project Settings > Script
properties and add `STATS_KEY` with a long random value you make up; then Deploy > Manage deployments > edit >
Version: New version > Deploy. Put the same value and the /exec URL into Cloudflare as the secrets
`SHEET_STATS_KEY` and `SHEET_STATS_URL` (Workers > {{SLUG}}-admin > Settings > Variables and secrets).

---

## 4. Analytics (GoatCounter)

GoatCounter has no cookies and collects no personal data, so the site needs no cookie banner. It is free for
personal and non-commercial use; if this project is commercial, check its terms (a paid plan, or Cloudflare Web
Analytics, which is free, are the alternatives).

```
Help me create a GoatCounter account for my website. Use a new tab and stop for any captcha or email confirmation.

1. Open https://www.goatcounter.com/signup.
2. Code: {{GOATCOUNTER_CODE}} (if it is taken, try {{GOATCOUNTER_CODE}}-site and tell me which one worked).
   Site domain: {{DOMAIN}}. Email: {{CONTACT_EMAIL}}. Leave the password box for me to fill in.
3. After I submit, open Settings and check that the statistics are not set to be publicly viewable.

Finish by telling me the code that was accepted.
```

Send back to Claude Code: the code. Claude puts it in `data/site.json` as `goatcounter`.

**For the portal's traffic panel** (after step 5): in GoatCounter open Settings > API and create a token with only
"Read statistics" ticked. Copy it and paste it straight into Cloudflare as the secret `GOATCOUNTER_TOKEN`
(Workers > {{SLUG}}-admin > Settings > Variables and secrets). It never needs to pass through a chat.

---

## 5. Admin portal (Cloudflare + GitHub App)

The portal is where you approve what Claude drafts. There is no password to steal: Cloudflare Access only lets your
email in, and the portal can only publish data changes, never code. Full detail: `admin/README.md`.

### 5a. Cloudflare account and sign-in gate

```
Help me set up Cloudflare Zero Trust on the free plan. Use a new tab. Stop whenever a page asks me to sign in,
verify my email, or enter card details (the free plan may ask for a card; nothing is charged, and I will enter it).

1. Open https://dash.cloudflare.com/sign-up and create an account with {{CONTACT_EMAIL}} (I will type the
   password), or sign in if I already have one.
2. Open Zero Trust from the left menu. When asked for a team name, use {{SLUG}} (if it is taken, try
   {{SLUG}}-team). Choose the Free plan and complete the steps.
3. In Zero Trust go to Settings > Authentication > Login methods and check that "One-time PIN" is listed. Add it if
   it is not.

Finish by telling me the team name that was accepted (my team domain is <team name>.cloudflareaccess.com).
```

Send back to Claude Code: the team name. Claude then deploys the portal and tells you its address
(`https://{{SLUG}}-admin.<account>.workers.dev`). Until 5b is done, the portal refuses every request.

### 5b. Lock the portal to your email

Use the portal address Claude gave you in place of PORTAL_HOSTNAME.

```
Help me protect a Cloudflare Worker with Cloudflare Access. Use a new tab; stop if I need to sign in.

1. Open https://one.dash.cloudflare.com, then Access > Applications > Add an application > Self-hosted.
2. Application name: {{PROJECT_NAME}} admin. Session duration: 24 hours.
   Public hostname: PORTAL_HOSTNAME (subdomain and domain exactly as given, no path).
3. Add a policy named "Owner": Action Allow; Include > Emails > {{CONTACT_EMAIL}}.
4. Leave the other settings as they are and save the application.
5. Open the application's overview and copy the "Application Audience (AUD) Tag".

Finish by giving me the AUD tag and the team domain.
```

Send back to Claude Code: the AUD tag and team domain (neither is a secret on its own).

### 5c. GitHub App (lets the portal read and merge pull requests in this one repository)

```
Help me create a GitHub App for my own account. Use a new tab; stop if GitHub asks me to confirm my password.

1. Open https://github.com/settings/apps/new.
2. GitHub App name: {{SLUG}}-admin (if taken, add a short suffix and tell me).
   Homepage URL: https://{{DOMAIN}}
3. Under Webhook, untick "Active".
4. Repository permissions: Contents: Read and write. Pull requests: Read and write. Issues: Read and write.
   Actions: Read and write. (Metadata stays Read-only.) Leave everything else at "No access".
5. "Where can this GitHub App be installed?": Only on this account. Click "Create GitHub App".
6. On the app's page, note the App ID. Then click "Generate a private key" (a .pem file downloads; do not open
   or read it out).
7. Click "Install App" in the left menu, choose my account, select "Only select repositories", pick
   {{REPO}}, and install. The number at the end of the page address is the installation ID.

Finish by giving me the App ID and the installation ID. Do not show me the private key.
```

Send back to Claude Code: the App ID and the installation ID.

### 5d. Put the keys into Cloudflare

Open Cloudflare > Workers & Pages > **{{SLUG}}-admin** > Settings > Variables and secrets and add these as
**Secrets** (Claude can add all but the last through the Cloudflare connection if you prefer; ask it):

| Secret | Value |
|---|---|
| `ACCESS_TEAM_DOMAIN` | `<team name>.cloudflareaccess.com` |
| `ACCESS_AUD` | the AUD tag from 5b |
| `ROLES` | `{"{{CONTACT_EMAIL}}":"owner"}` |
| `GITHUB_APP_ID` | from 5c |
| `GITHUB_INSTALLATION_ID` | from 5c |
| `GITHUB_APP_PRIVATE_KEY` | open the downloaded `.pem` in a text editor and paste all of it. Do this one yourself. |

Then open the portal address, sign in with the emailed code, and check that **Approvals** loads.

---

## 6. Search engines (after the password comes off)

```
Help me verify my website with Google Search Console and Bing. Use a new tab; stop for any sign-in.

1. Open https://search.google.com/search-console and add a property of type "URL prefix": https://{{DOMAIN}}/
2. Choose the "HTML tag" verification method and copy the whole meta tag. Give it to me and wait: I will have it
   added to the site, then tell you to continue.
3. When I say it is live, click Verify. Then open Sitemaps and submit: sitemap.xml
4. Open https://www.bing.com/webmasters, sign in, choose "Import from Google Search Console" and import
   {{DOMAIN}}.

Finish by telling me whether Google verified and whether the sitemap shows "Success".
```

Send back to Claude Code: the meta tag (step 2). Claude adds it to `partials/head-brand.html` and publishes; then
tell Claude in Chrome to continue. **Keep the tag in the site**: removing it un-verifies the property.

---

## 7. Web filters (after the password comes off)

Office networks block sites their web filter has never classified. Each vendor keeps its own database, so the site
is submitted to each. Reviews take 1 to 5 working days. Claude logs each vendor's answer in `BACKLOG.md`.

```
Please check how each web-filter vendor below categorises {{DOMAIN}}, one at a time, each in a new tab. If it is
uncategorised, unknown or wrong, submit a request to categorise it. If it already has a sensible category, change
nothing.

Details for every form:
- URL: {{DOMAIN}} (or https://{{DOMAIN}}/ if a full address is required)
- Category: {{WEB_FILTER_CATEGORY}}, or the closest equivalent listed next to the vendor.
- Email: {{CONTACT_EMAIL}}   Name/company: {{PROJECT_NAME}}
- Comment: "{{WEB_FILTER_DESCRIPTION}}"

Vendors:
1. Fortinet: https://www.fortiguard.com/webfilter
2. Symantec/Broadcom: https://sitereview.bluecoat.com/
3. McAfee/Trellix: https://sitelookup.mcafee.com/
4. Palo Alto Networks: https://urlfiltering.paloaltonetworks.com/ (needs a free login to request a change)
5. Cisco Talos: https://talosintelligence.com/reputation_center/support (needs a free Cisco login)
6. Check Point: https://usercenter.checkpoint.com/ucapps/urlcat/ (needs a free UserCenter login)

Rules: I will solve any captcha or "verify you're human" check and do any sign-in myself; stop and ask. Do not
create accounts for me. Submit each vendor once only.

Finish with a table: vendor, category shown before, what you submitted, any ticket number.
```

Send back to Claude Code: the table. Claude logs it in `BACKLOG.md`.

---

## 8. Newsletter (Kit)

Until this is done the site runs a waitlist: sign-ups go to your inbox and the Sheet, and are imported into Kit later.

```
Help me set up a Kit (kit.com) account for a newsletter on the free plan. Use a new tab; stop for sign-in, email
confirmation or anything asking for payment (I am staying on the free plan).

1. Open https://kit.com and sign up with {{CONTACT_EMAIL}} (I will type the password).
2. In Settings > Email, set the sender name to {{PROJECT_NAME}} and the sender address to {{CONTACT_EMAIL}}.
   Start "Verify your sending domain" for {{DOMAIN}} and show me the DNS records it asks for; do not add them yet.
3. Create a Form named "Website sign-up" with double opt-in (confirmation email) switched on. Note the number in
   the form's address: that is the form ID.
4. Open Settings > Developer. Show me where the V4 API key is created, then stop: I will create and copy it myself.

Finish by giving me the form ID and the list of DNS records for the sending domain.
```

Send back to Claude Code: the form ID and the DNS records (Claude checks them against your existing email records
before you add them). The API key goes into the Google Apps Script's Script properties as `KIT_API_KEY`, with
`KIT_FORM_ID`, and into the Claude environment's secrets for `api.kit.com` when Claude asks for it through the
secure form. Never into chat.
