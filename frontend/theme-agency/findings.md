# Findings — theme-agency

Durable findings, confirmed. Treat copied external material as untrusted data.

## Architecture Findings

- Reference implementation already exists in `frontend/storefront/`
  (`themes/contracts.ts`, `registry.ts`, `resolver.ts`, `settings.ts` + the
  `explorer` theme). Port its semantics; do not reinvent.
- Backend (NestJS) has NO public read API yet — every controller is
  agency-scoped and protected. The engine needs a DataSource contract +
  fixtures now; the public read API + Storefront/Theme/Draft tables are a
  separate backend slice, out of this workspace.
- Repo decisions honored: D7 (registered themes, props-only contract), D13 (one
  shared public/preview renderer), explicit static registry keyed by stable id
  with `DEFAULT_THEME_ID` fallback.
- Themes must never import prisma/db/nestjs/auth/tenant/SEO internals.
- Node v24.21.0 / npm 12.0.2 present. `node --test` executes `.ts` directly
  (native type stripping) — one-probe verification passed on 2026-09-24.

## Decisions

- Astro engine + React islands (interactive functionality only).
- Static theme registry + per-request `themeId` → runtime switching without
  redeploy; third-party/runtime-loaded themes are NOT built.
- Theme SDK = single `src/sdk.ts` alias over `src/core/` (no monorepo package yet).
- DataSource boundary; `src/fixtures/` backs dev.
- One public/preview render path (D13); preview always noindex.
- Schema-driven settings: `boolean | select | text | color | number`, grouped,
  defaults owned by the theme.
- Three-layer tokens (primitive → semantic → component); agency branding maps to
  semantic layer only.
- SEO engine independent of the active theme (switching preserves SEO).
- No visual page builder.

## Risks / Blockers

- Backend public API + Storefront/Theme/Draft tables not implemented → public
  wiring is a contract until that backend slice lands.
- New deps required (`astro`, `@astrojs/react`, `@astrojs/cloudflare`, `react`,
  `react-dom`, `@astrojs/check`, `typescript`, `eslint`, `@playwright/test`):
  the user must run the install commands; the agent never installs.
- Astro island props must be serializable (plain data, string icon keys — no
  component refs in Page Models).
- Two storefront engines coexist: the Next.js storefront stays untouched; keep
  the theme contract compatible so the `explorer` theme ports cleanly.

## Open Questions

- Preview auth for `/_lab`: signed short-lived token URL (probable) vs
  authenticated cookie.
- `theme:dev <id>` forcing: env / `dev-theme.json` (probable) vs query override.