# Release History & Version Notes

This file records all official releases of OrbitPM AI Enterprise Work Operating System.

---

## Release: v1.4.0 (2026-06-01)
- **Status**: ✅ Deployed
- **Environment**: Production (`orbitpm-ai.vercel.app`)
- **Key Changes**:
  - Redefined Stuck Projects to deadlines within 7 days (any priority).
  - Added manual dismissal action (Trash icon) to remove projects from Stuck list on both Dashboard and Command Center views.
- **QA Summary**:
  - Build status: Passed
  - Lint status: Passed
  - Functional validation: Passed (verified manual dismissal removes projects from Stuck count and list in real time)

---

## Release: v1.3.0 (2026-06-01)
- **Status**: ✅ Deployed
- **Environment**: Production (`orbitpm-ai.vercel.app`)
- **Key Changes**:
  - Replaced hardcoded "142 projects" in the sidebar with live `kpi.totalProjects` (162 projects).
  - Wired up Stuck Projects in Command Center to open the Quick Edit side panel.
  - Implemented custom slide-in animation for side panels.
  - Added semi-transparent dark overlay behind active side panels.
- **QA Summary**:
  - Build status: Passed
  - Lint status: Passed
  - Functional validation: Passed (verified row-clicking functionality across Dashboard and Command Center pages)

---

## Release: v1.2.0 (2026-05-29)
- **Status**: ✅ Deployed
- **Environment**: Production
- **Key Changes**:
  - Implemented Project Split Wizard (multi-department percentage-based allocation).
  - Standardized project ID formatting (Operations = `PROPS`, no zero-padding).
- **QA Summary**:
  - Build status: Passed
  - Functional validation: Passed

---

## Release: v1.1.0 (2026-05-14)
- **Status**: ✅ Deployed
- **Environment**: Production
- **Key Changes**:
  - Rebuilt AI Copilot query engine.
  - Added Risk Register, Departments page, Workforce view, and Analytics charts.
- **QA Summary**:
  - Build status: Passed
  - Functional validation: Passed

---

## Release: v1.0.0 (2026-05-01)
- **Status**: ✅ Deployed
- **Environment**: Production
- **Key Changes**:
  - Initial repository layout, mock data engine, routing structure, and Next.js 16 setup.
- **QA Summary**:
  - Build status: Passed
