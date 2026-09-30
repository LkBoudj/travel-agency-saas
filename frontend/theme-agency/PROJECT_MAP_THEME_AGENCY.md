# PROJECT_MAP_THEME_AGENCY

## [PURPOSE]
The public website/theme engine for the Travel SaaS: ONE Astro app, deployed to
Cloudflare Workers, serving every Agency's public website. Agencies pick a
registered theme, customize schema-driven settings, preview changes before
publishing, and switch themes at runtime without redeploying. Themes are
presentation only.

## [ARCHITECTURE]
Request → middleware (tenant resolution) → DataSource (storefront config +
published content) → resolve themeId → Theme Registry → resolver/settings →
build Page Model → active Theme render → theme-independent SEO head.

The Theme Registry is a static import: all themes ship in one Worker bundle;
`agency.themeId` is read per request, so runtime theme switching needs no
redeploy. Adding a brand-new theme = add it to the registry + redeploy the
Worker. One shared render path serves public AND preview (Theme Lab); preview
adds draft overrides + noindex on the same code path (repo decision D13).

The backend (NestJS) is the source of truth. The engine talks to it only
through the `DataSource` contract, now backed by the backend's public read
boundary (`GET /v1/public/website/:slug` + token-gated `/:slug/draft`) via
`src/platform/website-data-source.ts`, selected by
`src/platform/resolve-data-source.ts` when `WEBSITE_API_URL`/`STORE_URL` is set
(the middleware-verified preview token is plumbed from `locals`). In
development/build/tests without a backend URL the DataSource falls back to
`src/fixtures/`. `src/pages/themes.json` exposes the live theme registry
manifest (themeId, nameKey/descriptionKey, version, settingsSchema) for the
dashboard catalog.

## [STACK]
Astro (static-instance island rendering + `@astrojs/react` for interactive
islands) · TypeScript (strict) · React islands for interactive functionality
only · CSS custom properties (three-layer design tokens) · `@astrojs/cloudflare`
+ `wrangler` for the public runtime · `node --test` for core unit tests ·
Playwright (`@playwright/test`) for visual/RTL/responsive verification ·
`eslint` + `astro check` as the lint/typecheck surface.

## [IMPORTANT DIRECTORIES]
- `src/sdk.ts`            — the only import surface for theme developers
- `src/core/`             — framework-agnostic platform core: contracts, registry
                            helpers, resolver, settings schema + validation, page
                            models, tokens, SEO builder, theme validation
                            (node --test)
- `src/theme-registry.ts` — the authoritative id → ThemeDefinition map (Astro
                            themes can only be imported at app level)
- `src/platform/`         — Astro runtime adapters: tenant resolver, DataSource
                            (fixtures | backend), preview, render-storefront,
                            render-head
- `src/islands/`          — shared React islands (typed props, token-styled)
- `src/layouts/` `src/pages/` `src/middleware.ts` — Astro surface
- `themes/starter/`       — contract-complete minimal theme (`theme:new` source)
- `tools/`                — theme-new / theme-check / theme-test, plus
                            `website-integration-test.mjs` (full-stack runner)
- `src/fixtures/`         — fallback DataSource when no backend URL is set
- `tests/themes/`         — Playwright specs (visual/RTL/responsive, fixtures)
- `tests/integration/`    — Playwright specs against a REAL backend + database
- `docs/`                 — `website-api-contract.md` (the backend contract this
                            app consumes) and its run guide

## [CORE BOUNDARIES]
- Themes never import `prisma`, the database, NestJS internals, auth internals,
  tenant-resolution internals, or SEO internals. They render resolved
  `context` + `page` + `settings` props only.
- Platform owns: tenant resolution, data loading, locale, SEO, preview context,
  routing, head rendering.
- DataSource is a contract. Custom-domain automation / DNS verification is out of
  scope (deferred per repo do-not-build list); the domain allow-list boundary
  exists in the tenant resolver.

## [THEME DEVELOPMENT FLOW]
```
theme:new <id>   → copies themes/starter/ → themes/<id>/ (manifest, tokens, settings)
→ edit pages / sections / tokens / settings (SDK imports only)
→ theme:dev <id> → Astro dev with <id> force-active + Theme Lab overrides
→ Theme Lab      → /_lab/<id>/<page> preview: settings form, device widths, RTL
→ theme:check <id> → contract validation + forbidden-import scan + typecheck
→ theme:test <id>  → Playwright (viewports + RTL + default fallback + preview noindex)
→ register        → registry.ts entry + publish (redeploy Worker)
```

## [APPROVED TECHNICAL DECISIONS]
- Astro for the public website engine; React Islands only for interactive
  functionality.
- NestJS backend is the source of truth, consumed via a `DataSource` boundary.
- Cloudflare Workers is the public runtime (`@astrojs/cloudflare`).
- Themes are statically registered (explicit registry, keyed by stable id);
  `themeId` is resolved per request → runtime switching without redeploy.
  Third-party/runtime-loaded themes are NOT built.
- Schema-driven theme settings: `boolean | select | text | color | number`,
  grouped; defaults owned by the theme; per-agency values validated against the
  schema.
- Three-layer design tokens: primitive → semantic → component; agency branding
  maps to the semantic layer only.
- Theme Lab / preview and public rendering share ONE render path (D13); preview
  is always noindex.
- SEO engine is independent of the active theme (switching themes preserves
  SEO).
- Theme SDK is the single `src/sdk.ts` export of `src/core/`; no monorepo
  package yet (repo packaging mechanism still pending).
- No visual page builder.

## [IMPORTANT ENTRY POINTS]
- `src/platform/render-storefront.ts` — the single render path (public + preview)
- `src/middleware.ts` — tenant resolution + preview guard
- `src/theme-registry.ts` — authoritative theme registry (`src/core/registry.ts`
  holds only the generic fallback helpers) + `DEFAULT_THEME_ID` fallback
- `themes/starter/index.ts` — reference `ThemeDefinition`
- `tools/theme-check.mjs` — theme contract validation entry
- `tools/website-integration-test.mjs` — starts the storefront, then runs
  `tests/integration/website.spec.ts` against a running backend + database
  (needs a throwaway agency via `WEBSITE_TEST_*`; never a unit gate)
- `docs/website-api-contract.md` — the backend contract, error codes, run guide
  and the store↔backend verification instructions

## [ROUTE RENDERING]
`/` and `/trips` prerender from the configured DataSource at build time; trip
detail (`/trips/[slug]`) and the Theme Lab (`/_lab/[...lab]`) are the only
on-demand routes (`export const prerender = false`), because their slugs/tokens
come from the tenant and must never be frozen into a build. A plain
`astro build` therefore needs no backend; serving real tenants does.