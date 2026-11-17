# Web-filter categorisation: roboticsmena.com

Work networks block new sites that their filter has never classified ("Miscellaneous", "Unknown" or "Newly registered").
Each vendor below keeps its own database, so the site has to be submitted to each one. Reviews usually take 1–3 working days.

## Paste-ready details (same for every vendor)

| Field | Value |
|---|---|
| URL | `roboticsmena.com` (if a form wants a full address: `https://roboticsmena.com/`) |
| Suggested category | **Science / Technology** (vendors name it differently; use the closest). Second choice: **News / Media** |
| Contact email | `contact@roboticsmena.com` |
| Company / name | Robotics MENA |

**Description** (for any "comments" or "reason" box):

> Robotics MENA is an independent, editorially curated research site about robotics, physical AI and automation in the Middle East and North Africa. It publishes a database of companies, deployments, events and national policy, a weekly news brief and research reports, each item linked to its primary source. Bilingual (English/Arabic). No ads, no user-generated content, no downloads or file sharing. Please classify it as Science/Technology (or News).

## Vendors, in order of how many corporate networks they cover

| # | Vendor | Where to submit | Category to pick | Account needed? |
|---|---|---|---|---|
| 1 | **Zscaler** | https://sitereview.zscaler.com/ → look up the URL → "Suggest a category" | **Science/Technology**; fallback **News and Media** | No |
| 2 | **Palo Alto Networks** | https://urlfiltering.paloaltonetworks.com/ → "Test A Site" → "Request Change" | **Computer and Internet Info** or **News** (PAN-DB has no science category) | Usually no; may ask you to sign in |
| 3 | **Fortinet (FortiGuard)** | https://www.fortiguard.com/webfilter → look up → "Request a review" / "Submit for re-rating" | **Information Technology** (fallback **News and Media**) | No |
| 4 | **Symantec / Broadcom (Blue Coat)** | https://sitereview.bluecoat.com/ → look up → "Request a review" | **Technology/Internet** (fallback **News**) | No |
| 5 | **Cisco Talos** | https://talosintelligence.com/reputation_center → look up → "Submit a Web Categorization Ticket" (https://talosintelligence.com/reputation_center/support) | **Science and Technology** (fallback **News**) | Yes: free Cisco account |
| 6 | **McAfee / Trellix** | https://sitelookup.mcafee.com/ → "Check URL" → choose a product (e.g. "Trellix Web Gateway") → "Suggest a category" | **Technical Information** (fallback **General News**) | No |
| 7 | **Netskope** | https://www.netskope.com/url-lookup → look up → "Report Miscategorization" | **Technology** (fallback **News & Media**) | No (asks for an email) |
| 8 | **Check Point** | https://usercenter.checkpoint.com/ucapps/urlcat/ | **Computers / Internet** (fallback **News / Media**) | Yes: free Check Point UserCenter account |
| 9 | **Forcepoint** | Only through the "Site Lookup Tool" in Forcepoint's support portal (support.forcepoint.com) | **Information Technology** (fallback **News and Media**) | Yes: customer support account. Skip unless a network you need uses Forcepoint; its IT team can request it for you. |

Tips:
- Look the site up first: if it already shows a sensible category (e.g. "Technology"), there is nothing to submit.
- Keep the confirmation emails or ticket numbers. Reply "done" plus any ticket numbers and I will log them in `BACKLOG.md`.
- If a specific office still blocks the site after a vendor has re-rated it, ask that office's IT team to refresh or allow-list it; local policies can override the vendor category.

## Do it with Claude in Chrome

Paste this into Claude in Chrome (it works in your own browser, so captchas and sign-ins stay with you):

```
Please submit roboticsmena.com for website categorisation with each web-filter vendor below, one at a time, in a new tab.

Details to use on every form:
- URL: roboticsmena.com (or https://roboticsmena.com/ if a full address is required)
- Category: Science/Technology, or the closest equivalent listed next to the vendor. If none fits, use News/Media.
- Email: contact@roboticsmena.com   Name/company: Robotics MENA
- Comment: "Robotics MENA is an independent, editorially curated research site about robotics, physical AI and automation in the Middle East and North Africa. It publishes a database of companies, deployments, events and national policy, a weekly news brief and research reports, each item linked to its primary source. Bilingual (English/Arabic). No ads, no user-generated content, no downloads or file sharing. Please classify it as Science/Technology (or News)."

Vendors and the category to choose:
1. Zscaler: https://sitereview.zscaler.com/ (Science/Technology; else News and Media)
2. Palo Alto Networks: https://urlfiltering.paloaltonetworks.com/ (Computer and Internet Info; else News)
3. Fortinet: https://www.fortiguard.com/webfilter (Information Technology; else News and Media)
4. Symantec/Broadcom: https://sitereview.bluecoat.com/ (Technology/Internet; else News)
5. Cisco Talos: https://talosintelligence.com/reputation_center/support (Science and Technology; else News) - needs a Cisco login
6. McAfee/Trellix: https://sitelookup.mcafee.com/ (Technical Information; else General News)
7. Netskope: https://www.netskope.com/url-lookup (Technology; else News & Media)
8. Check Point: https://usercenter.checkpoint.com/ucapps/urlcat/ (Computers / Internet; else News / Media) - needs a Check Point login

Rules:
- First look the site up. If it already has a reasonable category (technology, science, news, education), do not submit; just record the current category.
- When a captcha, a sign-in, or an account sign-up appears, stop and ask me to complete it, then continue.
- Do not create accounts or accept terms on my behalf without asking.
- Never enter any email other than contact@roboticsmena.com.
- At the end, give me a table: vendor, category before, what you requested, submitted (yes/no/skipped and why), ticket or confirmation number.
```
