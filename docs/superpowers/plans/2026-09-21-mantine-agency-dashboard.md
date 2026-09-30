# Mantine Agency Dashboard — Implementation Plan (Foundation + Build Order)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a NEW production-grade Mantine Agency Dashboard as a separate workspace (`frontend/agency-dashboard-mantine`) that coexists with the untouched existing dashboard and consumes the real NestJS backend (auth, agency context, CASL permissions, Customers, Tours, Departures, Pricing, Bookings, Travelers, Members).

**Architecture:** A new Vite + React 19 + TS strict SPA with a Mantine-based design system, feature-first structure mirroring the existing dashboard's proven conventions (agency-in-URL routing, TanStack Query server state, `credentials: include` session cookies, feature-local `api/` + `queries/` layers, per-feature pure error mappers tested with `node --test`). Workflow-first UX: ONE reusable **Entity Picker → Quick Create → Cache Update → Auto-Select → Resume** infrastructure reused by every context (Booking→Customer/Tour/Departure, Payment→Booking (future), Traveler→Booking).

**Tech Stack:** React 19 + TypeScript strict + Vite 8 · Mantine 9.6.2 (`@mantine/core`, `hooks`, `form`, `dates`, `notifications`, `modals`) + `@tabler/icons-react` · `@tanstack/react-query` 5 · react-router-dom 7 · zod 3 · i18next + react-i18next (EN+AR) · date-fns · node `--test` for pure logic. `@mantine/form` with zodResolver; the **mantine-combobox / mantine-form / mantine-custom-components skills** and the **Mantine MCP** are the reference for every Mantine API — never guess.

**Spec:**
- Conversation brief (this session): the full product/UX/architecture brief above.
- `PROJECT_MAP.md` (repo what-exists reference), `backend/backend_PROJECT_MAP.md`, `docs/TRAVEL_AGENCY_SAAS_MVP_v0.1_AGENT_PRD.md`.
- Live backend contracts: `backend/src/**/*.schemas.ts`, `*.types.ts`, `*.serializer.ts` (exact paths cited per task).

**Status:** PLAN ONLY — no code written. Waits for `APPROVED` / `تمام`.

---

## Global Constraints

Cross-cutting rules every task must honor:

- **Old dashboard untouched.** Never delete, overwrite, migrate, mass-edit, or restructure `frontend/dashboard/`. It is the reference implementation. You may READ it; never EDIT it.
- **Location:** new app = `frontend/agency-dashboard-mantine`. `marketplace/` does not exist — never reference or fabricate it.
- **Dependency policy:** never run `npm install`/`npm i`, never edit `package.json`/lockfiles. Official scaffolds may install their own deps. For everything else, report the exact install command for the user and continue unaffected parts.
- **No fabricated behavior:** no fake auth, fake endpoints, placeholder "success". If a backend route does not exist (register, forgot/reset, self-service agency creation, **Payments — no route today**), the UI says so honestly or defers. Never hardcode `authenticated = true`.
- **Backend is the security authority:** authorization is driven only by the effective `Permission.key` array returned by `GET /v1/agencies/:agencyCode/me`. No role-name / membershipType / systemKey checks. No second authz system.
- **Business codes everywhere:** `agencyCode`, `CUS-…`, `TUR-…`, departure codes, `BKG-…`, traveler codes shown in UI and used in URLs. Never expose BigInt DB ids.
- **Session cookies only:** `credentials: "include"`, HttpOnly cookie, nothing token-like in localStorage/sessionStorage.
- **Env:** all `import.meta.env` reads centralized in `src/config/env.ts` + `vite.config.ts`. `.env.example` is the committed reference. Never commit secrets; never hardcode the backend URL.
- **Money/currency:** amounts arrive as **Decimal strings**. Never float math; format with an intl money formatter, currency from the backend.
- **i18n/RTL:** `ar` is a product language. Foundation ships EN+AR-ready; feature strings are added per-namespace. Keep bidi correctness (`<bdi dir="auto">` for user text).
- **Query keys:** prefixed `["agency", agencyCode, …]` in every feature, mirrored from the old dashboard. Never mirror server state into a global store.
- **No `any`**, no giant pages/components, no magic strings (statuses, routes, permission keys are typed constants), no raw `fetch` inside UI, no unnecessary global state.
- **Ports:** the new app dev ports on **5175** (strictPort). The backend dev CORS allowlist only ships 5173/5174 — the user must add `http://localhost:5175` to `CORS_ORIGINS` in `backend/.env` (report the exact edit; do not ship it).
- **Verification:** each task runs its app's scripts (`npm run lint`, `npm run typecheck`, `npm run build`) + pure-logic tests (`node --test --experimental-strip-types src/**/*.test.ts`). No assertions without running them.

## Review Focus

Inputs the spec implies but no single contract pins. Each line gets its owning test in the task below.

1. **Suspended agency / inactive membership** → access-denied screen keyed on backend codes (`AGENCY_SUSPENDED`, `AGENCY_MEMBERSHIP_INACTIVE`, `AGENCY_MEMBERSHIP_REQUIRED`); no stray data flashes.
2. **Session expires mid-form** → 401 maps to guard redirect to `/login` with `from`; entered form data is NOT silently wiped.
3. **Quick-create conflict** (e.g. `ALREADY_AGENCY_MEMBER`, `BOOKING_CAPACITY_EXCEEDED`) → backend code surfaced as message/specific field, parent form preserved, picker state intact.
4. **Empty vs failed lists are visually distinct**; pickers show an explicit "no results" row.
5. **Archived/cancelled entities** stay out of active pickers (list honors `status` filters) yet stay readable by code once selected.

---

# Phase 0 — New workspace & typed foundation

