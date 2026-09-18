# AGENTS.md — Agency Dashboard

App-local rules for the **Agency Dashboard**. Repo-wide policy (topology, invariants, workflow, safety, verification, skills) lives in the root `AGENTS.md` — loaded automatically. Do not duplicate it here.

## 1. Scope

`frontend/dashboard/` is the per-agency management app (Vite + React + TypeScript SPA) of the multi-tenant Travel SaaS platform. Sibling apps: `frontend/storefront/` (Next 16) and `frontend/admin/` (Platform Super Dashboard). **`backend/` exists** (NestJS, REST under `/v1`, Swagger at `/docs`) and this app talks to it for real. `marketplace/` does not exist — do not reference or fabricate it.

Work only inside this app unless the user explicitly asks elsewhere.

Product areas: auth, overview, trips, bookings, customers, agency profile, website/theme, team, settings.

Two areas: **Guest** (login, register, forgot/reset password, onboarding) and **Authenticated** (agency dashboard).

## 2. Tech Stack

Use the existing stack; do not introduce alternatives when it already solves a problem.

React 19 + TypeScript (strict) + Vite · react-router-dom · Tailwind + shadcn/ui · @tanstack/react-query · zustand · react-hook-form + zod (+ @hookform/resolvers) · @tanstack/react-table · recharts · lucide-react · i18n via `src/i18n/` (EN + AR).

## 3. Feature-First Architecture

```text
src/
├── app/            # router/, providers/
├── components/     # ui/ (shadcn), shared/ (cross-feature)
├── features/       # auth, trips, bookings, customers, agency, dashboard, ...
├── layouts/
├── hooks/          # only genuinely cross-feature hooks
├── lib/
├── stores/
├── i18n/
└── types/          # only cross-feature types
```

Each feature owns its files:

```text
features/<feature>/
├── pages/  components/  hooks/
├── schemas/  api/  queries/
├── types/  utils/  routes/
```

Create folders only when they have a real responsibility. Prefer narrow scope: feature-local before `shared/`, `shared/` before global.

## 4. Responsibility Split

```text
Page        → composition and layout
Component   → presentation
Hook        → stateful behavior + orchestration
Schema      → validation (Zod)
Query/API   → server communication
Type        → TypeScript contracts
Utility     → pure transformations
```

Pages stay small. Keep UI and logic separated. Do not over-engineer simple features.

## 5. Naming Conventions

Kebab-case filenames; named exports; one clear responsibility per file.

```text
login-page.tsx            register-form.tsx          password-field.tsx
use-register.ts           register.schema.ts         trip.schema.ts
auth.api.ts               auth.queries.ts            auth.types.ts
sidebar.store.ts          auth.store.ts              trip-editor.store.ts
create-agency-slug.ts     format-trip-price.ts
```

TypeScript: prefer `type` over `interface` unless merging/extension is genuinely needed.

## 6. Forms

React Hook Form + Zod via `zodResolver`. Validation lives in the schema, never in `onSubmit`.

Schemas live in the feature:

```text
features/<feature>/schemas/<feature>.schema.ts   # e.g. trip.schema.ts, agency.schemas.ts
```

Do not co-locate schemas in component files. Do not fake server validation (email/subdomain availability must wait for a real API).

## 7. Server State + API Layer

- Use TanStack Query for fetching/caching/mutations. Never call `fetch` directly inside a page/component when an api/query boundary exists.
- API functions in `features/<feature>/api/*.api.ts`; hooks/query keys in `features/<feature>/queries/*.queries.ts`.
- Layout: `Component → feature hook → useQuery/useMutation → api layer`.
- Uses **session cookies** (`credentials: "include"`) — no axios, no Bearer tokens, nothing auth-related in localStorage. All requests go through `src/lib/api.ts`, which throws `ApiError { status, code, message }`; do not add a second networking layer.
- Normalize server errors to `{ status, message, fields? }` in the api layer; keep hooks/UI agnostic of transport details.
- InvalidatE the related query key after mutations; do not mirror server state in Zustand.

