# Website forms → Google Sheet

Every form on the site (newsletter sign-ups, the Spotlight gate, the Submit page and Work with us)
still emails contact@roboticsmena.com through FormSubmit. Once this is set up, each one is **also**
added as a row to a Google Sheet, one tab per form, with Status and Notes columns for follow-up.

## Set-up (about 5 minutes, once)

1. Sign in to Google with the account that owns the Sheet (a private/incognito window with only
   that account signed in avoids Google's "file cannot be opened" error).
   The Sheet in use: https://docs.google.com/spreadsheets/d/1Af2GzhWl5YkrGS-XZ46HMJ3MlFqK2V1kAqFL9stzqXI/edit
2. Go to **script.google.com → New project**. Delete the sample code, paste in everything from
   [`Code.gs`](Code.gs) (it already points at the Sheet above via `SHEET_ID`), name the project
   "Robotics MENA forms" and click **Save**. To use a different Sheet, change `SHEET_ID`.
3. Click **Deploy → New deployment**. Click the gear next to "Select type" and choose **Web app**.
   - Description: `Website forms`
   - Execute as: **Me**
   - Who has access: **Anyone**  (the website's visitors are not signed in to Google)
4. Click **Deploy**, then **Authorize access** and allow it. Google may warn that the app is
   unverified: choose **Advanced → Go to (project name)**. It is your own script, and it can only
   write to this one Sheet.
5. Copy the **Web app URL** (it ends in `/exec`). Open it in a browser: you should see
   `{"ok":true,...}`.
6. Put that URL in `data/site.json` as `sheet_url` (or send it to Claude to do), then publish.

The tabs (**Sign-ups**, **Submissions**, **Work with us**) and their columns are created
automatically on the first entry. New form fields become new columns. Repeat sign-ups from the
same address are marked **Repeat** in the Status column.

## Using it as a simple CRM

- **Status**: starts as `New`. Change it as you work, e.g. `Contacted`, `In progress`, `Done`.
  Data → Data validation can turn it into a dropdown.
- **Notes**: anything you want to remember.
- **Filters**: Data → Create a filter, then filter by Status or date.
- **Email when a row arrives**: Tools → Notification settings → "Notify me … when any changes are
  made" (you already get the FormSubmit email, so this is optional).
- **Mailing tools**: Mailchimp, Brevo and most others can import the Sign-ups tab as a CSV
  (File → Download → CSV), or connect to the Sheet directly.

## Changing the script later

Edit the code in Apps Script, then **Deploy → Manage deployments → (pencil) → Version: New version
→ Deploy**. The URL stays the same, so the site needs no change.

## Notes

- The Sheet is private to your Google account; the web app can only append rows.
- Free Google accounts allow tens of thousands of web app calls a day, far more than the site needs.
- If the Sheet URL is empty in `data/site.json`, the site simply skips this step and keeps emailing.

## Admin portal metrics (optional)

The admin portal's Metrics tab can show sign-up counts (never names or emails). After pasting the latest `Code.gs`:
1. Project Settings → Script properties → add `STATS_KEY` with a long random value.
2. Deploy → Manage deployments → edit the web app → Version: **New version** → Deploy (the URL stays the same).
3. In Cloudflare (Workers → roboticsmena-admin → Settings → Variables and secrets) add the secrets `SHEET_STATS_URL`
   (the `/exec` URL) and `SHEET_STATS_KEY` (the same random value).
