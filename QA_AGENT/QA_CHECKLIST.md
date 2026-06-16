# OrbitPM AI — Master QA Checklist

This checklist defines the validation steps required for any release of the OrbitPM AI platform.

---

## 1. Functional Testing

- [ ] **KPI Dashboard View**:
  - [ ] Dashboard cards display correct statistics (total projects, active tasks, critical, budget).
  - [ ] Sticky panel or filters change the values appropriately.
- [ ] **Project Management (CRUD)**:
  - [ ] Create new project: validations on empty/invalid inputs.
  - [ ] Project ID follows correct code prefix rules (e.g., Operations = `PROPS`, no zero padding).
  - [ ] Edit existing project: updating fields updates the UI state.
  - [ ] Project Split Wizard: splits are percentage-based, total percentage equals 100%, split group IDs are tracked correctly.
- [ ] **Command Center**:
  - [ ] Stuck Projects section shows projects with deadlines ≤ 30 days.
  - [ ] Clicking any stuck project opens the Quick Edit side panel.
  - [ ] Clicking any critical in-progress project opens the Quick Edit side panel.
  - [ ] Quick Edit sidebar updates status, priority, progress, owner, and saves successfully.
  - [ ] Link to "Open Full Project Detail" works and goes to `/projects/[id]`.
- [ ] **AI Copilot (`/ai-assistant` or popup chat)**:
  - [ ] Chatbot responds to queries with accurate and rich formatting (markdown, bold text).
  - [ ] Handles complex natural language queries about delayed, overdue, or upcoming projects.
  - [ ] Clear chat and copy-to-clipboard functionality works.

---

## 2. Regression Testing

- [ ] **Authentication & Data Layer**:
  - [ ] Data context compiles correctly and initializes values.
  - [ ] Supabase connection is secure, falling back to mock data gracefully if unavailable.
- [ ] **Sidebar & Layout**:
  - [ ] Top-left project count displays live project count (currently 173).
  - [ ] Navigation links to Dashboard, Projects, Analytics, Workforce, Risk Register, etc., function without throwing 404s.
- [ ] **Dark Mode / UI System**:
  - [ ] CSS Custom Variables (`var(--color-x-...)`) are parsed correctly.
  - [ ] Dark mode toggle does not break layout or styling.

---

## 3. Integration Testing

- [ ] **Data Flow**:
  - [ ] Project updates in the Quick Edit panel immediately reflect in dashboard stats without requiring page refresh.
  - [ ] State is synchronized between pages.
- [ ] **Vercel Deployment Integration**:
  - [ ] Code builds without warnings or errors.
  - [ ] Static pages compile correctly.

---

## 4. Edge-Case & Error Handling

- [ ] **Empty States**:
  - [ ] UI gracefully handles empty arrays for projects, tasks, or risks.
- [ ] **Boundaries**:
  - [ ] Progress slider values capped between 0% and 100%.
  - [ ] Splits with negative numbers or non-numeric entries are blocked.
  - [ ] Date pickers handle past dates or empty date inputs.

---

## 5. Performance Checks

- [ ] Next.js static asset optimization.
- [ ] Large page rendering speed (FCP, LCP).
- [ ] No recursive react renders or state updating loops.

---

## 6. Security Validation

- [ ] No environment variables or credentials exposed in front-end client components.
- [ ] Proper escaping of inputs to prevent XSS.

---

## 7. User Experience Verification

- [ ] Side panel opens and closes with smooth CSS animation (`slide-in-right`).
- [ ] Backdrops/overlays prevent clicking background elements accidentally while sidebar is open.
- [ ] Text contrast and responsive scaling on mobile/tablet viewports.

---

## 8. Visual / Layout Polish — the nitty-gritty (MANDATORY every release)

> The `qa-pipeline.sh` checks (tsc + lint + build) do **NOT** catch visual defects.
> These require a real-browser pass via the preview tool at desktop width (1280–1440px)
> **and** tablet (768px). Measure, don't eyeball — e.g. `table.getBoundingClientRect().right <= innerWidth`.
> Trust screenshots/measurements at a real width, never near-zero auto-measurements.

- [ ] **No clipped content** — every table column (especially the last / Progress / actions) is fully visible; nothing cut off at the right edge. Wide tables use `overflow-x-auto` and scroll rather than clip.
- [ ] **Hover states don't overlap** — row action buttons (edit / more) that appear on hover stay inside their own column and do **not** overlap the Progress bar, %, or adjacent cells. The actions column must be wide enough for all buttons + right padding.
- [ ] **Proportional columns** — `table-fixed` widths sum sensibly; no large empty gaps; long names/owners **truncate** with ellipsis (+ `title` tooltip) instead of wrapping or stretching the layout.
- [ ] **Sidebar ↔ content alignment** — the nav width matches the content offset (`Sidebar w-[N]` == `AuthShell ml-[N]` == `Topbar left-[N]`). No gap or overlap; nav labels never wrap.
- [ ] **Alignment & spacing** — consistent padding and row heights; badges, icons, and text vertically centered; watch for 1–2px misalignments.
- [ ] **No stray scrollbars** — no unexpected horizontal scrollbar on the page; modals and dropdowns stay within the viewport.
- [ ] **Per-changed-page sweep** — for every page touched in the release, open it in the preview, screenshot at 1440px and 768px, and confirm all of the above.