### Task 1: Scaffold the `agency-dashboard-mantine` workspace

**Goal:** A standalone, buildable Vite + React 19 + TS-strict app at `frontend/agency-dashboard-mantine` with a mounted MantineProvider — no default/demo styling.

**Files/modules affected:**
- Scaffold (official tooling): `frontend/agency-dashboard-mantine/` root — `package.json`, `vite.config.ts`, solution-style `tsconfig.json` (+ `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.test.json`, mirroring the dashboard), `index.html`, `.gitignore`, `src/main.tsx`, `src/vite-env.d.ts`, `src/App.tsx`, minimal placeholder page.
- Create: `src/theme/provider.tsx` (MantineProvider + Notifications/Modals/Dates providers; real tokens land in Task 5).

**Dependencies:**
- Requires (REPORT to user, not run): `npm create vite@latest agency-dashboard-mantine -- --template react-ts` inside `frontend/` (scaffold installs its own deps).
- Requires (REPORT to user, to run inside the new app):
  `npm install @mantine/core@^9.6.2 @mantine/hooks@^9.6.2 @mantine/form@^9.6.2 @mantine/dates@^9.6.2 @mantine/notifications@^9.6.2 @mantine/modals@^9.6.2 @tabler/icons-react @tanstack/react-query @tanstack/react-query-devtools react-router-dom zod i18next react-i18next date-fns`
  plus `npm install -D @fontsource-variable/inter` (font, if adopted in Task 5).
- `vite.config.ts`: `strictPort: true`, dev port from env (`VITE_DEV_PORT`, default `5175`), alias `@` → `./src`.

**Expected result:** `npm run dev` boots on 5175 with a Mantine-mounted shell; `lint/typecheck/build` pass on the scaffold.

**Validation / DoD:**
- `npm run typecheck` + `npm run build` succeed in the new app.
- Browser loads `http://localhost:5175` with no console errors.
- No `import.meta.env` yet; no hardcoded API URL.
- Report to user: the exact install command(s) and the `backend/.env` `CORS_ORIGINS` addition of `http://localhost:5175`.

- [ ] Scaffold with create-vite (official tooling)
- [ ] Report install commands; user runs them
- [ ] Configure vite (strictPort 5175, `@` alias), tsconfig solution files
- [ ] Mount minimal `MantineProvider` + placeholder page
- [ ] Verify: typecheck, build, browser load on 5175

### Task 2: Register the app with the repo dev orchestrator

**Goal:** `npm run all` at the repo root starts the new app alongside backend/dashboard/admin/storefront with prefixed output.

**Files/modules affected:**
- Modify: `scripts/dev-all.mjs` — add one `APPS` entry: `{ name: "agency-dashboard-mantine", dir: "frontend/agency-dashboard-mantine", run: "dev", url: "http://localhost:5175", color: <unused color> }`.
- Modify: `PROJECT_MAP.md` — add the app to `[SYSTEM_BOUNDARIES]`/topology (existence only).

**Dependencies:** Task 1.

**Expected result:** Root `npm run dev` prints the new app in the banner and starts it (or prints the exact skip + install hint when `node_modules` is absent).

**Validation / DoD:**
- Root `npm run dev`; confirm the new entry starts on 5175; stop all processes afterwards.
- No change to any other app's entry in `dev-all.mjs`.

- [ ] Add APPS entry; run root `npm run dev`, verify startup line
- [ ] Update `PROJECT_MAP.md` (existence only)
- [ ] Stop all dev processes

### Task 3: Typed, centralized environment config

**Goal:** One typed config module — the only place `import.meta.env` is read — with a tested parser and a committed `.env.example`.

**Files/modules affected:**
- Create: `frontend/agency-dashboard-mantine/src/config/env.ts`, `src/config/env.test.ts`, `.env.example`.
- Modify: `src/vite-env.d.ts` (declare the vars), `vite.config.ts` (read `VITE_DEV_PORT`).

**Contracts** (from `frontend/dashboard/.env.example` + backend `main.ts`):
```
VITE_API_BASE_URL=http://localhost:3000   # required, origin only, no trailing slash, no /v1
VITE_DEV_PORT=5175                        # optional, defaults 5175, strictPort
VITE_PLATFORM_DOMAIN=example.com          # optional; only the future agency-creation guest flow
```

**Dependencies:** Task 1.

**Expected result:** `env.ts` exports a frozen typed `AppEnv`; invalid `VITE_API_BASE_URL` (empty, trailing slash, or not an http(s) origin) throws a loud startup error naming the variable.

**Validation / DoD:**
- `src/config/env.test.ts` tests pure `parseEnv(record)` — no `import.meta.env` inside, no `@/` aliases (so `node --test` can load it): valid → correct object; missing → throws; trailing slash → throws.
- `node --test --experimental-strip-types src/config/env.test.ts` green.
- Grep: `import.meta.env` appears only in `src/config/env.ts` (+ `vite.config.ts`).
- `.env.example` documents all vars.

- [ ] Write `env.test.ts`, verify it fails (parseEnv missing)
- [ ] Implement `parseEnv` + typed `AppEnv`; verify pass
- [ ] `vite-env.d.ts` + `.env.example` + vite.config port wiring
- [ ] Verify: typecheck, `node --test`, grep stray `import.meta.env`

### Task 4: API client + error normalization

**Goal:** The single transport to the NestJS API with normalized `ApiError`, consumed by every feature service — no raw `fetch` anywhere else.

**Files/modules affected:**
- Create: `frontend/agency-dashboard-mantine/src/services/api.ts`, `src/services/api.test.ts`.

