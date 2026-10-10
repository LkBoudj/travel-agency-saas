# Manual End-to-End QA Test Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a reproducible, page-by-page manual E2E QA runbook/checklists/logs for the Agency Dashboard (Mantine) — create a fresh agency, sign in as owner, verify every screen/action/guard, record observed vs expected, and capture bugs with repro.

**Architecture:** QA artifacts only (no code). Create `docs/qa/manual-e2e/*` files. Use real backend/dashboard (3000/5175). Create a throwaway agency via the chosen path, walk pages in order, verify permissions/guards, test Travelers-confirm gate, publish/readiness, one-way flows. Be factual and reproducible.

**Tech Stack:** Markdown only (VS Code/browser). No runtime deps.

**Spec:** `docs/superpowers/specs/2026-10-10-manual-e2e-qa-design.md`

## Global Constraints
- No product code changes, no migrations/schema, no dependency installs.
- No push/merge/rebase; local artifacts only.
- Use running services: http://localhost:3000 (backend), http://localhost:5175 (dashboard). Do not start unrelated apps unless necessary.
- Do not touch production data; use a throwaway agency.
- Respect session cookies; fresh context recommended.
- Backend guards are authoritative; UX-only gating noted.
- Log observed vs expected; every bug has minimal repro.
- Arabic/RTL spot-check at least one dense form/table.
- Travelers confirm requires complete manifest; one-way flows (archive/cancel) must not be reversible.

## Review Focus
1. **Fresh start** — Agency creation + landing in correct shell + permissions loaded. Test pinned: env-check + agency creation block.
2. **Page completeness** — Every implemented route exercised; no placeholder/404 surprises. Test pinned: route map vs nav.
3. **CRUD correctness** — Create/update/archive/cancel persist after refresh. Test pinned: Customers/Trips/Departures/Bookings.
4. **Readiness/gates** — Tour publish readiness matches server; departure cancel one-way; booking confirm gated by `travelerManifestComplete`. Test pinned: trips readiness + bookings+travelers.
5. **Cross-cutting** — UX permission gating matches backend reality; agency switch works; 401/403 mapping correct; errors readable. Test pinned: nav/actions visibility + guard checks.

---

### Task 1: Scaffolding QA Artifacts

**Files:**
- Create: `docs/qa/manual-e2e/README.md`
- Create: `docs/qa/manual-e2e/runbook.md`
- Create: `docs/qa/manual-e2e/checklist-template.md`
- Create: `docs/qa/manual-e2e/env-check.md`
- Create: `docs/qa/manual-e2e/test-log.md`
- Create: `docs/qa/manual-e2e/bugs.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-10-10-manual-e2e-qa-design.md`, `frontend/agency-dashboard-mantine/src/app/router/routes.tsx`
- Produces: file paths + stable headings

- [ ] **Step 1: Write README.md** — include goal, scope, how to run, artifacts list.
- [ ] **Step 2: Write runbook.md** — services, agency creation path decision, route map, known assumptions.
- [ ] **Step 3: Write checklist-template.md** — Page, Route(s), Preconditions, Checks (General/UI/Data/Actions/Guards/Errors), Result, Notes.
- [ ] **Step 4: Write env-check.md** — backend health, dashboard, ports, CORS note, cookies.
- [ ] **Step 5: Write test-log.md** — columns: Date/Time, Page, Action, Status(PASS/WARN/FAIL/BLOCKED), Observed, Expected, Notes, BugID.
- [ ] **Step 6: Write bugs.md** — fields: ID, Page, Severity(P0/P1/P2/P3), Steps, Expected, Observed, Repro(min), Notes.
- [ ] **Step 7: Commit**  
  `git add docs/qa/manual-e2e/README.md docs/qa/manual-e2e/runbook.md docs/qa/manual-e2e/checklist-template.md docs/qa/manual-e2e/env-check.md docs/qa/manual-e2e/test-log.md docs/qa/manual-e2e/bugs.md && git commit -m "qa: scaffold manual e2e artifacts"`

