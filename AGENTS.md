# AGENTS.md — Travel SaaS Platform

Base instructions for agents working anywhere in this repository. This file is loaded in **every** session via `opencode.json` (`instructions`). An app whose stack or conventions differ materially from this file may carry its own `AGENTS.md` with **local deltas only** — app-specific stack, structure, and conventions. Verify such a file exists before reading or citing it.

Shared policy lives here. App files must not duplicate it.

## 1. Repository Topology

```text
travel-saas/
├── PROJECT_MAP.md          # What exists — architecture reference
├── AGENTS.md               # This file — how to work (repo-wide base)
├── opencode.json           # Repo-wide OpenCode config + instructions
├── .opencode/skills/       # Repo-wide skills (discovered from anywhere)
├── backend/                # NestJS API (auth + platform RBAC, Group 1) — exists
└── frontend/
    ├── agency-dashboard-mantine/  # Agency Dashboard (Mantine) — exists
    ├── theme-agency/       # Public storefront/theme engine (Astro + Cloudflare) — exists
    └── admin/              # Platform Super Dashboard (Vite + React SPA) — exists
    # marketplace/          # Public marketplace — does NOT exist yet
```

`marketplace/` does **not** exist. Do not create it, reference its files, or fabricate its behavior unless the user explicitly requests the work. The earlier `frontend/dashboard/` (shadcn SPA) and `frontend/storefront/` (Next.js) apps were **removed as a superseded approach**; do not recreate them. `backend/` is scaffolded (NestJS 12) and Group 1 (authentication + platform RBAC) is implemented; backend features beyond Group 1 are not implemented.

Work only inside the app directory relevant to the task unless the user explicitly requests changes elsewhere.

## 2. Product Architecture (in brief)

A multi-tenant Travel SaaS platform. These frontend apps exist:

- **Dashboard** — per-agency management (auth, trips, bookings, customers, agency profile, website/theme, team, settings). Implemented as `frontend/agency-dashboard-mantine/` (Mantine).
- **Theme Agency** — the storefront/theme engine (`frontend/theme-agency/`): theme registry, schema-driven settings, one shared public + preview render path, and the public read boundary consumed from the backend. `agency.themeId` selects a theme from a registry; themes are rendered from props only. The platform owns tenant resolution, locale routing, SEO, and preview mode (always noindex). This is the storefront implementation wired to real backend data; deployment (Cloudflare/wrangler) is deferred. See its `PROJECT_MAP_THEME_AGENCY.md` and `docs/website-api-contract.md`.
- **Admin** — Platform Super Dashboard (Vite + React SPA) for platform operators: authenticated shell + Platform Roles & Permissions + Platform Users management (list/create/edit, platform-role assignment, suspend/reactivate) consuming the real backend RBAC and Platform Users APIs.

The backend is a separate system built in this repo under `backend/` (NestJS 12 + Prisma + Neon, REST `/v1`, Swagger at `/docs`). Group 1 (authentication + platform RBAC) and the Platform Users slice (CRUD + platform-role assignment + ACTIVE/SUSPENDED status) are implemented; Agency and agency-side user/membership management are not. Frontend code must **not** invent backend behavior: no fake APIs, no fake auth, no simulated multi-tenancy enforcement in UI logic. Build clean integration boundaries only.

## 3. Core Invariants

- **Official tooling first.** Prefer the framework's official CLI / convention (`create-next-app`, `vite`, shadcn) over hand-rolled scaffolding. Do not rebuild what the tooling already provides.
- **Dependency policy.** `package.json` is the source of truth. Never `npm install`, `npm i`, `npm uninstall`, `npm update`, `npm audit fix`, and never manually edit `package.json`/lockfiles. Report the exact command the user must run if a dependency is missing; continue unaffected parts of the task. Official scaffolds may install their own dependencies.
- **No fabricated behavior.** Never simulate authentication, tenants, payments, or API responses. No hardcoded `authenticated = true`, fake JWT/localStorage login, or fake endpoints.
- **Never invent files or paths.** Verify a file exists before referencing/editing it. Prefer real reuse over assumed structure.
- **Arabbing/Bidi awareness.** `ar` is a product language. Keep RTL/bidi correctness in mind when present (app forms).
- **Public data leaves through `/v1/public/*` only.** Unauthenticated reads of tenant data live in the explicitly public controller (`backend/src/website/public-website.controller.ts`) and return a whitelisted DTO — never an entity, never an internal DTO. Anything not published is unreachable: drafts are served only behind a signed, expiring, tenant-scoped preview token and fail closed with `WEBSITE_PREVIEW_TOKEN_INVALID`. Error codes must not leak existence (unknown slug and unpublished site both answer `WEBSITE_NOT_PUBLISHED`).
- **Content vs theme settings never mix.** Marketing copy (`content`, `branding`, `navigation`, `footer`) and presentation (`themeId`, `themeSettings`) are edited through separate, strictly-typed endpoints so neither can write the other's keys; a body that smuggles them is rejected.

