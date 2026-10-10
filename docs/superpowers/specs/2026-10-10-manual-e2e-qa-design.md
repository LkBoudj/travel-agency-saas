# Manual End-to-End QA Test Plan Design

> **For agentic workers:** This is an architectural design document. After human approval, invoke `superpowers:writing-plans` to create the implementation plan. Do NOT invoke other implementation skills.

**Goal:** Conduct a real, page-by-page manual end-to-end test of the Agency Dashboard (Mantine) starting from scratch: create a new agency, sign in as its owner, and verify every screen, form, action, and guard across the app, logging exact steps, observed behavior, expected behavior, pass/fail, and notes. Produce a reproducible test runbook + filled checklist per page.

**Architecture:**
- Treat this as a QA run, not a code change. Create artifacts only: a runbook, per-page checklists, a test log, a bug tracker sheet, and helper notes.
- Use the real backend on `http://localhost:3000`, dashboard on `http://localhost:5175`, admin optional.
- Create a fresh agency + owner via the allowed path (platform admin UI or direct backend if needed) OR via guest onboarding if available. If neither works, document blockers.
- Walk every route/feature: Auth, Agency Chooser, Overview, Members/Invitations, Customers, Trips (create/edit/publish/archive/readiness), Departures+Pricing, Bookings+Travelers, Website/Themes, Settings/Profile, Agency Context guards.
- Verify permissions (VIEW/CREATE/UPDATE/DELETE/MANAGE/PUBLISH etc) where applicable; confirm UX-only guards don't replace backend.
- Be explicit: check table actions, dialogs, validation, errors, toasts, empty states, RTL (ar locale) minimally, and any confirmation flows.
- Never fabricate data; only use real API.

**Tech Stack:** Markdown (checklists + runbook + log), Git-tracked in repo. Browser (manual).

**Spec:** User request: "الآن سوف نعمل تجربة يدوية بدأ من الصفحات بالتفصيل، ولكل صفحة ننشأ وكالة جديدة، ونفحص كل العمليات التي تحتويها." + "سوف ننشا موسسة جديدة ونقوم بتجربة حقيقة من a-z"

## Global Constraints
- No code changes, no schema/migrations, no dependency installs.
- No pushing/merging; local artifacts only.
- Use existing running services (backend 3000, dashboard 5175). Do not start unrelated apps unless necessary.
- Do not touch production data; use a throwaway agency.
- Respect session cookies; test in fresh browser context per run or clear storage.
- Arabic/RTL spot-check at least one form/table when switching locale (if feasible).
- Backend guards are authoritative — any case where UI allows but backend rejects must be logged.
- Keep notes factual: observed vs expected.

## Review Focus
1. **Fresh start** — Can we create an agency from zero and land in the correct shell with correct permissions? (tests: agency creation path, `/agencies/:code/me` context, shell shows allowed items only)
2. **Page completeness** — Every implemented page/route is exercised (no "TODO/placeholder" surprises). (tests: route list vs actual nav)
3. **CRUD correctness** — Create/update/archive/cancel flows behave and persist (refresh shows state). (tests: Customers, Members, Trips, Departures, Bookings, Travelers)
4. **Readiness/gates** — Tour publish readiness matches server; departure cancel one-way; booking confirm requires complete traveler manifest. (tests: trips editor readiness panel, departures, bookings+travelers)
5. **Cross-cutting** — Permission gating (UX) matches backend; agency context switch works; 401/403 mapping correct; empty/error states readable. (tests: hide/show actions by permission, guard behavior)

---

## 1. Shared Artifacts (What to create)

**Files:**
- Create: `docs/qa/manual-e2e/README.md` — purpose, scope, how to run
- Create: `docs/qa/manual-e2e/runbook.md` — setup (services), create agency, sign-in, route map
- Create: `docs/qa/manual-e2e/checklist-template.md` — reusable page checklist
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
- Create: `docs/qa/manual-e2e/test-log.md` — timestamped entries, links to pages
- Create: `docs/qa/manual-e2e/bugs.md` — id, page, steps, expected/observed, severity, repro
- Create: `docs/qa/manual-e2e/env-check.md` — services health, ports, CORS, cookies

