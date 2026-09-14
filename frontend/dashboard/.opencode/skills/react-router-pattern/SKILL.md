name: react-router-pattern
description: >-
  Dashboard conventions for routing with react-router-dom: the router module, feature-owned
  routes, and guest/authenticated separation. Use when adding routes, guards, or navigating.

---
# React Router Pattern

## Used Setup

- `createBrowserRouter` + `RouterProvider` (react-router-dom v7).
- The router is assembled in `src/app/router/`:

```text
src/app/router/
├── router.tsx       # createBrowserRouter root (layouts + route tree)
├── routes.tsx       # route registry / lazy loading
├── route-paths.ts   # path constants (imported by links/guards, never inline strings)
└── guards/          # protection wrappers (e.g. RequireAuth for the authenticated area)
```

- Features own their route modules: `features/<feature>/routes/<feature>.routes.tsx` (e.g. `auth.routes.tsx`, `trips.routes.tsx`).
- Nested layout routes use `<Outlet />`; guest area and authenticated area stay structurally separated.

## Adding a Route

1. Add the path constant in `src/app/router/route-paths.ts`.
2. Define/extend the feature route module `features/<feature>/routes/`.
3. Wire it into the router (root layout for guest vs authenticated area) with the proper guard.
4. Lazy-load route-level pages when useful; keep path strings out of components.

## Guards

- Authenticated area routes go through the auth guard; guest-only routes (login/register) have their own. Do not fake auth — the guard checks real session/state only.

## Do NOT

- Create one giant routing file holding every route.
- Build new routing with route objects inline in pages or `useNavigate("/literal/path")` where a path constant exists.
- Redesign the router architecture outside the current task.