## 8. Client State

Zustand only for meaningful cross-component client/UI state (sidebar open, UI prefs). **Never store a "current agency"** — see Routing. Use local React state for small interactions. Never use Zustand for server state.

Files: `src/stores/<name>.store.ts` (kebab-case), exporting `use<Name>Store`.

## 9. Routing

Used: `createBrowserRouter`, nested + layout routes, `<Outlet />`, route-level lazy loading when useful.

```text
src/app/router/
├── router.tsx   routes.tsx   route-paths.ts
└── guards/
```

Features own their routes: `features/<feature>/routes/*.routes.tsx`. Guest and authenticated areas stay structurally separated. Do not redesign the router outside the current task.

**Agency context comes from the URL.** Every authenticated route lives under `/agencies/:agencyCode/...`, and `AgencyContextProvider` resolves it from `GET /v1/agencies/:agencyCode/me`. There is no global "active agency" anywhere — that is what lets two browser tabs sit in two different agencies at once. Build links with `agencyPath()` from `features/agency-context/lib/agency-paths.ts`; never hardcode a flat path.

## 10. Boundaries

- **Auth:** real, against `POST /v1/auth/login`, `GET /v1/auth/me`, `POST /v1/auth/logout`, with an HttpOnly cookie. Never simulate: no hardcoded `authenticated = true`, no fake JWT, no localStorage login, no demo bypass. (One existed and was deliberately removed — do not reintroduce it.)
- **Authorization:** the UI may hide a control the member cannot use, via `useAgencyPermission("AGENCY_...")` over effective `Permission.key` values. That is UX only: **the backend guards are authoritative**, and a hidden control is never a substitute for one. Never authorize by role name, `membershipType` or `systemKey`.
- **Backend:** do not create fake APIs, fake endpoints or placeholder data. If an endpoint does not exist yet, say so in the UI rather than faking success. Several guest screens (register, forgot/reset password, self-service agency creation) have no backend and say so explicitly — keep them honest.

## 11. UI Standards

- shadcn/ui is already installed — reuse primitives, do **not** re-initialize or swap presets. New shadcn components are added with the official CLI.
- Clean, minimal, professional SaaS look; use the design system tokens, not arbitrary values.
- Accessible (labels, focus states, keyboard, color not the only signal) and responsive (mobile/tablet/desktop).
- AR/RTL: keep bidi correctness when AR content is present.
- Icons: lucide-react. Styling: Tailwind. No inline styles unless a third-party API requires it.

## 12. Code Style

Strict TypeScript, functional components, named exports, prefer composition over deep abstraction, no `any` unless unavoidable, avoid premature abstraction and speculative generics.

## 13. Skills

Dashboard-scoped skills live in `frontend/dashboard/.opencode/skills/`:

```text
forms-with-zod        api-query-pattern     zustand-store-pattern
shadcn-usage          theme-management      react-router-pattern
```

Read only the skills relevant to the task. Repo-wide skills (e.g. `project-comments`) live in the root `.opencode/skills/`.

## 14. Verification

Run inside this directory. Scripts: `npm run lint`, `npm run typecheck`, `npm run build`. Lightweight targeted verification by default; full verification only when the risk warrants it.

`typecheck` runs `tsc -b --force`, not `tsc --noEmit`. The root `tsconfig.json` is solution-style (`"files": []` plus `references`), and plain `tsc --noEmit` does not follow project references — it compiled zero files and passed unconditionally. Keep it in build mode, and do not "simplify" it back.

**Tests:** there is no test runner and none may be installed without approval. Pure logic is tested with Node's built-in runner:

```bash
node --test --experimental-strip-types src/**/*.test.ts
```

It does not resolve the `@/` path alias, so a module under test must not import through it — keep the pure function free of aliased imports and put any adapter beside it. There are no render tests; do not claim any.

**Dependencies:** never run `npm install`/`npm i`, and never add, remove or change a dependency in `package.json`. Report the exact command the user must run instead. (Fixing a `scripts` entry is not a dependency change.)