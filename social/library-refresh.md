# Refreshing the Content Library

The Content Library (**https://claude.ai/artifact/VLvATizyqX8AuX4t3WtmM2**, private to the owner) is the one place the owner works from:
the **Engagement** tab (the daily reply sheets), every week's posts, the campaigns and the profile kit. It is rebuilt from `main` and the
`social-engage` issues, then republished to the same URL. Two scheduled runs do this on their own: the daily engagement run (weekday
mornings, after it posts the sheet) and the evening portal-requests run (so posts approved during the day appear the same evening).
Any interactive session that changes social content can do it too.

## Steps
1. On an up-to-date `main` (`git checkout main && git pull`), build:
   ```
   node scripts/social-library.mjs
   ```
   The output line should list engagement sheets. If it warns "Engagement tab left out", `gh api` could not read the issues: say so in your
   report, and still publish (the posts are still current).
2. Read the artifact first (the Artifact tool refuses a publish to an artifact this session hasn't read):
   Artifact `action: "read"`, `url: "https://claude.ai/artifact/VLvATizyqX8AuX4t3WtmM2"`.
3. Publish over it with the Artifact tool:
   - `url`: `https://claude.ai/artifact/VLvATizyqX8AuX4t3WtmM2`
   - `file_path`: the absolute path of `social/out/library/index.html`
   - `root`: the absolute path of `social/out/library`
   - `files`: the JSON object in `social/out/library/publish-files.json`, exactly as it is (every image, PDF and Reel the page shows)
   - `label`: `Refresh <YYYY-MM-DD>`
   - Leave out `capabilities` (the stored `downloads` declaration carries forward) and `icon`. Never pass `force`.
4. If the publish is refused because a newer version exists, publish once more with the same inputs (this build is the source of truth;
   nobody edits the library page by hand). If it is refused again, or the Artifact tool isn't available, don't retry: add
   "Content Library not refreshed: <reason>" to your run summary.

Never put anything in the library that isn't already in `main` or in the owner's own `social-engage` issue comments, and never change the
artifact's sharing.
