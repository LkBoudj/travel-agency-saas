# AGENTS.md — Agency Dashboard

App-local rules for the **Agency Dashboard**. Repo-wide policy (topology, invariants, workflow, safety, verification, skills) lives in the root `AGENTS.md` — loaded automatically. Do not duplicate it here.

## 1. Scope

`frontend/dashboard/` is the per-agency management app (Vite + React + TypeScript SPA) of the multi-tenant Travel SaaS platform. Sibling apps: `frontend/storefront/` (Next 16). `backend/`, `marketplace/`, `admin/` do not exist — do not modify, reference, or fabricate them.

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
- Uses **session cookies** (`credentials: "include"`) — no axios, no Bearer tokens, no localStorage auth headers. The backend is not in this repo; build clean boundaries only.
- Normalize server errors to `{ status, message, fields? }` in the api layer; keep hooks/UI agnostic of transport details.
- InvalidatE the related query key after mutations; do not mirror server state in Zustand.

## 8. Client State

Zustand only for meaningful cross-component client/UI state (sidebar open, selected agency context, UI prefs). Use local React state for small interactions. Never use Zustand for server state.

Files: `src/stores/<name>.store.ts` (kebab-case), exporting `use<Name>Store`.

## 9. Routing

Used: `createBrowserRouter`, nested + layout routes, `<Outlet />`, route-level lazy loading when useful.

```text
src/app/router/
├── router.tsx   routes.tsx   route-paths.ts
└── guards/
```

Features own their routes: `features/<feature>/routes/*.routes.tsx`. Guest and authenticated areas stay structurally separated. Do not redesign the router outside the current task.

## 10. Boundaries

- **Auth:** guest vs authenticated. Never simulate: no hardcoded `authenticated = true`, fake JWTs, localStorage login, fake sessions/OAuth.
- **Backend:** do not create fake APIs or fake endpoints; multi-tenancy and security belong to the backend. Prepare clean integration boundaries only.

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