---

### Task 2: Create Per-Page Checklists

**Files:**
- Create: `docs/qa/manual-e2e/pages/auth.md`
- Create: `docs/qa/manual-e2e/pages/agency-chooser.md`
- Create: `docs/qa/manual-e2e/pages/overview.md`
- Create: `docs/qa/manual-e2e/pages/members.md`
- Create: `docs/qa/manual-e2e/pages/customers.md`
- Create: `docs/qa/manual-e2e/pages/trips.md`
- Create: `docs/qa/manual-e2e/pages/departures-pricing.md`
- Create: `docs/qa/manual-e2e/pages/bookings-travelers.md`
- Create: `docs/qa/manual-e2e/pages/website-themes.md`
- Create: `docs/qa/manual-e2e/pages/settings.md`

**Interfaces:**
- Consumes: Task 1 artifacts + routes + PROJECT_MAP
- Produces: concrete check items per page

- [ ] **Step 1: auth.md** — login success/fail, 401 mapping, redirect, logout, guards.
- [ ] **Step 2: agency-chooser.md** — memberships list, switch, unauth guard.
- [ ] **Step 3: overview.md** — KPIs by permission, recent, empty states.
- [ ] **Step 4: members.md** — list/invite/manage roles, permission gating, errors.
- [ ] **Step 5: customers.md** — list/search/create/edit/archive(one-way), details, refresh persistence.
- [ ] **Step 6: trips.md** — list/search/status, quick-create, editor sections, save/publish/unpublish/archive, readiness panel vs server.
- [ ] **Step 7: departures-pricing.md** — departures (create/edit/cancel one-way, badges), pricing (activate/deactivate), per-departure prices, warnings.
- [ ] **Step 8: bookings-travelers.md** — cascade create, details/lines/history, cancel one-way, confirm gated by travelerManifestComplete (count==seats), server error mapping.
- [ ] **Step 9: website-themes.md** — content vs theme separation, preview (if any), publish, URL resolution, card states.
- [ ] **Step 10: settings.md** — profile sections, readiness, validation, RTL spot-check note.
- [ ] **Step 11: Commit**  
  `git add docs/qa/manual-e2e/pages && git commit -m "qa: add per-page manual checklists"`

---

### Task 3: Run Environment Check & Record Setup

**Files:**
- Modify: `docs/qa/manual-e2e/env-check.md`
- Modify: `docs/qa/manual-e2e/runbook.md`
- Modify: `docs/qa/manual-e2e/test-log.md`

**Interfaces:**
- Consumes: Tasks 1–2
- Produces: filled env-check + initial log entry

- [ ] **Step 1: Verify services** — check http://localhost:3000/docs (200) and http://localhost:5175 (loads). Record ports/status.
- [ ] **Step 2: Decide agency creation path** — inspect admin agencies UI and dashboard onboarding; write chosen path + fallback in runbook.md/env-check.md.
- [ ] **Step 3: Log setup** — add timestamped entry to test-log.md "ENV/SETUP".
- [ ] **Step 4: Commit**  
  `git add docs/qa/manual-e2e/env-check.md docs/qa/manual-e2e/runbook.md docs/qa/manual-e2e/test-log.md && git commit -m "qa: record environment check and setup"`

---

### Task 4: Create Fresh Agency & Capture Context

**Files:**
- Modify: `docs/qa/manual-e2e/runbook.md`
- Modify: `docs/qa/manual-e2e/test-log.md`

**Interfaces:**
- Consumes: Task 3
- Produces: agency code, owner creds (local), context notes

- [ ] **Step 1: Create throwaway agency + owner** via chosen path. Record agency code, email, password (never commit secrets).
- [ ] **Step 2: Login as owner** — land in shell for that code.
- [ ] **Step 3: Capture context** — note visible permissions/allowed nav from UI; verify `/agencies/:code/me` shape if inspectable.
- [ ] **Step 4: Log entry** — "AGENCY_CREATED + LOGIN" with timestamp and code.
- [ ] **Step 5: Commit** (no secrets)  
  `git add docs/qa/manual-e2e/runbook.md docs/qa/manual-e2e/test-log.md && git commit -m "qa: record fresh agency creation and login"`