**Interfaces:**
- Consumes: PROJECT_MAP, dashboard routes (`src/app/router/routes.tsx`), feature pages
- Produces: concrete, filled artifacts after each page

## 2. Environment & Prerequisites Check

- [ ] **Write env-check.md** with sections: backend `/v1/health` or `/docs` reachable, dashboard `http://localhost:5175`, admin if used, cookies present, user creds (use platform admin or existing owner path).
- [ ] **Verify services** — curl or browser: 3000/docs returns 200; 5175 loads shell/login.
- [ ] **Decide agency creation path** — inspect `frontend/agency-dashboard-mantine` auth/onboarding and `frontend/admin` agencies UI; pick one realistic path; document fallback.

## 3. Fresh Agency Creation (A–Z start)

- [ ] **Create throwaway agency + owner** via chosen path. Record: agency code, owner email, password (local only).
- [ ] **Login as owner**; land on agency shell for that code.
- [ ] **Capture context** — call `GET /v1/agencies/:code/me` mentally/visually via network (if devtools) or UI; confirm permissions shown match.
- [ ] **Log in test-log.md**: timestamp, agency code, path used.

## 4. Page-by-page Testing (Core Flow)

Test each page in order: Auth → Chooser → Overview → Members → Customers → Trips → Departures+Pricing → Bookings+Travelers → Website/Themes → Settings. For each, fill its page checklist.

- [ ] **Auth** (`/login`, guards): login success/fail, 401 mapping, redirect to intended, logout.
- [ ] **Agency Chooser** (`/agencies`): list memberships, switch agency, guard unauth.
- [ ] **Overview**: KPIs visible by permissions? recent items, empty states, no crashes.
- [ ] **Members/Invitations**: list, invite (if allowed), manage roles, permissions gating, errors.
- [ ] **Customers**: list/search, create/edit, archive (one-way), cannot restore, details by code.
- [ ] **Trips**: list/search/status, quick-create drawer, editor (`/trips/:code`) sections, save, publish/unpublish/archive, readiness panel matches server, validation.
- [ ] **Departures+Pricing**: departures manager (create/edit/cancel one-way, badges), pricing manager (options activate/deactivate), per-departure price dialog, warnings (published with no open departures).
- [ ] **Bookings+Travelers**: create cascade (customer→tour→open departure→active prices), details (lines, currency, history), cancel one-way, **confirm** gated by complete traveler manifest (`travelerManifestComplete`, count of seats), cannot confirm incomplete; errors map to server codes.
- [ ] **Website/Themes**: content vs theme separation check (editors don't leak keys), preview (if exists), publish, view website URL resolution, theme card states.
- [ ] **Settings/Profile**: agency profile sections, readiness signals, forms, validation.

## 5. Guards, Permissions & Cross-cutting

- [ ] **Sidebar/nav** shows only permitted items for this owner.
- [ ] **Row actions** hidden when no permission (UX only) — attempt action via direct URL? no; verify UI.
- [ ] **Agency context** switching updates data correctly; deep link under wrong code behaves per `require-agency`.
- [ ] **RTL/ar**: toggle locale on at least one dense table/form; check layout/direction, no overflow breakage.
- [ ] **Errors**: network (simulate offline? optional), 403/401, 409 mapping readable.

## 6. Wrap-up & Artifacts Review

- [ ] **Fill test-log.md** with every page entry (start/end time, status, notes).
- [ ] **Fill bugs.md** for any deviations (with repro steps minimal).
- [ ] **Review README/runbook** are usable by another person to repeat same run.

**Spec review done.** No code changes. Artifacts only.

Base directory for this spec: D:\projects\travel-agency-saas\docs\superpowers\specs
Relative paths: artifacts go under docs/qa/manual-e2e/
