# Task Plan: theme-agency public website/theme engine (Astro)

Durable roadmap for `frontend/theme-agency/`. Source of truth:
`TASKS_THEME_AGENCY.md` (T1–T15) + `PROJECT_MAP_THEME_AGENCY.md`. Keep this
file concise — do not duplicate implementation detail that already lives there.

## Goal

Build the production theme-agency engine (Astro + React islands + Cloudflare
Workers): SDK core, Starter theme, fixtures, one shared public/preview render
path, tenant + SEO boundaries, Theme Lab, shared islands, theme tooling +
visual tests, Cloudflare deployment, and runtime theme switching. Every task
T1–T15 is verified before `[x]`; one task at a time; stop for `تمام` between
tasks.

## Current Task

- Task: T1 (Phase 1) — scaffold/project structure only (`in_progress`)
- Note: React Island implementation belongs to T11, not T1.

## Execution Rules

- One task at a time; verify (gate: `astro check` / `eslint` / `node --test` /
  `theme:test` / `build`) before marking `[x]`; STOP and wait for `تمام` between tasks.
- The agent NEVER runs `npm`/`npx` install or scaffold commands (no
  `npm install`, no `create-astro`, no `npx` scaffolding). Report the exact
  commands for the user to run; resume once dependencies exist. Only allowed npm
  command: read-only `npm view`.
- `node --test` + `.ts`: verified natively supported (Node v24.21.0, type
  stripping — probe passed). Core unit tests use `node:test`.
- File statuses mirror TASKS (`[~]`/`in_progress`, `[x]`, `[!] Blocked`).

## Phases

### Phase 1: M1 — Foundation + SDK Core + Starter Theme + Public Render Path

- [~] T1  Scaffold/project structure only (package.json scripts, tsconfig
          strict + alias, astro.config.mjs, .gitignore, `src/` shell, `src/sdk.ts`)
- [ ] T2  Core contracts (`src/core/contracts.ts`)
- [ ] T3  Settings schema/validation + resolver + registry (+ `node --test`)
- [ ] T4  Three-layer tokens + branding mapping (+ `node --test`)
- [ ] T5  Page models + DataSource interface + fixtures (published + draft)
- [ ] T6  Starter theme (manifest, settings, tokens, Layout, sections, pages)
- [ ] T7  Public render path (`render-storefront.ts` + layout + pages)
- **Success:** `astro check` + `eslint` green; default/starter theme renders
  home/trips/trip-detail from fixtures; core tests green.
- **Status:** in_progress

### Phase 2: M2 — Tenant + SEO

- [ ] T8  Tenant resolver + middleware (host → tenant, domain allow-list)
- [ ] T9  SEO engine (`src/core/seo.ts`) + render-head, theme-independent (+ tests)
- **Success:** tenant resolution wired; theme-independent SEO head
  (canonical/hreflang/OG/JSON-LD); tests green.
- **Status:** pending

### Phase 3: M3 — Theme Lab + Preview

- [ ] T10 Preview context + draft overrides + signed token + `/_lab` routes +
          toolbar island + noindex
- **Success:** preview uses the SAME render path as public (D13); draft
  overrides apply; all preview output noindex.
- **Status:** pending

### Phase 4: M4 — Shared React Islands

- [ ] T11 `@astrojs/react` wiring + island contract (serializable typed props) +
          starter theme uses islands in a real section
- **Success:** an island hydrates inside a starter section with typed,
  serializable props.
- **Status:** pending

### Phase 5: M5 — Theme Tooling + Visual Testing

- [ ] T12 `theme:new` (from starter) + `theme:check` (contract, forbidden-import
          scan, hex scan)
- [ ] T13 `theme:test` — Playwright specs (viewports, RTL, default fallback,
          preview noindex)
- **Success:** `theme:check` validates a theme; `theme:test` green locally.
- **Status:** pending

### Phase 6: M6 — Cloudflare + Runtime Theme Switching

- [ ] T14 Cloudflare deployment boundary (`@astrojs/cloudflare` + `wrangler.toml`)
          + `npm run build` green
- [ ] T15 Runtime theme switching + publish/rollback/caching contract (second
          demo theme; flip `themeId` live)
- **Success:** two themes registered; flipping `themeId` renders the other with
  no redeploy; full final gate green.
- **Status:** pending

## Success Criteria per Phase

See per-phase **Success:** lines above. A phase is complete only when all its
tasks are `[x]` and its gate passes.