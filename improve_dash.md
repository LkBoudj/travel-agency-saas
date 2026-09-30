# Improve Dashboard — Plan Result

**Status: PLAN ONLY — no code written yet. Waits for `APPROVED` / `تمام`.**

## What we decided

Build a **new, production-grade Agency Dashboard** as a separate workspace so the existing dashboard stays untouched:

- **New app:** `frontend/agency-dashboard-mantine`
- **Old app:** `frontend/dashboard` — reference only, never edited
- **Stack:** Vite 8 + React 19 + TypeScript strict · **Mantine 9.6.2** (core/hooks/form/dates/notifications/modals) · `@tabler/icons-react` · TanStack Query 5 · react-router-dom 7 · zod 3 · i18next (EN+AR, RTL)
- **Port:** `5175` (strictPort). Backend CORS must add `http://localhost:5175`.

## Why a separate workspace

Replacing the old dashboard in-place means a full audit, migration, and splice of manually-migrated components — high risk, and it would lose working code. A parallel workspace gets a clean architecture, a professional design system, and leaves the old dashboard as a working reference — that is the mainstream **strangle/redesign pattern**.

## Roadmap

### Phase 1 — Foundation
1. **Scaffold workspace** (Vite + TS strict, dev on 5175)
2. **Register in `dev-all.mjs`** + update `PROJECT_MAP.md`
3. **Typed env config** — one `env.ts`, `.env.example`, tested parser
4. **API client** — single `fetch` with session cookies + normalized `ApiError`
5. **Mantine design system** — tokens, component defaults, `/styleguide` QA route
6. **i18n EN+AR with RTL**
7. **Shell + nav + routing skeleton** (business codes in URLs)
8. **Auth + agency context + permissions** — real login/logout/me, agency selection, CASL permission gating

### Phase 2 — Reusable foundations
9. Shared UI primitives + single `PermissionGate` (`AGENCY_*` keys, UX-only)
10. Shared form patterns (`@mantine/form` + zod resolver, error→field mapping)
11. **Reusable Entity Picker + Quick Create** infrastructure

### Phase 3 — Features (one at a time)
12. Customers (first picker consumer)
13. Tours (editor + readiness-gated publish)
14. Departures + Pricing (nested managers)
15. **Bookings** (flagship flow: Customer→Tour→Departure→Prices→travelers, cancel/confirm)
16. Members / Team + invitations
17. Overview page (real data)

## Key decisions

- **Old dashboard untouched.** Never delete, overwrite, migrate, or mass-edit it.
- **Mantine 9.6.2** — current latest, pinned in the plan.
- **Backend is the security authority.** UI gates on the effective `permissions` array only — no role/membershipType checks, no second authz system.
- **Session cookies only** (`credentials: "include"`), no tokens in localStorage.
- **Business codes everywhere** (`agencyCode`, `CUS-…`, `TUR-…`, `BKG-…`) in UI and URLs.
- **Money = Decimal strings** — never float math.
- **Reusable Quick Create** — one infrastructure used by every context; zero duplicated create-modals.

## Honest deferrals (no backend routes today)

- Payments / refunds (Module K contract not shipped)
- Agency profile six-section settings
- Guest register / forgot-reset / self-service agency creation

## Manual steps you must run

1. Scaffold: `npm create vite@latest agency-dashboard-mantine -- --template react-ts` (inside `frontend/`)
2. Install Mantine + libs (exact command in plan Task 1)
3. Add `http://localhost:5175` to `CORS_ORIGINS` in `backend/.env`

## Full plan

`docs/superpowers/plans/2026-09-21-mantine-agency-dashboard.md` — 17 tasks, each with Goal / Files / Dependencies / Validation-DoD.

## Next step

Reply **`APPROVED`** (or **`تمام`**) to start Task 1.