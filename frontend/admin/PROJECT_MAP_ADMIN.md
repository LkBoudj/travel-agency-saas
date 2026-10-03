# PROJECT_MAP_ADMIN

## Purpose
Platform Super Dashboard (Vite + React SPA) for platform operators: authenticated shell, Platform Roles & Permissions, Platform Users management (list/create/edit, platform-role assignment, suspend/reactivate). Consumes backend RBAC and Platform Users APIs.

## Stack
- Vite + React 19 + TypeScript
- @base-ui/react
- @tanstack/react-query
- react-router-dom 7
- react-hook-form + @hookform/resolvers + zod
- tailwindcss v4 + @tailwindcss/vite
- lucide-react
- sonner (toasts)
- date-fns
- clsx, tailwind-merge (cn util)

Dev port: 5174

## Entry Points
- src/main.tsx
- src/App.tsx
- src/app/router/router.tsx, src/app/router/routes.tsx
- src/app/router/guards/require-auth.tsx, guest-only.tsx
- src/layouts/dashboard-layout.tsx

## Folder Structure
- src/app/ — router, guards
- src/features/ — platform (agencies, auth, platform users/roles)
- src/components/ — UI primitives (shadcn-like components under ui/, shared)
- src/lib/ — api client, query client, utils
- src/config/ — env
- src/hooks/ — cross-cutting
- src/pages/ — page components (some under features)

## Routing
Browser router with auth guards. Routes include /login (guest), overview, platform-users, agencies, agency/:id, roles-and-permissions.

## API / Query
- src/lib/query-client.ts
- src/lib/api-client.ts (withCredentials for cookie sessions)
- TanStack Query for server state

## Auth
- features/auth for login; guards protect routes

## Build/Dev
- "dev", "build" (tsc -b && vite build), "lint" (oxlint), "preview"
