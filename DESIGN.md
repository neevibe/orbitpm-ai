# Xyrenis Design System — "Modular Command" v5 (Command Center)

Generated with the ui-ux-pro-max design engine for an enterprise B2B project
management platform (Jira/Zoho Projects-class). All UI work must calibrate
against this file; deviations are review findings.

v5 shift (2026-09): **bands → modular widget grid**. v4 stripped the cards and
produced a wireframe — restraint without craft is just absence. The modular
widget grid IS the enterprise PM idiom (Zoho/Jira-class) and it is what an
executive reads fluently. v5 restores that structure and spends the craft on ONE
shell used everywhere:

- **One widget shell.** `.x-widget` — titled header, hairline rule, consistent
  padding and radius. The previous failure was never that cards existed; it was
  that each one styled itself.
- **Status framed open-vs-closed.** Three donuts with a centre total (Project
  Status, Portfolio Health, Milestone Status) — the shape executives already
  read without a key, direct-labelled with counts in the legend.
- **Stat tiles, not paint boxes.** Colour lives in the icon plate and the delta
  only; the figure stays ink, so six tiles do not read as a colour chart.
- **Dense grid, not airy bands.** 12px gutters, widgets sized to content, the
  overdue register capped at 8 rows with "View all" so the row keeps a
  predictable height.

Superseded — v4 shift (2026-09): **widget soup → bands**. v3 established the right tokens and
then spent them on eleven boxes of equal weight, so the reader had no idea which
number mattered and read none of them. v4 keeps every v3 token and changes the
COMPOSITION:

- **Whitespace and hairlines carry structure, not borders.** A surface
  (`.x-card`, `.x-brief`) is spent only where the surface IS the interaction.
  Sections are separated by `--space-8` rhythm and a single rule under the band
  heading.
- **One loud element per band.** The lead figure in the metric rail is 40px; the
  other five are 24px and divided by hairlines. Six identical KPI cards with six
  colored icon chips are banned.
- **Decision order, not data order.** The Command Center reads: what needs a
  decision → where the portfolio stands → what needs attention → distribution →
  what's next. The delay register is the widest band on the page because delay
  is what the product exists to surface.
- **Charts earn their place.** The portfolio donut was replaced by a horizontal
  part-to-whole meter: it reads in one pass, direct-labels every segment with a
  real count, and costs a third of the vertical space. A chart that only
  decorates gets deleted.

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


## v4 composition layer (`src/app/globals.css`)

| Class | Role |
|-------|------|
| `.x-bands` | Page shell. Vertical rhythm at `--space-8`; every child gets `min-width: 0`. |
| `.x-band-head` / `.x-band-title` | Section label + hairline rule. Names the band, never competes with it. |
| `.x-rail` / `.x-rail-lead` | Metric rail. One lead figure, the rest hairline-divided. |
| `.x-meter` | Horizontal part-to-whole bar, 2px surface gaps between segments. |
| `.x-attn` / `.x-sev` | Delay register. Severity = stripe opacity + written days + sort order. |
| `.x-brief` | Executive briefing — the one tinted surface on the page. |
| `.x-facts` / `.x-fact-value` | Supporting evidence row under the briefing lead. |
| `.x-microbar` | Inline progress. Track uses `--color-x-border` so low values still read. |
| `.x-skel` | Skeleton shimmer, disabled under `prefers-reduced-motion`. |

### Spacing scale

`--space-1..9` = 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 px. Arbitrary margins
are a review finding. Section rhythm is `--space-8`; content inside a section is
`--space-4`.

### The flexbox/grid trap

Both flex AND grid items default to `min-width: auto`, which lets an inner
`overflow-x: auto` scroller push the whole page sideways instead of scrolling
inside itself. `.x-bands > *`, `.x-brief > *` and `.x-facts > *` all set
`min-width: 0` for this reason. Any new band container must do the same — this
was a real 7px horizontal scroll at 420px, invisible at desktop width.

### Colour in charts must be theme-aware

`TRACK` in `chart-theme.ts` is a fixed light hex and glares white on the dark
surface. Neutral remainder segments use `var(--color-x-border)` instead. Fixed
hexes are acceptable for the semantic status/health colours (they are legible on
both grounds) and nowhere else.
