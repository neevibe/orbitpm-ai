# Feature Spec — Departmental Privacy · Personal Workspace · Meeting Notes · MS Teams
*Product/architecture breakdown + 360° agent review · 2026-07-28*

## Scope
1. **Departmental privacy** — users see only their department's projects, plus cross-department projects that directly depend on their work (read-only).
2. **Personal workspace** — private personal projects, user-defined custom tables, daily work diary exportable for manager presentations.
3. **Automated meeting notes** — capture + AI-structured summaries (decisions/actions), action items convertible to tasks.
4. **MS Teams integration** — per-task/project Teams conversation threads inside the app.

## Phasing (recommended)
- **Phase 0 (URGENT, independent of features):** authenticate the API layer. `GET /api/projects` currently answers unauthenticated callers with the full register via the service-role key; authorization derives from user-editable `user_metadata`; `/api/ai-chat` and `/api/notify-task` are unauthenticated. Fix before any privacy feature is meaningful.
- **Phase 1:** Departmental privacy (RLS + JWT app_metadata claims + `project_dependencies` table synced from `classified_dependencies`; API routes switch to caller-token clients).
- **Phase 2:** Personal workspace (all in-house: `personal_projects`, `custom_tables` (schema-as-data JSONB), `diary_entries`, export via existing print pipeline).
- **Phase 3:** Teams v1 (Entra app + OAuth, `teams_links` deep-links + polled read-only thread), then change-notification subscriptions.
- **Phase 4:** Meeting notes (v1 in-app: paste/upload/mic transcript → AI summary; v2 Graph transcript ingestion — requires Teams Premium/Copilot licensing + admin consent).

## User stories & acceptance criteria
(as presented in chat 2026-07-28 — see PR description for the condensed version)

- Dept member: sees only own-dept projects everywhere (lists, dashboard KPIs/charts, search, exports, Xyro answers). Exception: cross-dept projects depending on their work appear read-only with a "shared via dependency" badge. Admin sees all with an "All departments" toggle.
- User: private personal projects + custom tables (columns: text/number/date/select) + daily diary (markdown, tags), date-range export as a polished document.
- User: starts a meeting note session (mic/upload/paste) → structured summary; action items → one-click tasks (reuses task + email pipeline).
- User: sees linked Teams thread on a task/project; link/unlink channel or chat; graceful "Connect Teams" empty state.

---

# Agent Reports (verbatim)

## Design Agent
- Departmental privacy is a data scope, not a destination: scope pill next to the "Live" badge ("Showing: <Dept> + N shared"), admin toggle, "Shared via dependency" badges; config under Administration.
- Personal workspace = expand My Work with tabs: Overview | Personal Projects | Custom Tables | Work Diary (export button in diary header). No new sidebar item.
- Meeting notes: Knowledge library + project detail Meetings entries + action items merged into My Tasks.
- Teams: setup in Integrations; thread renders as a new tab in project detail (8/4 split: thread + linked-channel card); task-level collapsed "Conversation (n)" in QuickEditPanel.
- NOT on the dashboard: diary, custom tables, Teams feeds, meeting-note lists, personal KPIs. At most a line in AI Recommendations.
- DESIGN.md guardrails: no Teams-purple chrome (purple is Xyro-only); threads/diaries don't fit 310px widgets — keep off Command Center; scoped trend chips must recompute from the scoped dataset; never render other departments as fake zeros.

## Development Agent
- Dept visibility: feasible in ~a day IF server-side; keep enforcement simple in API layer or RLS; the primitives (department_id, classified_dependencies with target dept, updateDependencyTask permissioning) exist.
- Custom tables: schema-as-data JSONB (columns spec + rows jsonb) over EAV — matches the tasks-as-jsonb idiom, exports trivially.
- Meeting notes: a web app cannot hear calls it isn't in. v1 = in-app note-taker (paste/upload/type → AI summary via existing key pattern); Graph media bots unrealistic.
- Teams: Graph chatMessage APIs + subscriptions (public webhook, 1–3 day lifecycle renewal, certificate-encrypted payloads) + transcripts (`OnlineMeetingTranscript.Read.All`); admin consent + Microsoft protected-API approval; transcripts need Teams Premium/Copilot licensing. v1 = deep links + polling.
- DDL sketch: personal_projects, custom_tables(columns jsonb, rows jsonb), diary_entries(unique user_id+date), teams_links(project_code, task_id, chat/channel/team ids, deep_link_url), teams_messages_cache, meeting_notes(source: manual|upload|graph_transcript, summary jsonb).
- Challenges: (1) service-role bypass means RLS never executes today; (2) full-register client architecture breaks under per-user responses (role-dependent responses or aggregates endpoint needed); (3) tasks live in jsonb with no stable server identity — teams_links.task_id can orphan.

## Security Agent
- CURRENT STATE: `GET /api/projects` unauthenticated + service-role → full register to anyone with the URL; POST likewise (token used only for audit attribution). Client bundle ships 2,651 lines of seed portfolio data. RLS exists but is dead code (bypassed; org-scoped not dept-scoped; references a users table while auth derives from user-writable `user_metadata` — self-serve privilege escalation; hardcoded admin email). `/api/ai-chat` unauthenticated and injects up to 600 projects into the LLM context regardless of asker.
- ENFORCEMENT DESIGN: anon-key + RLS with per-request caller-token clients. Claims in `app_metadata` via custom access-token hook (never user_metadata). Dependency exception: make mirrors canonical in a `project_dependencies` table synced by trigger; policy = own dept OR admin OR id IN (deps targeting my dept).
- LEAKAGE CONTROLS: personal workspace INSERT policy re-checks visibility of referenced projects; exports read RLS-filtered fetches; ai-chat builds context with caller token; notify-task requires JWT + sender visibility check; Teams cache per-user with TTL + purge on dept change.
- TOP 3 RISKS: (1) unauthenticated /api/projects with service-role; (2) user_metadata-derived authorization; (3) ai-chat context bypass.

## QA Agent — top 5 breakage scenarios
1. Filter placement vs mirror synthesis: filter before `projectsWithDuplicates` → dependency mirrors never generated (exception broken); filter after → parent + mirror (same id!) both visible. Test: exactly one row per cross-dept dependency.
2. KPI divergence per user: context `kpi` counts raw projects; dashboard counts mirrors too; risks double-count on shared ids. Test: totals == unique non-mirror visible ids; risks counted once.
3. Archive/restore of a depended-on project: mirror vanishes for the dependent dept; scoped `archivedProjects` means they can't see/restore; Undo-toast restore may act on a now-invisible project. Test the full cycle incl. notification fan-out.
4. Personal projects leaking: addProject POSTs to org API; departments memo auto-creates a Department card from any new department string; Excel sync fires unconditionally. Test: org GET excludes personal rows; no phantom departments; no sync.
5. Daily QA suite assumptions: demo persona has no department; asserts 6 KPI cards + rows>0; networkidle hangs if Teams polling runs. Add scoped-persona run + zero-Graph-calls-in-demo assertion + KPI parity check.
