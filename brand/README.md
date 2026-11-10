# Robotics MENA — Brand Pack v1.0

Upload this folder to your site as `/brand/`. Every logo is a vector SVG with outlined type, so it needs no fonts and looks identical everywhere. The whole pack is under 300 KB.

## 1. Paste into <head>
```html
<link rel="icon" href="/brand/icons/favicon.ico" sizes="48x48">
<link rel="icon" href="/brand/icons/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/brand/icons/apple-touch-icon.png">
<link rel="mask-icon" href="/brand/icons/safari-pinned-tab.svg" color="#26246E">
<link rel="manifest" href="/brand/icons/site.webmanifest">
<meta name="theme-color" content="#26246E">
<meta property="og:image" content="https://roboticsmena.com/brand/social/og-image.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/brand/tokens/brand.css">
```

## 2. Logo in the header
Fixed colour:
```html
<a href="/"><img src="/brand/logo/lockup-horizontal-indigo.svg" alt="Robotics MENA" height="40"></a>
```
Colour that follows your tokens and theme (recommended):
```html
<a href="/" class="rm-logo" aria-label="Robotics MENA"></a>
<a href="/" class="rm-logo rm-logo--bilingual" aria-label="Robotics MENA"></a>
```
Change `--rm-brand` in brand.css and the logo, buttons and links all follow.

## 3. What is in here
| Folder | Contents |
|---|---|
| logo/ | symbol, horizontal, stacked, bilingual and Arabic lockups in indigo / black / white / paper (SVG) |
| logo/png/ | @2x PNGs for email and other places that can't take SVG |
| icons/ | favicon.svg (adapts to dark mode), favicon.ico, Apple touch icon, PWA icons, manifest |
| social/ | 1200×630 link-preview image and 800×800 profile avatar (SVG + PNG) |
| tokens/ | brand.css (CSS variables plus light/dark themes) and tokens.json (for Figma, native apps and email builders) |

## 4. Rules
- Minimum size: 16 px for the symbol, 24 px height for a lockup.
- Clear space: one shoulder-joint diameter on every side.
- Use one colour only: indigo on paper or white, paper or white on indigo, black when printing is limited. Never use gradients, outlines, shadows, or recolour individual parts.
- Never redraw, re-pose or stretch the arm. Never retype the wordmark: always use the files.
- Bilingual lockup: Arabic sits left of the symbol and English right, both reading outward from the arm. Use `lockup-arabic-*` on Arabic-only pages.

Colours: Indigo #26246E (PMS 2755 C nearest match; check it against a physical swatch before printing). Paper #F3F1EC. Ink #111216.
Fonts: IBM Plex Sans, IBM Plex Sans Arabic and IBM Plex Mono. All are free under the SIL Open Font License, from Google Fonts.