**Contracts** (from the proven `frontend/dashboard/src/lib/api.ts` + backend `setup-app.ts` error body):
```ts
export class ApiError extends Error {
  readonly status: number
  readonly code?: string            // backend errorCode, e.g. "AGENCY_CUSTOMER_ALREADY_ARCHIVED"
  constructor(message: string, status: number, code?: string)
}
// path already under /v1; base URL from env(). credentials:"include",
// Content-Type: application/json. Non-2xx → parse { message?, errorCode? } → ApiError.
// 204/empty body → undefined; JSON body otherwise.
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T>
```
- `parseErrorBody(body: unknown): { message: string; code?: string }` is the pure, alias-free, tested function.

**Dependencies:** Task 3 (`env`).

**Expected result:** `apiRequest` throws `ApiError { status, code?, message }` for all non-2xx, surfacing the backend `errorCode` when present.

**Validation / DoD:**
- `api.test.ts`: `{statusCode,message,errorCode}` and legacy `{message}` bodies; non-JSON error body → generic message without swallowing transport errors.
- `node --test` green; `npm run typecheck` green.
- Grep: no `fetch(` or `axios` outside `src/services/api.ts`.

- [ ] Write `api.test.ts` for `parseErrorBody`; verify fails
- [ ] Implement `ApiError` + `apiRequest` + `parseErrorBody`; verify pass
- [ ] Verify: `node --test`, typecheck, grep stray fetch

---

# Phase 1 — Design system, shell, routing

### Task 5: Mantine design system (tokens + component defaults)

**Goal:** A distinctive, professional visual identity on top of Mantine — colors, typography, spacing, radius, shadows, component sizing, container/page widths, form/table density — centralized so no ad-hoc values leak into feature code. Must NOT look like the default Mantine demo.

**Files/modules affected:**
- Create: `frontend/agency-dashboard-mantine/src/theme/` — `theme.ts` (MantineProvider theme / `createTheme`), `colors.ts` (brand scale + semantic status palette), `typography.ts`, `spacing.ts`, `radius.ts`, `shadows.ts`, `component-defaults.ts` (`components: { Button, TextInput, Select,Combobox, Table, Modal, Drawer, Tooltip, Badge, … }` defaultProps — compact forms/tables, professional density), `index.css` (CSS variables, font import, scrollbars, focus rings).
- Modify: `src/main.tsx` (real provider), `src/theme/provider.tsx` (`MantineProvider` + `DatesProvider` + `Notifications` + `Modals`).

**Foundations to take from (mature-SaaS context, not copied):** Stripe/Linear-style restraint — quiet black/white scale, one strong accent, tabular numerals for money, calm borders, tight rows.

**Status palette input contract (backend domain statuses):** Agency `ACTIVE|SUSPENDED`; membership `ACTIVE|SUSPENDED`; Customer `ACTIVE|ARCHIVED`; Tour `DRAFT|PUBLISHED|ARCHIVED`; Departure `OPEN|CLOSED|CANCELLED`; PricingOption active/deactivated; Booking `PENDING|CONFIRMED|CANCELLED`; member statuses.

**Dependencies:** Task 1 (Mantine libs); Mantine MCP (`createTheme`, `ColorsTuple`, `Badge` variants, `defaultProps`); **mantine-custom-components** skill for any custom primitives registered via the provider.

**Expected result:** One `theme` object + CSS layer every feature consumes; demo defaults overridden; RTL and dark/light surfaces work.

**Validation / DoD:**
- `npm run typecheck` + `npm run build` clean.
- Dev-only style-guide route (`/styleguide`, outside the auth shell) renders color scales, type scale, tuned controls, and a Badge row for every domain status — for eyeball QA.
- Grep: no raw hex/rgb literals in feature code (allowed only in `theme/` and CSS).

- [ ] Define tokens (colors/typography/spacing/radius/shadows) per Mantine theme API
- [ ] Component defaults (density/sizes/radii) via the `components` map
- [ ] Mount providers; CSS layer (fonts, focus, scrollbars)
- [ ] `/styleguide` dev route; visual QA
- [ ] Verify: typecheck, build

### Task 6: i18n (EN + AR) with RTL correctness

**Goal:** Bilingual scaffolding so later features are written against i18n keys (not raw strings) and render correctly in RTL.

**Files/modules affected:**
- Create: `frontend/agency-dashboard-mantine/src/i18n/` — `index.ts` (i18next init, `en`+`ar`, fallback `en`, default ns `common`), `locales/{en,ar}/common.json` (shell/nav/statuses/common actions), `hooks/use-app-locale.ts`, `hooks/use-is-rtl.ts`, `lib/directions.ts` (set `documentElement.lang` + `dir`; persist key `travel-saas-locale`, the SAME key as the old dashboard so the locale is shared), `components/bidi-text.tsx`.

