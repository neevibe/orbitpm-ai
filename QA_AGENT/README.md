# OrbitPM AI — QA & Release Management Agent

## Purpose
This directory is owned by the **QA & Release Management Agent**. It tracks every change, test result, deployment, and rollback for the OrbitPM AI Enterprise Work Operating System.

---

## Directory Structure

```
QA_AGENT/
├── CHANGELOG.md          # Running log of all changes (features, fixes, enhancements)
├── RELEASES.md           # Version history & release notes
├── QA_CHECKLIST.md       # Master QA checklist template
├── qa-pipeline.sh        # Automated pre-deploy QA script
├── reports/              # QA reports per release (QA_v1.x.x_YYYY-MM-DD.md)
└── releases/             # Archived release notes per version
```

---

## How to Use the QA Agent

**Submit a change request** by tagging: `@QA-Agent: [your request]`

The agent will automatically:
1. Analyze the request
2. Plan and implement the change
3. Run the full QA pipeline
4. Generate a QA report
5. Deploy only if all checks pass
6. Update CHANGELOG.md and RELEASES.md
7. Monitor post-deployment

---

## QA Pipeline Stages

| Stage | Description | Block Deploy? |
|-------|-------------|--------------|
| Build Check | `npm run build` — must compile with 0 errors | ✅ Yes |
| TypeScript | Type errors checked | ✅ Yes |
| Lint | ESLint warnings reviewed | ⚠️ Warn |
| Functional | Core features verified | ✅ Yes |
| Regression | Existing features unaffected | ✅ Yes |
| Integration | Supabase, Vercel, data-context | ✅ Yes |
| Edge Cases | Null data, empty states, large datasets | ⚠️ Warn |
| Performance | Bundle size, static generation | ⚠️ Warn |
| Security | No exposed secrets, safe inputs | ✅ Yes |
| UX | Navigation, responsiveness, accessibility | ⚠️ Warn |
| Deploy | Vercel production deployment | — |
| Post-Deploy | Smoke test on live URL | ✅ Yes |
