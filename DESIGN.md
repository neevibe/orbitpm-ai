# Xyrenis Design System — "Trust & Authority"

Generated with the ui-ux-pro-max design engine for an enterprise B2B project
management platform (Zoho Projects-class). All UI work must calibrate against
this file; deviations are review findings.

## Identity

- **Style:** Trust & Authority — professional, conservative accents, dense but calm.
- **App chrome is blue/slate.** Purple belongs to exactly one thing: **Xyro**, the
  AI mascot (launcher, chat panel, greeting). Never use purple/indigo gradients in
  app chrome, cards, or marketing sections.
- **Classifier:** APP UI (workspace-driven, data-dense). Calm surface hierarchy,
  strong typography, few colors, cards only when the card is the interaction.

## Color (CSS variables in `src/app/globals.css` — never raw hex in components)

| Role | Light | Dark | Token |
|------|-------|------|-------|
| Primary / accent | `#2563eb` (blue-600) | `#3b82f6` (desaturated) | `--color-x-accent` |
| Accent hover | `#1d4ed8` | `#60a5fa` | `--color-x-accent-hover` |
| Success | `#059669` | same | `--color-x-success` |
| Warning | `#f59e0b` | same | `--color-x-warning` |
| Danger | `#dc2626` | same | `--color-x-danger` |
| Background | `#f8fafc` (slate-50) | `#0b1220` | `--color-x-bg` |
| Surface | `#ffffff` | `#0f1a2e` | `--color-x-surface` |
| Border | `#e2e8f0` (slate-200) | `#1e293b` | `--color-x-border` |
| Text | `#0f172a` (slate-900) | `#f1f5f9` | `--color-x-text` |
| Text secondary | `#475569` | `#cbd5e1` | `--color-x-text-secondary` |
| Text muted (AA) | `#64748b` | `#94a3b8` | `--color-x-text-muted` |

Rules: semantic color carries signal only — zero values render neutral. Never
color-only encoding (pair with icon/label). Tailwind classes use the `blue-*`
scale (blue-600 = the primary). Dark mode uses elevated navy-slate surfaces,
never pure black; text is off-white.

## Typography

- **Family:** Plus Jakarta Sans (headings + body), JetBrains Mono for IDs/dates/code.
- **Scale** (tokens in `@theme`): display 28px/800 · title 22px/800 tracking -0.025em ·
  h3 15px · body 13px · meta 12px · label 11px uppercase tracking +0.06em.
- Body floor is 11px; numbers in tables use `font-mono` or `tabular-nums`.

## Layout & spacing

- 8-point grid; card padding 18–20px; grid gaps 12–16px.
- Radius: cards 12px (`--radius-lg`), controls 8px, panels 16px.
- Left rail 212px (64px collapsed, auto below 1024px) · topbar 52px — both driven
  by `--sidebar-w`.
- Dashboard tiers: Portfolio (`/command-center`) · Personal (`/my-work`) ·
  Project (`/projects/[id]`). Widget columns must balance — no dead space.

## Elevation & motion

- Multi-layer shadows (`--shadow-xs…xl`), dark-theme variants included.
- Interactive cards: hover = -2px translate + shadow-lg, 200ms `--ease`.
- Motion 150–300ms, `transform`/`opacity` only, `prefers-reduced-motion` respected.

## Components

- Use `x-*` primitives: `x-card`, `x-metric` (icon + value + label + semantic
  trend chip), `x-table`, `x-badge-*`, `x-priority-*`, `x-btn`, `x-input`,
  `x-skeleton`, `x-toast`.
- KPI trend chips: `up` (green) / `down` (red) / `warn` (amber) / `flat` (gray) —
  deltas must be computed from real data, never invented.
- Loading = skeletons matching final layout. CRUD feedback = bottom-right toasts;
  destructive actions get inline Undo.
- Icons: lucide-react only. **Never emoji as icons.**

## Anti-patterns (hard rejects)

Purple/indigo gradient chrome · emoji as icons · fabricated chart/trend data ·
red/amber styling on zero values · `outline: none` without focus ring ·
placeholder-as-label · text under 11px · hardcoded hex in components ·
markdown tables in Xyro chat replies.