**Dependencies:** Task 5 (RTL surface); i18next + react-i18next (installed in Task 1's user command).
Note: feature strings use `features/<feature>/i18n/<ns>.json` namespaces added as features land.

**Expected result:** Language switch flips `dir` and all shell text; every feature writes strings as i18n keys.

**Validation / DoD:**
- typecheck/build green; switching to `ar` sets `dir="rtl"` on `<html>`.
- Grep: shell/nav/status strings are keys, not literals.
- Pure helpers tested (`node --test`): `resolveNextLocale`, direction mapping.

- [ ] i18next init + en/ar `common` namespaces + persistence
- [ ] Locale/direction hooks + `BidiText`
- [ ] Shell labels to keys
- [ ] Verify: AR switch flips RTL; typecheck/build

### Task 7: App shell + navigation + routing skeleton

**Goal:** The authenticated SPA shell (sidebar nav, top bar, mobile drawer, user menu) plus the guest/authenticated route skeleton, ready for the auth + context providers (Task 8).

**Files/modules affected:**
- Create: `frontend/agency-dashboard-mantine/src/app/router/` — `router.tsx` (`createBrowserRouter`), `route-paths.ts` (typed constants mirroring the old dashboard: `/login`, `/agencies`, `/agencies/:agencyCode` + relative `dashboard|trips|bookings|customers|agency|team|settings`), `routes.tsx` (guest `*`→login; authenticated under `:agencyCode`), placeholder guards `require-auth.tsx` / `guest-only.tsx` (wired in Task 8).
- Create: `src/layouts/` — `auth-layout.tsx` (centered card), `dashboard-layout.tsx` + `dashboard-sidebar.tsx` + `dashboard-header.tsx` (responsive; nav items permission-gated in Task 8).
- Create: `features/agency-context/lib/agency-paths.ts` — `agencyBasePath(code)`, `agencyPath(code, section)`, `AGENCY_SECTIONS` (mirrors the old dashboard's `agency-paths.ts`; business-code-in-URL is the rule). All links use these helpers.
- `features/dashboard/pages/overview-page.tsx` honest placeholder (real data in Task 17).

**Dependencies:** Tasks 5, 6; react-router-dom 7 (installed). READ ONLY (never copy verbatim): the old dashboard's `route-paths.ts` / guards.

**Expected result:** Browser history under `/agencies/:agencyCode/…`; sidebar nav; auth layout; placeholder overview; typed route constants.

**Validation / DoD:**
- typecheck/build green; shell navigates with no console errors.
- One `node --test`: `agencyPath("ABC","bookings")` → `/agencies/ABC/bookings`; unknown section rejected by the typed map.

- [ ] route-paths + agency-paths helpers + test
- [ ] Router skeleton (guest/authed branches, placeholder guards)
- [ ] Dashboard shell (sidebar/header, responsive) + auth layout
- [ ] Overview placeholder page
- [ ] Verify: typecheck, build, `node --test`, browser nav

### Task 8: Authentication + agency context + CASL permission gates

**Goal:** Real auth (login/logout/me + session guard + agency selection) and the agency context carrying effective permissions — the single authorization source the UI gates on. No simulated auth, no localStorage tokens.

**Files/modules affected:**
- `features/auth/`: `api/auth.api.ts`, `queries/auth.queries.ts`, `hooks/use-current-user.ts`, `hooks/use-login.ts`, `hooks/use-logout.ts`, `pages/login-page.tsx` + `components/login-form.tsx`, `schemas/login.schema.ts` (zod), `lib/auth-errors.ts` + pure `lib/auth-error-messages.ts` (+ test).
- `features/agency-context/`: `api/agency-context.api.ts`, `types/agency-context.types.ts`, `components/agency-context-provider.tsx` (route-level: resolves + proves membership), `hooks/use-agency-context.ts`, `hooks/use-agency-permission.ts`, `hooks/use-my-agencies.ts`, `pages/agency-selection-page.tsx`, `lib/agency-selection.ts` (auto-enter when exactly one enterable agency, else chooser), `lib/agency-context-error-adapter.ts` + pure `lib/agency-context-errors.ts` (+ test).
- Route guards `require-auth.tsx` / `guest-only.tsx` become real.

**API contracts (verbatim from backend):**
- `POST /v1/auth/login` `{email,password}` → 200 `AuthUser {code,email,firstName,lastName}` + HttpOnly cookie (`backend/src/auth/auth-user.ts`, `backend/src/auth/schemas.ts`). 401 bad credentials / suspended.
- `GET /v1/auth/me` → `AuthUser`; `POST /v1/auth/logout` → clears cookie.
- `GET /v1/me/agencies` → `{code,name,status,membershipType,membershipStatus}[]` (agency chooser).
- `GET /v1/agencies/:agencyCode/me` → `AgencyAccessResponse` (`backend/src/agency-access/agency-access.serializer.ts`):
```ts
{ agency: { code, name, status }, membership: { membershipType, status },
  roles: Array<{ key, name }>, permissions: string[] }
```
  Errors: 404 `AGENCY_NOT_FOUND`; 403 `AGENCY_SUSPENDED` | `AGENCY_MEMBERSHIP_REQUIRED` | `AGENCY_MEMBERSHIP_INACTIVE`.

**Dependencies:** Tasks 4 (api), 5, 6, 7. Session-cookie semantics identical to the old dashboard (`credentials:"include"`; never decode the JWT).

**Expected result:** Guest→login→`/agencies` chooser→auto/choose→context provider proves membership and exposes `permissions`; 401 redirects to `/login` with `from`; suspended agency / inactive membership renders the coded denial screen.

**Validation / DoD:**
- `node --test` for pure `auth-error-messages` + `agency-context-errors`; typecheck/build green.
- Live smoke vs backend (login → cookie → `/me` → `/agencies/:code/me` → reload → logout → protected redirect); temporary verification data removed.
- `useAgencyPermission(...required)` semantics = ALL keys required (matches backend `@RequireAgencyPermissions`).

- [ ] auth api/queries/hooks + login page/form + schema; `me` retry-no-401; logout
- [ ] agency-context api/types/provider/hooks + agency-selection page
- [ ] Wire guards + error mappers (+ `node --test`)
- [ ] Live smoke: login → agency enter → guarded route → logout → redirect; fix failures
- [ ] Verify: typecheck, build

### Task 9: Shared UI primitives + permission gate

**Goal:** A small, composable kit of cross-feature primitives — none giant/generic — including the single reusable permission gate over the effective permissions array.

**Files/modules affected:**
- Create in `frontend/agency-dashboard-mantine/src/components/shared/`:
  - `permission-gate.tsx` — `<PermissionGate required={["AGENCY_…"]} fallback?>` over `useAgencyPermission` (from Task 8). The ONLY permission primitive — no duplicated checks anywhere.
  - `page-header.tsx` (title / description / actions slot), `entity-code.tsx` (mono `CUS-…` code chip), `status-badge.tsx` (feature passes status→`{color,label}` map; used for every domain status), `confirm-dialog.tsx` (Mantine Modal, alertdialog semantics, destructive variant), `full-page-loader.tsx`, `empty-state.tsx` / `error-state.tsx` (visually distinct — Review Focus #4), `bidi-text.tsx`.
  - `data-table.tsx` — thin typed table shell on Mantine `Table`: columns (`header`, `cell`), `loading` (skeleton rows), `empty`/`error` slots, optional row-actions column, optional pagination slot. Sorting/filtering stay in the feature layer (no giant generic data-grid).
  - `money-text.tsx` — formats Decimal-string amounts via `Intl.NumberFormat` with the currency from the backend; never float math.
  - `search-input.tsx` — 300ms debounced search input emitting a value.

**Dependencies:** Tasks 5 (tokens), 8 (permissions). Mantine MCP for `Table`, `Badge`, `Modal`, `Skeleton`, `Tooltip`.

**Expected result:** Features compose these primitives; permission checks exist in exactly one place.

**Validation / DoD:**
- typecheck/build green; `node --test` for pure helpers (`toMoneyText`, status→variant map).
- Grep: features use `<PermissionGate>`/`useAgencyPermission` and never reimplement `permissions.includes(...)`.

- [ ] permission-gate + page-header + entity-code + status-badge + bidi-text
- [ ] confirm-dialog + full-page-loader + empty/error states
- [ ] data-table shell
- [ ] money-text + search-input (+ pure tests)
- [ ] Verify: typecheck, build, `node --test`

### Task 10: Shared form patterns

**Goal:** Consistent form conventions on `@mantine/form` + zod through the resolver, plus the Modal/Drawer/Page sizing contract with a reusable actions footer — so every feature writes small forms.

**Files/modules affected:**
- Create `src/components/shared/forms/`: `form-actions.tsx` (sticky submit/cancel footer, dirty-aware, loading), `form-section.tsx` (section title/description), `modal-form-shell.tsx` (small form → Modal) and `drawer-form-shell.tsx` (medium workflow → Drawer), `field-error.tsx` (renders ApiError-derived field messages), `use-zod-form.ts` (`useForm` + zodResolver wrapper), form density styles.
- Pure `lib/form-errors.ts` (+test): maps backend `errorCode`/field conflicts → `{field, message}` where the backend exposes them (e.g. 409 member email), falling back to a form-level message. 

**Sizing contract from the brief:** Modal → small quick-create; Drawer → medium contextual workflow; Page → complex workflow.

**Dependencies:** Task 4 (ApiError), Task 9 (primitives), `@mantine/form` + zod. Use the **mantine-form** skill + Mantine MCP (`useForm`, `validate`, `zodResolver`, `getInputProps`, list fields). Confirm the zod resolver's import path from docs at implementation time — do not guess.

**Expected result:** All feature forms use these shells; failed submits preserve entered data by construction (Mantine keeps form values, no page reload); field-level errors appear next to the field.

**Validation / DoD:**
- Pure `form-errors.test.ts` green (`node --test`): code→field/message mapping for known 4xx codes.
- typecheck/build green.

- [ ] form-actions + form-section + modal/drawer shells
- [ ] `use-zod-form` + field-error
- [ ] `form-errors` pure mapper + test
- [ ] Verify: `node --test`, typecheck, build

### Task 11: Reusable Entity Picker + Quick Create infrastructure

**Goal:** The workflow-carrying layer — ONE reusable pattern **Parent Form → Entity Picker → Quick Create → Mutation → Cache Update → Auto-Select → Resume** used by every context (Booking→Customer/Tour/Departure, later Payment→Booking, Traveler→Booking). Zero duplicated `*Create*Modal`s.

**Files/modules affected:**
- Create `src/components/shared/entity-picker/`:
  - `entity-option.ts` — pure: `displayFor(entity)` → `{code,label,sublabel}`; `toComboboxData(...)`; `defaultOptionFor(entity)`.
  - `entity-combobox.tsx` — searchable async Combobox on Mantine `Combobox` primitives (**mantine-combobox** skill + MCP are the reference): server search + debounce, loading, no-results row, keyboard navigation, clear selection, mono `code` sublabel, and a contextual **"Create new"** row shown only when permission allows.
  - `use-entity-picker.ts` — orchestrates search string vs selected `code`; `useQuery` options keyed `["agency", code, "<entity>", "options", search]`; exposes `{ value, setValue, options, isLoading, openQuickCreate, … }`.
  - `quick-create.tsx` — the controller: renders `modal-form-shell` with a domain form; on submit runs the create mutation, updates/invalidates the query key, calls `onCreated(entity)` → parent `form.setFieldValue(field, code)` + closes + refocuses the picker.
  - `quick-create-flow.ts` — pure stepper `{idle → submitting → done | error}` + `deriveNextValue(created)` (+test).
  - `create-entity-option.ts` — uniform **"Create new …"** affordance inside every picker.

**Feature contract a QuickCreateSpec must satisfy on each side:** `{ createMutation, queryKey, payloadFor(values), displayFor(entity), modalTitle, schema, createRequires: PermissionKey[] }`.

**Dependencies:** Tasks 4 (api), 9 (primitives + permission-gate), 10 (form shells). This is the single implementation per the brief; features only supply specs.

**Expected result:** Any parent form, via a small spec, gets searchable selection + contextual quick-create with cache update, auto-select, and full parent-form preservation.

**Validation / DoD (critical behavior tests — `node --test` on the pure parts):**
- `quick-create-flow.test.ts` — pre-submit never clears parent values; success derives `nextValue` from the created entity's code; error keeps submitted values for retry (no wipe). (Review Focus #2,#3.)
- `entity-option.test.ts` — `displayFor` over the customer shape (`code,firstName,lastName,email`) and tour shape (from `backend/src/tours/tours.types.ts`) produces picker labels.
- "Create new" row is permission-gated from the spec's `createRequires`.
- typecheck/build green; grep confirms no `CustomerCreateModal`-style duplicates.

- [ ] entity-option pure module + tests
- [ ] entity-combobox (mantine-combobox skill: async search/loading/empty/keyboard/clear/create row)
- [ ] use-entity-picker hook
- [ ] quick-create-flow pure stepper + tests; quick-create controller + modal shell
- [ ] Verify: `node --test`, typecheck, build; user QA once a consumer exists (Task 12)

---

# Phase 2 — Feature migration/build order

Work ONE feature at a time; the foundation and each parent feature stays green. Every feature is a small vertical slice against the real API, following the feature structure established in Tasks 8–11 (list+search+status, details-by-code, permission-gated actions, per-feature EN/AR namespace, pure-payload tests, `node --test`). Each feature lists the exact backend files to read BEFORE writing its types — those files are the contract source of truth. Extend `PROJECT_MAP.md` only when structure meaningfully changes.

### Task 12: Customers feature (first consumer of Entity Picker + Quick Create)

**Goal:** Full Customers slice plus the proof-consumer of the picker/quick-create infra: a tiny internal QA parent form that embeds `EntityPicker` for customer, quick-creates, and verifies parent preservation + auto-select.

**Backend contract — read `backend/src/customers/customers.schemas.ts` + `customers.types.ts` first.** Routes under `/v1/agencies/:agencyCode/customers`: `GET|POST` (list: `search`; create/update body: `firstName? lastName? email? phone? notes?`, blank→null, email lowercased), `GET|PATCH :customerCode`, `POST :customerCode/archive` (one-way). `CustomerResponse {code,firstName,lastName,email,phone,notes,status:"ACTIVE"|"ARCHIVED",createdAt,updatedAt}`, `CUS-` codes.
Permissions: `AGENCY_CUSTOMER_VIEW/CREATE/UPDATE/ARCHIVE`.
Query keys: `customersQueryKeys = { all:["agency",code,"customers"], list:[...,"list",search], detail:[...,"detail",customerCode], options:[...,"options",search] }`.

**Files/modules affected:** `features/customers/` — `api/customers.api.ts`, `queries/customers.queries.ts`, `types/customers.types.ts`, `hooks/use-customers.ts`/`use-customer.ts`/`use-customer-mutations.ts`/`use-customer-capabilities.ts`, `pages/customers-page.tsx` + `pages/customer-details-page.tsx`, `components/customers-table.tsx` (data-table shell), `customer-form-dialog.tsx`, `customer-archive-dialog.tsx`, `customer-status-badge.tsx`, `schemas/customer.schema.ts`, `lib/customer-actions.ts`, `lib/customer-display.ts` (+test), `lib/customer-payloads.ts` (+test), `i18n/{en,ar}/customers.json`.

**Dependencies:** Foundation (Tasks 5–10), env/api (Tasks 3–4), Task 11 infra.

**Expected result:** Searchable list (server search), create/edit modal, details by `CUS-` code, one-way archive with confirm, all actions gated on `AGENCY_CUSTOMER_*`; quick-create in the QA parent preserves + auto-selects customer.

**Validation / DoD:**
- `node --test`: `customer-actions` (permission constants), `customer-display`, `customer-payloads` (blank→null, email lowercase).
- Live smoke vs backend: list → create → appears in picker → edit → archive → gone from list, still readable by code.
- `npm run lint/typecheck/build` green.

- [ ] types + api + queries + hooks; read `customers.schemas.ts`/`types.ts` first
- [ ] list page + toolbar + table + status badge
- [ ] create/edit form dialog + archive confirm + details page
- [ ] Wire EntityPicker + Quick Create spec; QA parent form test-flow
- [ ] i18n namespace EN/AR + pure tests + lint/typecheck/build + live smoke

### Task 13: Tours feature (list + editor + publish/unpublish/archive)

**Goal:** Tour catalog with the multi-section editor and publish readiness matching the server gate.

**Backend contract — read `backend/src/tours/tours.schemas.ts` + `tours.types.ts` first.** Routes `/v1/agencies/:agencyCode/tours`: `GET|POST` (list `search`+`status`), `GET|PUT :tourCode` (aggregate replacement), `POST :tourCode/publish|unpublish`, `PATCH :tourCode/archive`. Readiness gate: `NAME/DESTINATION/SHORT_DESCRIPTION/COVER_IMAGE/SCHEDULED_DEPARTURES_REQUIRED` (scheduled tours publish only with ≥1 OPEN departure). Codes `TUR-`.
Permissions: `AGENCY_TOUR_VIEW/CREATE/UPDATE/DELETE/PUBLISH`.
Query keys: `toursQueryKeys = { all:["agency",code,"tours"], list:[...,"list",search,status], detail:[...,"detail",tourCode] }`.

**Files/modules affected:** `features/trips/` (UI keeps the old dashboard's *Trip* naming; backend name is *Tour*): `pages/trips-page.tsx` + `pages/trip-editor-page.tsx`, list toolbar/table, create drawer, section forms (overview, itinerary, details, media — honest placeholder where backend media APIs are absent, booking settings), `trip-editor-header/nav/readiness-panel`, schemas (`trip.schema.ts`, `create-trip.schema.ts`), `lib/tour-payloads.ts` (+test), `lib/tour-error-messages.ts` (+test), `lib/tour-actions.ts` (permission keys), `lib/tour-display.ts`, `i18n/{en,ar}/trips.json`.

**Dependencies:** Task 12 (feature structure + picker). Departures/Pricing tab content lands in Task 14.

**Expected result:** List + create + full editor saved as PUT aggregate + explicit publish/unpublish/archive; readiness panel reflects the server gate (publish blocked message from the backend code when not ready).

**Validation / DoD:**
- `node --test`: `tour-payloads` (aggregate building, itinerary ordering), `tour-error-messages` (readiness/publish codes surfaced), `tour-actions`.
- Smoke vs backend: create→edit→publish (fails honestly when not ready)→fulfill readiness→publish→unpublish→archive.
- `npm run lint/typecheck/build` green.

### Task 14: Departures + Pricing (nested managers)

**Goal:** Per-tour departures manager (create/edit/cancel; OPEN|CLOSED|CANCELLED badges; PUBLISHED-with-no-open-departure warning) and pricing manager (options + per-departure whole-set prices) wired into the tour editor.

**Backend contract — read `backend/src/departures/departures.schemas.ts` + `backend/src/pricing/pricing.schemas.ts` first.** Routes `/v1/agencies/:agencyCode/tours/:tourCode/departures` (`GET|POST`, `GET|PUT :departureCode`, `POST :departureCode/cancel`) and pricing (`GET|POST …/pricing-options`, `PUT …/pricing-options/:code`, `POST …/pricing-options/:code/deactivate`, `GET|PUT …/departures/:departureCode/prices`). Amounts are **Decimal strings**; currency consistency is server-enforced. Create lands OPEN; cancel is one-way and never changes tour status.
Permissions: `AGENCY_DEPARTURE_VIEW/CREATE/UPDATE/DELETE`, `AGENCY_PRICING_VIEW/MANAGE`.
Query keys: departures nested under the tour detail key; `pricingQueryKeys` (overview/option/departurePrices) as in the old dashboard.

**Files/modules affected:** in `features/trips/` — `departures-manager.tsx`, `departure-form-dialog.tsx`, `departure-prices-dialog.tsx`, `pricing-manager.tsx`, `pricing-option-form-dialog.tsx`, `hooks/use-departures.ts` (+`openDepartureCount`), `hooks/use-pricing.ts`, `lib/departure-payloads.ts` (+test), `lib/pricing-payloads.ts` (+test), `lib/departure-display.ts`.

**Workflow requirement:** the manager also offers **"New departure" from the Tour picker** (Task 11 consumer: Departure→Tour quick-create) so a departure can be created from outside the tour editor too.

**Validation / DoD:**
- `node --test`: `departure-payloads`, `pricing-payloads`, display helpers.
- Smoke vs backend: create departure→edit→cancel (one-way); pricing option create→edit→deactivate; per-departure prices set; capacity/price derived server-side only.
- `npm run lint/typecheck/build` green.

### Task 15: Bookings feature (create cascade + details + cancel + confirm + travelers)

**Goal:** The flagship workflow — create bookings in a cascading dialog (Customer → Tour → OPEN Departure → active Pricing options → seats), then details, cancel, and confirm gated on a complete traveler manifest. Uses the Task 11 infra for Customer/Tour/Departure quick-create directly inside the dialog.

**Backend contract — read `backend/src/bookings/bookings.schemas.ts` + `bookings.types.ts` + `backend/src/travelers/travelers.schemas.ts` first.** Routes `/v1/agencies/:agencyCode/bookings`: `GET|POST` (list `search`+`status`; create with pricing selections — codes, never client amounts), `GET :bookingCode`, `POST :bookingCode/cancel` (`{reason}`), `POST :bookingCode/confirm`, travelers `GET|POST :bookingCode/travelers`, `PATCH …/travelers/:travelerCode`. Status `PENDING|CONFIRMED|CANCELLED`; cancelled frees seats; CONFIRMED requires complete manifest (server rule). Error codes (`BOOKING_*`): `BOOKING_TRAVELERS_REQUIRED`, `BOOKING_CAPACITY_EXCEEDED`, `BOOKING_NO_PRICES`, `BOOKING_PRICE_INACTIVE`, `BOOKING_CURRENCY_MISMATCH`, `BOOKING_DEPARTURE_CLOSED`, `BOOKING_ALREADY_CANCELLED`. Client total is a preview only; server total is authoritative.
Permissions: `AGENCY_BOOKING_VIEW/CREATE/UPDATE/CANCEL`, `AGENCY_TRAVELER_VIEW/CREATE/UPDATE`.
Query keys: `bookingsQueryKeys` mirroring the old dashboard (list/detail/travelers).

**Files/modules affected:** `features/bookings/` — api/queries/types/hooks (`use-bookings`, `use-booking`, `use-booking-mutations`, `use-booking-capabilities`), `pages/bookings-page.tsx` + `pages/booking-details-page.tsx`, `components/bookings-table.tsx`, `booking-status-badge.tsx`, `create-booking-dialog.tsx` (customer‑picker + tour‑picker + departure‑picker with quick-create — the Task 11 flagship), `booking-cancel-dialog.tsx`, `booking-confirm-dialog.tsx` (submit disabled until `travelerManifestComplete`, guarding the 409), `travelers-manager.tsx`, `schemas/booking.schema.ts`, `lib/booking-payloads.ts` (+test), `lib/booking-display.ts` (+test), `lib/booking-actions.ts`, `lib/booking-error-messages.ts` (+test), `i18n/{en,ar}/bookings.json`.

**Dependencies:** Tasks 12 (customers+tour picker patterns), 13–14 (tours/departures/pricing ready for the cascade), 11 (quick-create).

**Expected result:** One dialog completes a booking without leaving the workflow — search/quick-create the customer, pick tour→departure→prices, reserve seats, see a preview total; details page shows the frozen price line, status history, manifest summary, cancel (with reason), confirm (manifest-gated).

**Validation / DoD:**
- `node --test`: `booking-payloads`, `booking-display`, `booking-error-messages`, `booking-actions`, `traveler-payloads`.
- Live smoke: create with quick-created customer → cancel → create → full travelers → confirm → confirm blocked until manifest complete.
- `npm run lint/typecheck/build` green.

### Task 16: Members / Team + invitations

**Goal:** Team management (list/search, role assignment, suspend/reactivate, remove) plus member invitations (list/revoke), honoring OWNER invariants in the UI.

**Backend contract — read `backend/src/agency-members/agency-members.schemas.ts` + `backend/src/member-invitations/` first.** Routes `/v1/agencies/:agencyCode/members`: `GET` (`search`), `GET :userCode`, `GET roles/assignable` (requires `AGENCY_MEMBER_ROLE_MANAGE`), `PUT :userCode/roles` (`{roleKeys}`; empty valid), `PATCH :userCode/status`, `DELETE :userCode`. Invitations: `POST member-invitations` `{email, roleKeys?}` (idempotent), `GET` list, `DELETE :invitationCode` (revoke). Owner rows: roles immutable / cannot suspend / cannot remove (`OWNER_ROLES_IMMUTABLE`, `OWNER_CANNOT_BE_SUSPENDED`, `OWNER_CANNOT_BE_REMOVED`).
Permissions: `AGENCY_MEMBER_VIEW/INVITE/UPDATE/REMOVE`, `AGENCY_MEMBER_ROLE_MANAGE`.
Query keys: `membersQueryKeys` + `assignableRoles` (`["agency",code,"available-roles"]`).

**Files/modules affected:** `features/members/` — api/queries/types/hooks, `pages/members-page.tsx`, `components/members-table.tsx`, `member-details-dialog.tsx`, `manage-roles-dialog.tsx`, `role-selector.tsx`, `invitations-section.tsx`, `lib/member-actions.ts` (never offers role/status/remove on `membershipType==="OWNER"`), `lib/member-display.ts` (+test), `lib/member-payloads.ts` (+test), `lib/member-error-messages.ts` (+test), `i18n/{en,ar}/members.json`.

**Validation / DoD:**
- `node --test`: `member-actions` (OWNER invariants), `member-display`, `member-payloads`, `member-error-messages`.
- Smoke vs backend: list → assign roles → suspend → reactivate → invite → list → revoke.
- `npm run lint/typecheck/build` green.

### Task 17: Overview page (real data)

**Goal:** Replace the Task 7 placeholder with a genuinely useful overview from the real list endpoints (customers/tours/bookings/members counts, recent bookings) — small and honest, permission-aware, no fake metrics.

**Files/modules affected:** `features/dashboard/` — `pages/overview-page.tsx`, `components/kpi/latest-bookings-list.tsx`, query hooks composing the existing feature queries (no new endpoints).

**Dependencies:** Tasks 12–16 (all list queries exist).

**Validation / DoD:** page renders only authorised sections (per Feature permissions); no console errors; typecheck/build green. Manual QA.

---

## Not built now (honest deferrals)

- **Payments / refunds:** NO backend routes exist (`test/payments.e2e-spec.ts` is a planned contract only — Module K). Do NOT build payments UI that would 404. Revisit when Module K lands.
- **Agency profile six-section settings:** the old dashboard's `agency.api.ts` is a dev-only in-memory repo, not a backend contract; the real Agency API is minimal (`code/name/status/country/description`). Deferred to a later slice; the Settings nav item renders an honest placeholder.
- **Guest register/forgot/reset/create-agency:** no backend routes — honest "not yet available" screens only, or omit from guest flow.
- **i18n completeness:** EN/AR namespaces grow feature-by-feature as tasks complete.

## Definition of Done (final dashboard)

- Coexists with the untouched old dashboard; both run from `npm run dev` at root (app on 5175).
- Professional Mantine design system with its own visual identity (Task 5) — not a default template.
- Clean reusable architecture: centralized `env`, single `api` client + `ApiError`, feature-first modules, agency-code-prefixed query keys, one permission gate.
- Workflow-first: reusable Entity Picker + Quick Create (Task 11) used by Bookings (Task 15); parent forms preserved; contextual creation without leaving the flow.
- Respects backend/auth/CASL contracts: session cookies only; `AGENCY_*` permission-key gating (UX only, backend authoritative); business codes in UI/URLs; Decimal-string money.
- Quality gates green per feature: `npm run lint`, `npm run typecheck`, `npm run build`; pure-logic tests via `node --test` covering error mapping, payloads, permission constants, quick-create stepper, and agency-path helpers; no console warnings in dev; no duplicated primitives; no hardcoded API URL; no committed secrets.
- Scales cleanly for future modules (Payments, settings, more features) by composition.

---

## Sequencing note vs the brief's priority list

The brief's priority order is preserved in spirit; only dependency-required reordering: **typed env (3) and API layer (4) precede theme/shell** because the transport must exist before auth/context, and the style-guide QA needs a working provider. Order actually executed: 1 workspace → 2 orchestrator → 3 env → 4 api → 5 theme → 6 i18n → 7 shell/routing → 8 auth+context+permissions → 9 primitives → 10 forms → 11 picker+quick-create → 12…17 features. After the foundation (Tasks 1–11) is approved here, each feature (12–17) should be planned/executed as its own small cycle.

## Plan status

Plan first — nothing in the repository was modified except this file. Waits for `APPROVED` / `تمام`.