---

### Task 5: Execute Page-by-Page Tests (Auth → Settings)

**Files:**
- Modify: each `docs/qa/manual-e2e/pages/*.md`
- Modify: `docs/qa/manual-e2e/test-log.md`
- Modify: `docs/qa/manual-e2e/bugs.md` (only if found)

**Interfaces:**
- Consumes: Tasks 1–4
- Produces: filled checkboxes + log entries + bugs

- [ ] **Step 1: Auth** — run checks; mark PASS/WARN/FAIL; log.
- [ ] **Step 2: Agency Chooser** — run; log.
- [ ] **Step 3: Overview** — run; log.
- [ ] **Step 4: Members/Invitations** — run; log.
- [ ] **Step 5: Customers** — CRUD + archive(one-way)+refresh; log.
- [ ] **Step 6: Trips** — quick-create + editor + publish/unpublish/archive + readiness vs server; log.
- [ ] **Step 7: Departures+Pricing** — departures/pricing + one-way + warnings; log.
- [ ] **Step 8: Bookings+Travelers** — cascade create + cancel one-way + confirm gated by manifest complete (count==seats); log. Verify server errors mapped.
- [ ] **Step 9: Website/Themes** — separation + preview? + publish + URL + states; log.
- [ ] **Step 10: Settings** — profile + readiness + RTL spot-check; log.
- [ ] **Step 11: Commit**  
  `git add docs/qa/manual-e2e/pages docs/qa/manual-e2e/test-log.md docs/qa/manual-e2e/bugs.md && git commit -m "qa: complete page-by-page manual e2e pass"`

---

### Task 6: Verify Guards/Cross-cutting & Final Review

**Files:**
- Modify: `docs/qa/manual-e2e/runbook.md`
- Modify: `docs/qa/manual-e2e/test-log.md`
- Modify: `docs/qa/manual-e2e/bugs.md` (if any)
- Modify: `docs/qa/manual-e2e/README.md`

**Interfaces:**
- Consumes: Task 5 outputs
- Produces: verification notes + final summary

- [ ] **Step 1: Nav/actions by permission** — confirm sidebar shows only permitted items; row actions hidden without permission (UX-only noted).
- [ ] **Step 2: Agency switch** — switch between memberships; data/context updates; deep link guard behavior.
- [ ] **Step 3: Errors mapping** — spot-check 401/403/409 readable messages.
- [ ] **Step 4: One-way & gates** — confirm archive/cancel non-reversible; travelers confirm blocked when incomplete.
- [ ] **Step 5: RTL spot-check** — toggle ar on one dense form/table; note direction/overflow.
- [ ] **Step 6: Final summary** — add summary block to README/test-log (counts: pages tested, PASS/WARN/FAIL, bugs P0/P1/P2).
- [ ] **Step 7: Commit**  
  `git add docs/qa/manual-e2e/runbook.md docs/qa/manual-e2e/test-log.md docs/qa/manual-e2e/bugs.md docs/qa/manual-e2e/README.md && git commit -m "qa: finalize manual e2e verification and summary"`

---

## Self-Review (must pass before execution handoff)
- [ ] All spec sections covered by tasks.
- [ ] Each task produces independently testable artifacts.
- [ ] Steps are unambiguous (one action + checkable result).
- [ ] No code changes; only markdown under `docs/qa/manual-e2e/`.
- [ ] Review Focus items pinned to tasks.
- [ ] Secrets never committed.
- [ ] Files match exact paths above.
- [ ] Global Constraints respected.

## Execution Handoff
Plan complete and saved to `docs/superpowers/plans/2026-10-10-manual-e2e-qa-plan.md`. Please review the plan. Does it capture what you want? If approved, we'll execute with the chosen method (subagent-driven or native). Recommended: subagent-driven (many page artifacts, verification gates).