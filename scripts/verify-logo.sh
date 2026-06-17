#!/usr/bin/env bash
# Logo consistency guard — fails if the LOCKED logo is altered or used inconsistently.
# Run manually:  bash scripts/verify-logo.sh
# Runs automatically as a git pre-commit hook (see .githooks/pre-commit).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

fail() { echo "❌ LOGO GUARD: $1"; echo "   The logo is LOCKED (tag logo-final-v1). See LOGO-LOCKED.md."; exit 1; }

# 1) Locked asset bytes must be unchanged.
if ! shasum -a 256 -c .logo-locked/CHECKSUMS.sha256 >/dev/null 2>&1; then
  fail "a locked logo asset was modified (checksum mismatch). Restore: git checkout logo-final-v1 -- public/logo-*.png src/app/icon.png"
fi

# 2) No display code may reintroduce the abandoned /logo.svg (it renders tiny).
if grep -rn 'src="/logo\.svg' src/ --include="*.tsx" --include="*.ts" >/dev/null 2>&1; then
  fail "found a reference to /logo.svg — that file is abandoned. Use /logo-mark.png (light) or /logo-mark-white.png (dark)."
fi

# 3) Each logo <img> must point at an approved variant.
APPROVED='logo-mark\.png|logo-mark-white\.png|logo-full\.png|logo-full-white\.png|logo-icon\.png'
if grep -rEn 'src="/logo[^"]*\.(png|svg|jpg|jpeg|webp)"' src/ --include="*.tsx" --include="*.ts" \
   | grep -vE "$APPROVED" >/dev/null 2>&1; then
  echo "Offending references:"
  grep -rEn 'src="/logo[^"]*\.(png|svg|jpg|jpeg|webp)"' src/ --include="*.tsx" --include="*.ts" | grep -vE "$APPROVED" || true
  fail "a logo <img> uses a non-approved asset."
fi

echo "✅ LOGO GUARD: assets intact and all references consistent."
