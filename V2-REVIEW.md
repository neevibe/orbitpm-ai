# Xyrenis v2 — Review Build (NOT in production)

Branch: `feature/v2-hierarchy-financials-deps` · Production (`xyrenis-ai.vercel.app`) is **untouched**.

## How to review
Open the **preview deployment** while signed in to your Vercel account (neevibe):
the latest `vercel deploy` (preview, `target: null`) URL. It runs against the
same Supabase data but **does not change the live site**.

## What changed (all 6 enhancements)

1. **Department → Subdivision hierarchy** (`src/lib/org-structure.ts`)
   - Operations → F&B, Retail, Landside Commercial
   - BASL → CBB, 080 Lounge & Hotels (CBB folded in from a standalone vertical)
   - Digital & Data shown as **Digital Experience**
   - Done as a *display/config layer* so production data is unchanged until rollout.

2. **Sub-department field** — conditional dropdown in the create/edit modal; shows
   only when the chosen department has subdivisions. On the Projects page the
   subdivision shows as a chip per row and on the department header (hover).

3. **Financial value tracking (₹)** — Budget / Expected Revenue-Savings / Actual
   Value Delivered, with lakh–crore formatting (`₹ 25,00,000`, `₹ 2.4 Cr`).
   Shown on the project-details page and a portfolio rollup on the dashboard.

4. **Mandatory create fields** — new projects require Name, Department,
   Sub-department (if applicable), Owner, Priority, Start, Expected End, Status,
   Budget, and at least one Dependency. Enforced on **create only** (existing 173
   projects stay editable).

5. **Dependency wizard** (`DependencyBuilder.tsx`) — Internal (pick department →
   employees) / External → Within BIAL (Finance/ICT/HR/Operations/Projects/
   Marketing) or Outside BIAL (category + free-text party). Stored for analytics.

6. **Workforce overload** — counts only active work (excludes Completed/Archived).
   Bands: 0–7 Healthy · 8–10 Moderate · 🔴 11+ Overloaded (red badge + warning).

## ⚠️ Important constraints
- **One shared Supabase DB** backs both prod and preview. So the destructive
  hierarchy changes (rename dept, move CBB projects) are **NOT applied** — they
  live as `supabase/migrations/0004_v2_hierarchy.sql` (do-not-run) and as a
  display layer in the preview.
- New-field **persistence** needs the additive, zero-risk
  `0003_v2_fields.sql` (nullable columns). Until it's run, the preview shows the
  new fields working in-session but they won't save across reloads.

## To go live (after your approval)
1. Run `0003_v2_fields.sql` (additive columns — safe).
2. Wire `/api/projects` to read/write the new columns (small change, ready to add).
3. Run `0004_v2_hierarchy.sql` (the dept rename + CBB move) and reconcile the
   config per the notes in that file.
4. `vercel --prod`.
