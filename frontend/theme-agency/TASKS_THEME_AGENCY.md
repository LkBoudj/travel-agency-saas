# TASKS_THEME_AGENCY

Execution protocol (from repo AGENTS.md + approved plan):

- Implement ONE task at a time. Verify it, mark `[x]`, then STOP and wait for
  `تمام` before starting the next task.
- Dependency policy: the agent NEVER runs `npm`/`npx` install or scaffold
  commands — no `npm install`, no `create-astro`, no `npx` scaffolding. The only
  allowed npm command is read-only `npm view <pkg> version` (to pin versions).
  When a task needs a dependency, the agent writes the exact command for YOU to
  run, continues the unaffected parts, and resumes once the dependencies exist.
- Verification details per task are listed inline; `astro check`, `eslint`,
  `node --test`, and `theme:test` (Playwright) are the gate before any `[x]`.
- Goals come from `PROJECT_MAP_THEME_AGENCY.md` + the approved plan.

## Commands for you (run after Task 1 authoring, once before the first `astro check`)

```bash
npm install astro @astrojs/react @astrojs/cloudflare react react-dom
npm install --save-dev @astrojs/check typescript eslint @playwright/test
```

---

## M1 — Scaffold + SDK core + Starter theme + fixtures + public render path (dev)

- [x] T1  Scaffold the Astro workspace (scaffold only — no react wiring, that is
          Task 11): `package.json` (scripts: dev/build/preview/check/lint/
          test/theme:*), `tsconfig.json` (strict, path alias
          `@theme-agency/*`), `astro.config.mjs` (cloudflare adapter settings
          added in Task 14), `.gitignore`, `src/` shell (core/platform/islands/
          layouts/pages/fixtures) + `src/sdk.ts`. Pin versions via read-only
          `npm view`, then YOU run the install commands above. Verify with
          `astro check` once the dependencies exist. — `astro check` green
          2026-09-25. NOTE: eslint blocked on missing `@eslint/js` dep; run
          `npm install --save-dev @eslint/js`.
- [x] T2  Core contracts in `src/core/contracts.ts`: `ThemeDefinition`,
        `ThemeManifest`, `SettingsField` + `ThemeSettings`, `SectionDefinition`,
        `PageModel` types (`home` | `trips` | `trip-detail`), `RenderContext`.
        — `astro check` green 2026-09-25.
- [x] T3  Core settings + resolver + registry in `src/core/` (port storefront
          semantics: `settings-schema.ts` validation, `settings-resolve.ts`,
          `resolver.ts` with default-theme fallback, `registry.ts` explicit
          static registry + `DEFAULT_THEME_ID`). Unit tests via `node --test`.
          FIRST verify the actual runtime: check `node --version` and confirm
          `node --test` can execute `.ts` test files directly (native TS
          support/strip-types). If the running Node cannot, adopt the repo's
          existing TS test pattern (e.g. type-stripping flags or a tiny loader)
          BEFORE writing any test — never assume `.ts` runs as-is. Then add
          tests: schema validation, unknown-id fallback, settings merge.
          — `node --test` 27/27, `astro check` 0 errors, `eslint` clean
          (2026-09-25). NOTE: `node --test` needs a glob
          (`"src/core/**/*.test.ts"`); the dir form fails on Node v24.
- [x] T4  Tokens module `src/core/tokens.ts`: three-layer token builder
          (primitive → semantic → component CSS vars) + branding→semantic
          mapping (logical-property-aware, RTL-safe). Unit tests.
          — `node --test` 35/35, `astro check` 0 errors, `eslint` clean
          (2026-09-25).
- [x] T5  `Page models + DataSource + fixtures`: `src/core/page-models.ts`,
          `src/platform/data-source.ts` (interface: storefront config
          published+draft, content), `src/fixtures/` demo agency (branding/
          navigation/footer/settings) + demo content (published + draft) per the
          existing storefront fixture shapes (icons as string keys).
          — `node --test` 41/41, `astro check` 0 errors, `eslint` clean
          (2026-09-25).
- [x] T6  Starter theme `themes/starter/`: manifest, settings schema + defaults,
          token definition, `Layout`, sections (hero, featured tours, final CTA)
          via `SectionDefinition`, page templates home/trips/trip-detail. SDK
          imports only. — `node --test` 41/41, `astro check` 0/0/0 (42 files),
          `eslint` clean; render smoke (home/trips/trip-detail from fixtures)
          via temporary probe (removed) (2026-09-25).
- [x] T7  Public render path: `src/platform/render-storefront.ts` (single entry:
          tenant → config → theme → settings → page model → layout+page),
          `src/layouts/storefront.astro`, pages `index.astro`, `trips.astro`,
          `trips/[slug].astro`; wiring + `astro check` + `eslint` green.

## M2 — Tenant & SEO boundaries

- [x] T8  Tenant boundary `src/platform/tenant-resolver.ts` + `src/middleware.ts`:
          host → tenant (platform-domain regex `{slug}.platform.com` + domain
          allow-list), preview guard. Fixtures back it in dev.
- [x] T9  SEO engine `src/core/seo.ts` + `src/platform/render-head.ts`: title/
          description/canonical/hreflang/OG/JSON-LD derived from page model +
          agency + locale, independent of the active theme; wired into the
          layout `<head>` via a named `head` slot every theme Layout must
          expose. — `node --test` 82/82, `astro check` 0/0/0 (57 files),
          `eslint` clean, 5-page build with head tags verified in `dist`
          (2026-09-25).

## M3 — Theme Lab + preview

- [ ] T10 Preview context + draft overrides + signed short-lived preview token
          (`src/platform/preview.ts`); `/_lab/<id>/<page>` routes + toolbar
          island (settings form from schema, device widths, RTL toggle);
          noindex on all preview output; single shared render path (D13).

## M4 — Shared React islands

- [ ] T11 `@astrojs/react` wiring + island contract in `src/islands/`
          (serializable typed props): `search-filter`, `date-picker`,
          `booking-cta`; starter theme uses one island in a real section.
          Verify props serialization + hydration.

## M5 — Theme tooling + visual testing

- [ ] T12 `tools/theme-new.mjs`: scaffold `themes/<id>/` from the starter
          (renamed manifest/tokens/settings). `tools/theme-check.mjs`: required
          exports, schema-key uniqueness + valid types, forbidden-import scan
          (rejects `prisma`, `db`, `nestjs`, `auth`, `tenant`, `seo`), hardcoded
          hex scan. Wire `npm run theme:*`.
- [ ] T13 `tools/theme-test.mjs` + Playwright specs in `tests/themes/`: main
          pages × 3 viewports, RTL (`dir=rtl`) smoke, unknown-theme →
          default fallback, preview `noindex` header. Green locally.

## M6 — Cloudflare boundary + runtime switching

- [ ] T14 Cloudflare deployment boundary: `@astrojs/cloudflare` adapter output +
          `wrangler.toml` (all routes → Worker, static assets), `npm run build`
          green; deploy command documented.
- [ ] T15 Runtime theme switching + publish/rollback contract: add a second demo
          theme to the registry, flip `themeId` at runtime and verify no
          redeploy needed; document the publish/rollback + future caching
          strategy (`[tenant, themeId, settingsRev, locale]`, purge on publish)
          in `PROJECT_MAP_THEME_AGENCY.md`. Full final gate: `astro check` +
          `eslint` + `node --test` + `theme:test` + `npm run build`.