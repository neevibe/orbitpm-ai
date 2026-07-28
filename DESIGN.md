# Xyrenis Design System — "Trust & Authority" v3 (Enterprise Refinement)

Generated with the ui-ux-pro-max design engine for an enterprise B2B project
management platform (Jira/Zoho Projects-class). All UI work must calibrate
against this file; deviations are review findings.

v3 shift (2026-07): bright/playful → muted/analytical. Deep desaturated blue
primary, subtle semantic tints (deep text on faint washes — never neon pills),
crisp bordered surfaces instead of floating shadows, Tableau-style chart
palette, Xyro docked as an integrated side panel.

## Identity

- **Style:** Trust & Authority — professional, conservative accents, dense but calm.
- **App chrome is blue/slate.** Purple belongs to exactly one thing: **Xyro**, the
  AI mascot (its avatar only). Never purple/indigo gradients in app chrome,
  cards, buttons, or panel headers — including Xyro's own panel chrome.
- **Classifier:** APP UI (workspace-driven, data-dense). Calm surface hierarchy,
  strong typography, few colors, cards only when the card is the interaction.

## Color (CSS variables in `src/app/globals.css` — never raw hex in components)

| Role | Light | Dark | Token |
|------|-------|------|-------|
| Primary / accent | `#1e40af` (deep blue) | `#3b82f6` (brighter for contrast) | `--color-x-accent` |
| Accent hover | `#1e3a8a` | `#60a5fa` | `--color-x-accent-hover` |
| Accent tint | `#eef2fb` | `rgba(59,130,246,.15)` | `--color-x-accent-light` |
| Success | `#15803d` on `#e9f4ee` | `#34d399` on rgba | `--color-x-success(-light)` |
| Warning | `#b45309` on `#fbf3e4` | `#fbbf24` on rgba | `--color-x-warning(-light)` |
| Danger | `#b91c1c` on `#faeceb` | `#f87171` on rgba | `--color-x-danger(-light)` |
| Background | `#f8fafc` (slate-50) | `#0b1220` | `--color-x-bg` |
| Surface | `#ffffff` | `#0f1a2e` | `--color-x-surface` |
| Border | `#e2e8f0` (slate-200) | `#1e293b` | `--color-x-border` |
| Text | `#0f172a` (slate-900) | `#f1f5f9` | `--color-x-text` |
| Text secondary | `#475569` | `#cbd5e1` | `--color-x-text-secondary` |
| Text muted (AA) | `#64748b` | `#94a3b8` | `--color-x-text-muted` |

Rules: semantic color carries signal only — zero values render neutral. Never
color-only encoding (pair with icon/label). Status/priority chips are **deep
text on faint tints with hairline borders** — solid bright pills are banned.
Dark mode uses elevated navy-slate surfaces, never pure black.

## Chart palette (`src/lib/chart-theme.ts` — the only place chart hex lives)

- Status: Not Started `#94a3b8` · In Progress `#4e79a7` · On Hold `#e8a838` ·
  Delayed `#d1615d` · Completed `#59a14f` (desaturated, Tableau-style).
- Health: on-track `#59a14f` / at-risk `#e8a838` / delayed `#d1615d`.
- Priority: Critical `#d1615d` · High `#e8823c` · Medium `#e8c144` · Low `#59a14f`.
- Geometry: bars 20px (12px stacked), radius 2px; donut inner/outer 44/58 with a
  center KPI; axis ticks 11px `#64748b`; grid hairlines only.
- Legends live in the widget header (2px-radius swatch + 10.5px label), not
  inside the plot. Tooltips: dark slate card (`#0f172a`, 6px radius, 12px text).

## Typography

- **Family:** Inter for body/data (dense, tabular numerals); Plus Jakarta Sans
  (`--font-display`) for page titles & brand moments; JetBrains Mono for IDs/dates.
- **Scale** (tokens in `@theme`): display 28px/700 · page title 20px/700 ·
  h3 15px · body 13px · meta 12px · label 11px uppercase tracking +0.05em.
- Body floor is 11px; all numerals in KPIs/tables use `tabular-nums`.

## Layout & spacing

- 8-point grid; card padding 16–20px; grid gaps 12–16px.
- Radius: cards 8px (`--radius-md`), controls 8px, panels 14–16px. Crisp beats soft.
- **Surfaces sit IN the page:** 1px `--color-x-border` does the work; shadows are
  near-zero (`--shadow-xs` on hover only). No floating card look.
- KPIs use the **compact strip** (`x-kpi-strip`/`x-kpi-cell`): one bordered
  container, hairline-separated cells (label 11px uppercase, value 20px
  tabular, inline colored delta text) — ~76px tall, click-to-filter preserved.
- Left rail 212px (64px collapsed) · topbar 52px — driven by `--sidebar-w`.
- Dashboard tiers: Portfolio (`/command-center`) · Personal (`/my-work`) ·
  Project (`/projects/[id]`). Widget columns must balance — no dead space.

## Elevation & motion

- Elevation is for overlays (modals, menus, toasts) — not resting cards.
- Interactive rows/cards: border-color + background shift on hover; no lift/scale.
- Motion 150–300ms, `transform`/`opacity` only, `prefers-reduced-motion` respected.

## System status & alerts

- Degraded state (offline copy) = slim 36px banner under the topbar
  (`SystemBanner`), dismissible, with Retry — never a red pill inside a page
  header. Pages show at most a dot + one word ("Live" / "Offline copy").
- CRUD feedback = bottom-right toasts; destructive actions get inline Undo.

## Xyro (AI assistant)

- **Docked right-side panel** (400px, border-l, surface bg, no glassmorphism),
  opened via the topbar "Ask Xyro" button or **Ctrl/⌘+J**, closed with Esc.
- No floating bubble, no auto-popup greetings, no obstruction of data.
- Mascot appears small (avatar in the panel header and message rows) — brand
  warmth without cartoon chrome. Chat replies: no markdown tables/headings.

## Collaboration (Microsoft Teams)

- Owner avatars carry **live presence dots** (green/red/amber via Graph) only
  when the viewer has connected Microsoft — never fabricated presence.
- Rows in actionable lists (e.g. Stuck Projects) expose **Share to Teams** on
  hover: opens the Teams share composer pre-filled with the project link and a
  blocker summary. Meeting/email actions live on task rows (Outlook modal).
- Roadmap pattern (not yet built — do not fake it): a unified activity feed
  logging automated alerts posted to Teams channels, rendered as a timeline
  widget with per-alert deep links.

## Components

- Use `x-*` primitives: `x-card`, `x-kpi-strip`/`x-kpi-cell`, `x-metric`
  (legacy KPI card), `x-table`, `x-badge-*`, `x-priority-*`, `x-status-*`,
  `x-btn`, `x-input`, `x-skeleton`, `x-toast`.
- KPI trend deltas: colored text (`up` green / `down` red / `warn` amber /
  `flat` gray) computed from real data, never invented.
- Loading = skeletons matching final layout.
- Icons: lucide-react only. **Never emoji as icons** (chat message *content*
  stays warm but emoji-free in canned copy).

## Anti-patterns (hard rejects)

Purple/indigo gradient chrome · emoji as icons · fabricated chart/trend/presence
data · red/amber styling on zero values · `outline: none` without focus ring ·
placeholder-as-label · text under 11px · hardcoded hex in components (charts:
only via `chart-theme.ts`) · solid bright status pills · floating-card shadows on
resting surfaces · consumer chat-bubble AI patterns · markdown tables in Xyro
chat replies.
