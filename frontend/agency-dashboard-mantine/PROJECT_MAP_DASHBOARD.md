# PROJECT_MAP_DASHBOARD

## Purpose
Agency Dashboard (Mantine) SPA for per-agency management: trips, departures, bookings, customers, team/members, agency profile context, website/themes, settings, permissions-aware UI. Consumes real NestJS backend with HttpOnly cookie sessions.

## Stack
- Vite 8 + React 19 + TypeScript (strict)
- Mantine 9 (@mantine/core, @mantine/hooks, @mantine/form, @mantine/dates, @mantine/notifications, @mantine/modals)
- react-router-dom 7 (nested routes with agency code param)
- @tanstack/react-query 5
- i18next + react-i18next (EN + AR)
- zod + @hookform/resolvers
- date-fns, clsx, tailwind-merge

Dev port: 5175

## Entry Points
- src/main.tsx — bootstrap
- src/App.tsx — providers (Mantine, QueryClient, i18n, modals, notifications)
- src/Router.tsx — route configuration
- src/app/router/guards/* — RequireAuth, RequireAgency, RequirePermission, GuestOnly, RootRedirect
- src/app/layouts/* — AuthLayout, DashboardLayout (AppShell with header/sidebar/footer)

## Folder Structure
- src/app/ — app wiring (layouts, router guards/hooks)
- src/features/ — domain features (agency-context, auth, bookings, customers, departures, members, overview, themes, trips, website, etc.)
- src/components/ — shared UI primitives (PageHeader, SectionHeader, DataToolbar, SearchInput, DataTable, RowActionsMenu, StatusBadge, StatCard, CellStack, EmptyState, ErrorState, etc.)
- src/theme/ — tokens, theme config, colors, component defaults
- src/lib/ — utilities (api client, query keys/factories, helpers)
- src/config/ — env, api base
- src/i18n/ — locales (en/ar) and hooks
- src/hooks/ — cross-cutting hooks
- src/pages/ — top-level pages (Home, StyleGuide)

## Routing
Browser router with nested routes under /:agencyCode. Guards enforce auth/agency context/permissions. Feature pages: overview, members, customers, trips, trips/:tourCode (editor), departures, bookings, bookings/:bookingCode, website, themes.

## API / Query Boundaries
- src/lib/query-client.ts + query factories
- src/lib/api-client.ts — shared HTTP client (withCredentials)
- Feature-local api/, queries/, hooks/ (e.g. features/*/api, features/*/hooks, features/*/queries)
- TanStack Query for server state; mutations invalidate affected queries

## Auth / Agency Context
- features/auth — auth pages/hooks/api
- features/agency-context/provider/agency-provider.tsx — context with code/agency/membership/roles/permissions/can/canAny
- app/router/guards/require-agency.tsx provides AgencyProvider to protected routes
- Permissions checked via RequirePermission guard (uses useAgencyContext)

## Shared Components / Design
- Shared primitives under src/components/
- Theme tokens in src/theme/tokens.css; Mantine theme in src/theme/theme.ts
- StatusBadge uses theme/colors utilities
- DataTable is the shared table engine

## Testing / Build
- Vitest + jsdom + @testing-library/react + @testing-library/user-event
- Commands (verified): "dev", "build" (tsc -b && vite build), "lint" (oxlint), "test" (typecheck:run && format:check && lint && vitest run --reporter=basic && build), "test:watch", "format", "typecheck:run"
