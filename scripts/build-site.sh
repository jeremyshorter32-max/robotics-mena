#!/usr/bin/env bash
# Builds the deployable site into _site/.
# If SITE_PASSWORD is set, every page is encrypted behind a password screen.
# If PUBLIC_LAUNCH=true, the site is published openly (no password).
# If neither is set, the build stops, so the site is never published unprotected by accident.
# DEV=1 builds an unprotected copy for local previews only (never used by the deploy workflow).
set -euo pipefail
cd "$(dirname "$0")/.."

# Fixed salt (not secret) so "Remember me" keeps working across pages and deploys.
SALT="fe91cbfea197c5c38048c73f478b0de4"

rm -rf _site
mkdir _site
cp -r *.js vendor CNAME .nojekyll .image-slots.state.json _site/
node scripts/validate-data.mjs
node scripts/assemble.cjs _site

if [ "${DEV:-}" = "1" ]; then
  echo "DEV=1: local preview build, no password."
  exit 0
fi

if [ "${PUBLIC_LAUNCH:-}" = "true" ]; then
  echo "PUBLIC_LAUNCH=true: publishing without a password."
  exit 0
fi

if [ -z "${SITE_PASSWORD:-}" ]; then
  echo "::error::SITE_PASSWORD secret is not set. Refusing to publish the site without a password."
  echo "Set it in GitHub: Settings > Secrets and variables > Actions > New repository secret."
  exit 1
fi

# Keep search engines out while private.
printf 'User-agent: *\nDisallow: /\n' > _site/robots.txt

npx --yes staticrypt@3.5.4 _site/*.html -d _site \
  --password "$SITE_PASSWORD" --short --salt "$SALT" --config false \
  --remember 30 \
  --template-title "Robotics MENA · Private preview" \
  --template-instructions "This site is in private preview. Enter the password to continue." \
  --template-button "Enter" \
  --template-placeholder "Password" \
  --template-remember "Remember me on this device for 30 days" \
  --template-error "Incorrect password" \
  --template-color-primary "#5B4BF5" \
  --template-color-secondary "#F2F3F7"

# Ask crawlers not to index the password screen itself.
sed -i 's#<head>#<head><meta name="robots" content="noindex, nofollow">#' _site/*.html
echo "Encrypted $(ls _site/*.html | wc -l) pages."
