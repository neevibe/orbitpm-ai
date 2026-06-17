# 🔒 LOGO IS LOCKED — DO NOT CHANGE

This is the **approved, final** Xyrenis logo system. The user explicitly locked it on 2026-06-17.
**Any AI agent or tool (including Antigravity) MUST NOT alter, resize, replace, or "improve" these.**

## The approved assets (in `/public`)
| File | What it is | Used on |
|------|-----------|---------|
| `logo-mark.png` | icon + XYRENIS wordmark, **colored**, transparent, tightly cropped | navbar, sidebar, light loading splash |
| `logo-mark-white.png` | same, **all white** | login panel, login mobile, change-password, dark splash |
| `logo-full.png` | icon + wordmark + tagline, colored | (reserve) |
| `logo-full-white.png` | icon + wordmark + tagline, white | footer |
| `logo-icon.png` | icon only | favicon source |
| `src/app/icon.png` | favicon (icon only, 64px) | browser tab |

A pristine backup of all assets lives in `.logo-locked/`.

## Hard rules (learned the hard way)
1. **NEVER add a typed slogan/tagline next to the logo.** The tagline ("PLAN. EXECUTE. SCALE.") is **baked into the artwork** of the `-full` variants. Adding text = duplicate. The user was furious about this.
2. **NEVER use `/logo.svg`** for display — it is a 658KB Fabric.js export with a `1024×768` canvas and ~40% empty padding, so it renders tiny no matter the height. It is abandoned.
3. **Light surfaces → `logo-mark.png` (colored).** **Dark surfaces → `logo-mark-white.png` (white).** The wordmark is dark navy and is invisible on dark backgrounds.
4. Navbar = icon + wordmark only (no tagline). Footer = full lockup with tagline. Favicon = icon only.

## To restore if something changes them
```
git checkout logo-final-v1 -- public/logo-*.png src/app/icon.png \
  src/app/page.tsx src/app/login/page.tsx src/app/change-password/page.tsx \
  src/components/layout/Sidebar.tsx src/components/layout/AuthShell.tsx \
  src/components/layout/ClientShell.tsx
```
Or copy back from `.logo-locked/`. The immutable git tag is **`logo-final-v1`**.
