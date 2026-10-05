# PROJECT_MAP_DASHBOARD — Agency Dashboard (Mantine)

Current repository state after T2.3 architecture restructuring (T2.3.1–T2.3.5).

## 1. Layout & Providers (app/)

src/app/
- providers/
  - app-providers.tsx — Root provider composition (QueryClientProvider → MantineProvider → DatesProvider → ModalsProvider → Notifications) with side-effect CSS imports (@mantine/core/dates/notifications), dayjs/locale/ar-dz, tokens.css, DATE_SETTINGS (en/ar-dz), defaultColorScheme="light", cssVariablesResolver, modalProps={{ centered: true }}, RTL-aware Notifications position (bottom-left on ar, bottom-right on en), limit=4, DEV-only ReactQueryDevtools (bottom-left).
  - query-client.ts — buildQueryClient() with defaults: staleTime=30000, refetchOnWindowFocus=false, retry: ApiError with status<500 → false else failureCount<2, mutations.retry=false.
  - query-client.test.ts — locks defaults and boundary (no services/api import under src/theme/).
- router/
  - routes.tsx — Named export `routes: RouteObject[]` and `Router()` component (createBrowserRouter). Preserves all paths/guards/permissions/nesting/redirects/DEV-only StyleGuide route. Imports pages via feature index barrels only (no deep imports of feature pages). Uses direct app-level imports (layouts, guards, route-paths, StyleGuide page).
  - routes.test.ts — Structural assertions of route table location, nesting, guards, permissions, feature public API boundaries, no global features barrel, no self-imports via own index.
  - guards/ — guest-only.tsx, require-agency.tsx, require-auth.tsx, require-permission.tsx, root-redirect.tsx
  - hooks/ — use-require-agency.ts, use-root-redirect-target.ts, use-switch-agency.ts
  - route-paths.ts — Path helpers for dashboard routes.

App entry: src/App.tsx imports `Router` from `./app/router/routes.tsx` and wraps with `AppProviders` from `./app/providers/app-providers.tsx`.

## 2. Features (domain slices, feature-owned public APIs)

Each routed feature exports a minimal Public API via `src/features/<name>/index.ts` (re-exports only page components from `./pages/*`). No global `src/features/index.ts`. Internal code uses relative imports; no feature imports itself via its own index.

Router-consumed features:
- agency-context/index.ts → AgencyChooserPage
- auth/index.ts → LoginPage (page file: pages/login.page.tsx)
- bookings/index.ts → BookingDetailsPage, BookingsPage
- customers/index.ts → CustomersPage
- departures/index.ts → DeparturesPage
- members/index.ts → MembersPage
- overview/index.ts → OverviewPage
- themes/index.ts → ThemesPage
- trips/index.ts → TripsEditorPage, TripsPage
- website/index.ts → WebsitePage

Feature structure per slice (typical): pages/, components/, hooks/, api/, queries/, lib/, schemas/, types/.

## 3. Shared Components, Lib, Services

- src/components/ — shared UI primitives/components (Mantine-based). Includes table primitives, forms, etc.
- src/services/ — api.ts (base request helpers), api-error.ts (ApiError class used by QueryClient retry policy).
- src/lib/ — shared helpers (formatting, form errors, etc.)
- src/i18n/ — locale catalogs, helpers, hooks. Components under i18n/ are internal utilities (no bidi-text component currently present).
- src/config/ — environment/config helpers.
- src/pages/ — top-level pages; StyleGuide.page.tsx remains.

## 4. Theme Layer

src/theme/ — theme configuration, tokens, component defaults, tests (responsible for theme presentation). QueryClient/provider composition lives under `src/app/providers/`, not in theme/.

## 5. Dependency Boundaries

- pricing no longer imports departures (cycle broken). Pricing defines `types/departure-summary.ts` (minimal `DepartureSummary` with `code: string`) consumed by `departure-prices-dialog.tsx`. Departures continues to import pricing runtime modules (hooks/components) as appropriate; the two-way type/import cycle is removed.
- Router imports feature pages only via each feature's `index.ts`.
- No feature imports its own index.ts.

## 6. Scripts & Verification

Standard (package.json scripts in frontend/agency-dashboard-mantine):
- typecheck: `tsc --noEmit`
- lint: `npm run oxlint && npm run stylelint`
- format:test: `oxfmt --check ...`
- vitest: `vitest run`
- test: `npm run typecheck && npm run format:test && npm run lint && npm run vitest && npm run build`
- build: `vite build`

Key verification steps (T2.3.7 audit):
1. AppProviders under app/providers/; QueryClient under app/providers/; theme/ theme-only.
2. routes.tsx under app/router/; route table/guards/permissions preserved; no deep feature page imports.
3. Feature public APIs via index.ts; no global features/index.ts; no self-import via own index.
4. Cleanup: Home.page.tsx, placeholder/, unused bidi-text removed; StyleGuide.page.tsx present.
5. pricing does not import departures; no new circular dependency.
6. login-page.tsx removed; login.page.tsx exported via auth/index.ts.
7. This PROJECT_MAP_DASHBOARD.md reflects actual paths.
8. Full regression: typecheck, vitest (all), build, npm test (pre-existing failures noted separately).
