# Account set-up checklist (owner)

The agents can't create accounts. Platforms require a human to sign up, verify a phone number and pass bot checks.
This takes about an hour in total. Use **contact@roboticsmena.com** for every sign-up and turn on two-factor authentication everywhere.
Tell Claude the final handles and the LinkedIn page URL so `social/accounts.json` can be filled in.

Brand files for every profile are in `brand/social/` (made by `node scripts/social-cards.cjs banners`):

| File | Use |
|---|---|
| `profile-avatar.png` (800×800) | Profile picture everywhere (Reddit icon too) |
| `banner-x.png` (1500×500) | X header |
| `banner-linkedin.png` (1128×191) | LinkedIn page cover |
| `banner-reddit.png` (1920×384) | r/RoboticsMENA banner |
| `ig-highlight-*.png` (1080×1920) | Instagram highlight covers: Brief, Data, Deploy, Events, About |

## 1. Instagram: @roboticsmena
1. Sign up in the Instagram app with contact@roboticsmena.com and the handle **roboticsmena** (fallbacks: robotics.mena, roboticsmena_).
2. Settings → Account type → **Switch to professional account → Business**. Category: *Media/News Company*. This gives you insights and the scheduler.
3. Link it to a Facebook Page (create an empty "Robotics MENA" Page if needed). Meta Business Suite and Buffer need this to schedule posts.
4. Name: `Robotics MENA | روبوتات الشرق الأوسط`
   Bio (≤150):
   ```
   Every robot deployment in the Middle East & North Africa, verified.
   Weekly brief · data · maps
   ```
   Link: `https://roboticsmena.com/?utm_source=instagram&utm_medium=social&utm_campaign=bio`
5. Make the five highlights from the `ig-highlight-*` covers (post one Story each, add it to a highlight, then archive it).

## 2. X: @roboticsmena
1. Sign up at x.com with contact@roboticsmena.com and the handle **roboticsmena** (fallbacks: RoboticsMENA_, MENArobotics).
2. Name: `Robotics MENA`, header `banner-x.png`, location `Middle East & North Africa`, website `https://roboticsmena.com`.
   Bio (≤160):
   ```
   The MENA robotics desk. Verified deployments, companies, policy & events across the Middle East & North Africa. Weekly brief ↓
   ```
3. Settings → Your account → Account information → Category: Media & News (a Professional account, which is free).
4. Pin the launch thread after it goes out.
5. Optional: X Premium (about $8 a month) gives reply boosting and native scheduling. It's worth trying in month 2 if X lags its milestone.

## 3. Reddit: u/RoboticsMENA and r/RoboticsMENA
1. Sign up at reddit.com with the username **RoboticsMENA**. Verify the email.
2. Profile: display name `Robotics MENA desk`, about: `I run roboticsmena.com, a verified database of robots working across the Middle East & North Africa. Always happy to share sources.`
   Use the avatar and banner. Turn on "Show active communities".
3. Create the community **r/RoboticsMENA** (public). Description: `Robots, automation and physical AI across the Middle East & North Africa: deployments, companies, policy, events, jobs.`
   Upload the icon and banner, then paste the rules and flairs from `social/reddit-community.md`.
4. **New accounts are limited.** Many communities hide posts from accounts with little karma or under 30 days old, so the plan starts with comments only.

## 4. LinkedIn (already created)
1. Upload `banner-linkedin.png` as the cover and the avatar as the logo.
2. Tagline (≤120): `The MENA robotics desk: verified deployments, companies, policy and events across the Middle East & North Africa.`
3. Custom button: *Visit website* → `https://roboticsmena.com/?utm_source=linkedin&utm_medium=social&utm_campaign=page`
4. **Invite connections:** page admin view → *Grow* → *Invite to follow*. Do it on the 1st of every month, when the credits reset.
5. Add Robotics MENA as your current position (founder or editor) so the page shows on your profile.

## 5. Scheduler
- **Buffer, free plan:** connect LinkedIn (the page), Instagram (business) and X. That's 3 channels and 10 queued posts per channel, enough for a week.
  Load each week's queue from the posting pack after approving it in the portal.
- Or use each platform's own scheduler: LinkedIn page → *Schedule*; Meta Business Suite for Instagram; X Premium or X Pro.
- Reddit: post by hand, at the time in the queue. Don't use scheduling tools on Reddit.

## 6. Site and newsletter (Claude does this once the handles exist)
- Add the profile links to the site footer, the Organization structured data (`sameAs`) and the newsletter footer.
- Add "Follow on LinkedIn / X / Instagram" to the brief pop-up's thank-you step.