## 4. Standard Workflow

```text
Understand   — restate the task, locate the owning feature/app
Inspect      — read only the relevant files; check package.json when deps matter
Reuse        — existing components, hooks, schemas, query/api layers first
Native tools — use each app's official tooling and conventions
Implement    — smallest coherent change; no speculative architecture
Verify      — targeted verification; see section 6
Sync state   — update PROJECT_MAP when the architecture/structure meaningfully changes
```

## 5. `PROJECT_MAP.md` vs `AGENTS.md`

- `PROJECT_MAP.md` records **what exists** (architecture reference). Read it for orientation; keep it accurate when real structure changes.
- `AGENTS.md` files describe **how to work** (policy and conventions).

Maps answer "where is X". Agent files answer "how should X be built".

## 6. Verification

- Lightweight targeted verification by default.
- Run commands inside the owning app directory (e.g. `workdir: frontend/agency-dashboard-mantine`), not the repo root.
- Confirm a script exists in that app's `package.json` before running it. Do not assume.
- Agency Dashboard (Mantine) scripts: `npm test` is the composite gate (typecheck → format check → lint → vitest → build). The website/theme live specs are opt-in and skip without `WEBSITE_TEST_*`; see `docs/website-api-contract.md` §10.
- Backend scripts: `npm run lint`, `npm test`, `npm run test:e2e`, **and `npm run build`** — vitest and `oxlint --type-aware` both pass code that does not typecheck, so the build is the only gate that catches assignment/type errors.
- Theme Agency scripts: `npm test`, `npm run lint`, `npm run check`, `npm run build`, `npm run theme:check`, `npm run theme:test`. The full-stack specs need a real backend + database and run only on demand: `node tools/website-integration-test.mjs` (see its env contract; no `package.json` script on purpose).

## 7. Safety

- Never create branches, commits, worktrees, PRs, tags, or push unless explicitly asked.
- No destructive git commands (`reset --hard`, `push --force`, etc.).
- Do not modify unrelated files. Prefer focused edits; never silently delete user work.
- Manual verification of risky changes: `npm run build` / `npm run typecheck` when warranted.

## 8. Skills

Skills live in `.opencode/skills/` (repo-wide) and `frontend/<app>/.opencode/skills/` (app-specific). OpenCode discovers both by walking up from the working directory to the git root.

- Before implementing, identify which skills are relevant; read only those; follow their conventions.
- Skill `name` matches its directory and is lower-kebab (no dots).
- App-specific skills apply to that app only — e.g. dashboard framework skills must not be treated as storefront rules.
- If a needed pattern lacks a skill, implement to the app's AGENTS.md conventions — do not invent a cross-app rule.

## 9. Composition Rules

- Repo-wide policy belongs **here**, not in app files.
- App `AGENTS.md` files are **deltas**: stack, directory structure, naming, and conventions specific to that app. Keep them slim.
- If a rule applies to more than one app, move it here.

## 10. Frontend Structure

For React/frontend code, optimize for easy tracing and clear separation of responsibilities.

- Page components must stay thin and focus on composition/orchestration.
- Move data fetching, navigation, side effects, and derived state into feature hooks.
- Move meaningful UI sections into components.
- Keep components primarily focused on rendering and user interaction.
- Move pure calculations, transforms, predicates, and decision logic into `lib` helpers.
- Prefer feature-local `components/`, `hooks/`, and `lib/` folders.
- Promote code to shared/global components only when it is genuinely reused.
- Do not create tiny wrapper components or abstractions with no clear value.
- Avoid mixing fetching, business decisions, side effects, and large UI markup in one file.
- Prefer this flow: **Page → Hooks → Components → Lib**.
- Keep changes minimal. Preserve existing behavior unless the task explicitly requires a behavior change. Do not refactor unrelated working code.