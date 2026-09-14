# AGENTS.md — Travel SaaS Platform

Base instructions for agents working anywhere in this repository. This file is loaded in **every** session via `opencode.json` (`instructions`). Each app has its own `AGENTS.md` (e.g. `frontend/dashboard/AGENTS.md`, `frontend/storefront/AGENTS.md`) with **local deltas only** — app-specific stack, structure, and conventions.

Shared policy lives here. App files must not duplicate it.

## 1. Repository Topology

```text
travel-saas/
├── PROJECT_MAP.md          # What exists — architecture reference
├── AGENTS.md               # This file — how to work (repo-wide base)
├── opencode.json           # Repo-wide OpenCode config + instructions
├── .opencode/skills/       # Repo-wide skills (discovered from anywhere)
└── frontend/
    ├── dashboard/          # Agency Dashboard (Vite + React SPA) — exists
    └── storefront/         # Public storefront (Next 16 App Router) — exists
    # marketplace/          # Public marketplace — does NOT exist yet
    # admin/                # Platform Admin — does NOT exist yet
# backend/                  # Does NOT exist yet
```

`backend/`, `admin/`, and `marketplace/` do **not** exist. Do not create them, reference their files, or fabricate their behavior unless the user explicitly requests the work.

Work only inside the app directory relevant to the task unless the user explicitly requests changes elsewhere.

## 2. Product Architecture (in brief)

A multi-tenant Travel SaaS platform. Two apps exist:

- **Dashboard** — per-agency management (auth, trips, bookings, customers, agency profile, website/theme, team, settings).
- **Storefront** — one Next.js app serving storefronts for **many** agencies. `agency.themeId` selects a theme from a registry; themes are server components rendered with props only. The platform owns tenant resolution, routing (`/[locale]`), SEO, and preview mode (always noindex). See `frontend/storefront/AGENTS.md`.

The backend is a separate system not present in this repo. Frontend code must **not** invent backend behavior: no fake APIs, no fake auth, no simulated multi-tenancy enforcement in UI logic. Build clean integration boundaries only.

## 3. Core Invariants

- **Official tooling first.** Prefer the framework's official CLI / convention (`create-next-app`, `vite`, shadcn) over hand-rolled scaffolding. Do not rebuild what the tooling already provides.
- **Dependency policy.** `package.json` is the source of truth. Never `npm install`, `npm i`, `npm uninstall`, `npm update`, `npm audit fix`, and never manually edit `package.json`/lockfiles. Report the exact command the user must run if a dependency is missing; continue unaffected parts of the task. Official scaffolds may install their own dependencies.
- **No fabricated behavior.** Never simulate authentication, tenants, payments, or API responses. No hardcoded `authenticated = true`, fake JWT/localStorage login, or fake endpoints.
- **Never invent files or paths.** Verify a file exists before referencing/editing it. Prefer real reuse over assumed structure.
- **Arabbing/Bidi awareness.** `ar` is a product language. Keep RTL/bidi correctness in mind when present (see `project-comments` / app forms).

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
- Run commands inside the owning app directory (e.g. `workdir: frontend/dashboard`), not the repo root.
- Confirm a script exists in that app's `package.json` before running it. Do not assume.
- Dashboard scripts: `npm run lint`, `npm run typecheck`, `npm run build`.
- Storefront scripts: `npm run lint`, `npm run build` (**no `typecheck` script exists**).

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