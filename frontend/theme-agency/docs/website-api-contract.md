# Agency Website — API Contract (Dashboard + Public)

Status: **IMPLEMENTED** (plan "Agency Website — Production Data Flow", T1–T8). The body below is the contract as **built**; §7 lists the deltas from the T1 design and §9 is the run guide.

Consumers: the **dashboard** (`frontend/agency-dashboard-mantine/features/website/`, which calls §3 through `services/api.ts`) and the **theme-agency** storefront (public render + preview, live today). Server: **backend** (NestJS, `/v1` URI versioning, Swagger `/docs`, Zod + `StandardSchemaValidationPipe`).

The storefront talks to the backend **only** through this contract — it replaced the seam that used to be served by `src/fixtures/` ("There is no public read API yet"). The theme engine, `RenderContext`, SEO builder, tenant resolver, and preview middleware are unchanged.

## 1. Conventions reused from the backend

- URI versioning: all routes under `/v1`.
- Errors: `{ statusCode, message, errorCode, metadata? }`. Codes are named constants in `src/website/website.error-codes.ts` — never free strings.
- Dashboard auth: `@UseGuards(JwtAuthGuard, AgencyPermissionGuard)` + `@RequireAgencyPermissions(key)`; `:agencyCode` resolves the tenant; `agency_id` is never read from a body.
- Validation: `StandardSchemaValidationPipe` (Zod 4) → **400** on a schema violation (including a body that carries keys outside its key-group).
- Audit: every state change writes an `AuditLog` row with a stable `AUDIT_ACTIONS` name.

## 2. RBAC permissions (AGENCY scope)

Added to `RBAC_PERMISSION_CATALOG` in `src/rbac/rbac.constants.ts` (auto-granted through `ALL_AGENCY_PERMISSION_KEYS`, so `prisma db seed` synchronises them):

| Key | Endpoint(s) | Grants |
|---|---|---|
| `AGENCY_WEBSITE_VIEW` | GET website, GET draft, GET tour-catalog, POST preview | read published + draft, mint a preview link, pick featured tours |
| `AGENCY_WEBSITE_CONTENT_EDIT` | PATCH draft/content | edit copy, branding, navigation, footer |
| `AGENCY_WEBSITE_THEME_UPDATE` | PATCH draft/theme | switch theme + edit theme settings |
| `AGENCY_WEBSITE_PUBLISH` | POST publish | publish draft → live |

`AGENCY_OWNER` and `AGENCY_MANAGER` both hold all four (the manager preset excludes only `AGENCY_ROLE_DELETE`), so **publish is not owner-only**. Nav/buttons gate in the dashboard through the existing `can()` mechanism.

## 3. Dashboard API (authenticated)

Base: `/v1/agencies/:agencyCode/website`

### `GET /` — published website
- 200 → `WebsitePublishedDto`; 404 `{ errorCode: "WEBSITE_NOT_PUBLISHED" }` if never published.
- Perm: `AGENCY_WEBSITE_VIEW`

### `GET /draft` — editable workspace (ensure-once)
- Creates the draft row with defaults on first call (`slug` = lowercased `agency.code`, `locale` = `"en"`, empty aggregates). `ensureDraft` is find-then-create, so the per-agency unique index is the backstop rather than an upsert — the dashboard loads the draft once per session, so a concurrent first read is not a real path.
- 200 → `WebsiteDraftDto`; the draft's own `publishedAt` is **always `null`** — publishing stamps the separate published row, so "is the site live?" is answered by `GET /` (404 = never published), never by the draft.
- Perm: `AGENCY_WEBSITE_VIEW`

### `PATCH /draft/content` — edit agency content
Body (all optional, strictly disjoint from theme keys):
```
{ content?: { hero?, trustPoints?, promotion?, testimonials?, finalCta?, featuredTourCodes? },
  branding?: { name?, logo?, tagline?, colors? },
  navigation?: NavLink[],
  footer?: FooterData,
  locale?: string }
```
- 200 → `WebsiteDraftDto`; 400 on an invalid shape **or** on a body carrying `themeId`/`themeSettings` (the schema is `.strict()`). `locale` must be a 2-letter lowercase code. Merge semantics: `content`, `branding` and `footer` **shallow-merge per top-level key**; `navigation` **replaces** the whole array.
- Perm: `AGENCY_WEBSITE_CONTENT_EDIT`; Audit: `AGENCY_WEBSITE_DRAFT_CONTENT_UPDATED`

### `PATCH /draft/theme` — theme + settings
Body: `{ themeId?: string | null, themeSettings?: Record<string, unknown> }` — a flat map of JSON values, structurally checked by the backend only (`z.record(z.string(), z.unknown())`); validating values against a theme's settings schema is dashboard-side, and the theme engine ignores keys it cannot type-guard.
- 200 → `WebsiteDraftDto`; 400 on a body carrying content keys.
- `themeSettings` **merges per top-level key** (the dashboard settings editor relies on it): `{}` is a no-op, not a reset. To hide a setting, send it explicitly (`{"homepage.showPromotion": false}`).
- Perm: `AGENCY_WEBSITE_THEME_UPDATE`; Audit: `AGENCY_WEBSITE_DRAFT_THEME_UPDATED`

### `POST /publish` — explicit go-live
- No body. 200 → `WebsitePublishedDto`; the published row is upserted from the draft in one transaction, so content + branding + navigation + footer + `themeId` + `themeSettings` go live together. Never triggered by a content/theme edit.
- Perm: `AGENCY_WEBSITE_PUBLISH`; Audit: `AGENCY_WEBSITE_PUBLISHED`

### `POST /preview` — mint a scoped preview link
Body: `{ page?: "home" | "trips" }` (default `home`); `themeId` defaults to the draft's.
- **201** → `{ previewUrl }` = `{STOREFRONT_BASE_URL}/_lab/{themeId}/{page}?t={token}`.
- Token: `signPreviewToken({ tenantSlug, themeId }, { secret: PREVIEW_TOKEN_SECRET, ttlSeconds: 900 })` — the exact HMAC-SHA256 format + 15-minute TTL that `src/platform/preview.ts` verifies.
- Perm: `AGENCY_WEBSITE_VIEW`; Audit: `AGENCY_WEBSITE_PREVIEW_MINTED`

### `GET /tour-catalog` — minimal published tours for the featured picker
- 200 → `[{ code, name, coverImageUrl, shortDescription }]`, the agency's PUBLISHED tours. Does **not** require `AGENCY_TOUR_VIEW`: the picker is part of website editing and the DTO is a minimal whitelist.
- Perm: `AGENCY_WEBSITE_VIEW`

### DTO shapes
```
WebsiteDraftDto / WebsitePublishedDto (identical aggregate):
{ slug, locale, themeId: string | null,
  themeSettings: Record<string, unknown>,
  content: { hero, trustPoints, promotion, testimonials, finalCta, featuredTourCodes: string[] },
  branding, navigation, footer,            // theme-agency contract.ts shapes
  publishedAt: string | null,              // draft: always null
  updatedAt: string }
```

## 4. Public API (no auth — authored for the storefront)

Base: `/v1/public/website`

### `GET /:slug` — published storefront data
- 200 → `StorefrontDataDto` for the **published** row of the agency with that slug.
- 404 `WEBSITE_NOT_PUBLISHED` on an unknown slug *or* a never-published site (same code: no existence oracle).
- Whitelist DTO only; no internal fields.

### `GET /:slug/draft` — preview data
- Requires the preview token: `Authorization: Bearer <token>` (fetched server-side by the storefront; the token lives in preview locals, never in a public browser flow).
- Verifies signature, `exp`, **and** `claims.tenantSlug === :slug`; `themeId` from the claims selects the preview theme.
- 200 → `StorefrontDataDto` composed from the **draft** row; 404 `WEBSITE_DRAFT_NOT_FOUND` when the agency has no draft.
- 403 `WEBSITE_PREVIEW_TOKEN_INVALID` on any failure (fail-closed, matching `preview.ts`).

### `StorefrontDataDto` (mirrors theme-agency's `StorefrontData`)
```
{ config: { tenantSlug, locale, themeId, branding, navigation, footer,
            settings: Record<string, string|boolean|number|null> },
  hero, trustPoints, promotion, testimonials, finalCta,
  tours: TourPublicDto[] }
```
```
TourPublicDto (summary): { slug, title, excerpt, price: { amount, currency } | null,
  durationDays, image: { src, alt } | null, destinations: string[], featured: boolean }
TripDetail variant adds: description, highlights[], includes[], excludes?, itinerary[{day,title,description}]
```
- `tours[].slug` = `Tour.code` (`TUR-…`, unique and stable) until a dedicated tour-SEO slug feature exists.
- `durationDays` = `days ?? nights ?? 1` (values ≤ 0 fall through, min 1), computed at compose time.
- **`price` is the cheapest price across the tour's departures, or `null` when it has none** (no OPEN departure, or no priced option). Consumers must treat `null` as a first-class state: themes render a "request a price" treatment and SEO **omits** `offers` rather than inventing a number. `TourSummary.price` is therefore nullable in the theme contract (`src/core/contracts.ts`).

## 5. Error codes

`WEBSITE_NOT_PUBLISHED` (404), `WEBSITE_DRAFT_NOT_FOUND` (404), `WEBSITE_PREVIEW_TOKEN_INVALID` (403), `WEBSITE_SLUG_CONFLICT` (409, raised by the cross-table slug trigger). Schema violations reuse the standard 400.

## 6. Preview/security flow

1. The dashboard mints a preview → 15-minute token, claims `{ tenantSlug, themeId }`.
2. `/_lab/{themeId}/{page}?t=…` → middleware `decidePreviewRequest` (HMAC verify, TTL, path/theme match) → `render-preview`; always `noindex, nofollow` + `no-store`.
3. The lab render fetches **draft** data through `StorefrontDataSource.draft(slug, token)`; public renders fetch `published(slug)` from §4. A missing/broken token renders **404**, never the draft and never a published fallback.
4. The backend signs; the storefront only verifies. The secret never reaches the dashboard.

## 7. Shipped deltas from the T1 design

- **`price` became nullable** end to end (design: "theme-agency normalises `null`"). A `null` price used to crash the page with an empty HTTP 200; the contract, the two starter-theme price sites and the SEO builder now handle it explicitly.
- **Trip detail renders on demand** (`export const prerender = false`, slug from `Astro.params`). A fixture-derived `getStaticPaths` made every real `TUR-…` page 404 in dev, and a build-time path list can never cover a tenant's real data.
- **Validation is 400, not 422**; **`POST /preview` answers 201**, not 200.
- **Per-tenant slug guard.** The cross-table trigger counts `count(DISTINCT agency_id)`, not rows — a published site keeps its draft row under the same slug, so counting rows made every publish fail with 23505 → 409. Migration `20260929130000_website_slug_guard_per_tenant`.
- **Slug identity.** `AgencyWebsite.slug` is the public tenant key (written once as the lowercased agency code); host→slug mapping belongs to the future Domain feature.
- The storefront defaults its own knobs, so nothing must be configured for a dev run: `STOREFRONT_BASE_URL` → `http://localhost:4321`, `PREVIEW_TOKEN_SECRET` → `theme-test-secret` (both must match on the storefront side).

## 8. Storefront side (theme-agency)

| Env | Read by | Default | Meaning |
|---|---|---|---|
| `WEBSITE_API_URL` (alias `STORE_URL`) | `src/platform/resolve-data-source.ts` | unset → **fixtures** | backend origin; unset means the built-in demo tenant |
| `LOCALHOST_TENANT_SLUG` | `src/middleware.ts` | `demo` | dev host→tenant resolution (`localhost` → this slug) |
| `PREVIEW_TOKEN_SECRET` | `src/middleware.ts` | — | must equal the backend's; the storefront only verifies |

With `WEBSITE_API_URL` unset the storefront renders the demo fixtures — the fixtures are a **fallback for a backend-less run**, not a store.

## 9. Run guide

Terminal 1 — backend (owns the database):
```bash
cd backend
cp .env.example .env        # once; set DATABASE_URL, JWT_SECRET (≥32 chars)
npx prisma migrate deploy   # once (or `migrate dev` while developing)
npx prisma db seed          # once: syncs the RBAC catalog
npm run start:dev           # http://localhost:3000  (Swagger: /docs)
```

Terminal 2 — storefront against that backend:
```bash
cd frontend/theme-agency
WEBSITE_API_URL=http://localhost:3000 \
LOCALHOST_TENANT_SLUG=<agency code, lowercased> \
PREVIEW_TOKEN_SECRET=theme-test-secret \
npm run dev                 # http://localhost:4321
```
`LOCALHOST_TENANT_SLUG` must equal the agency's code lowercased — the backend writes the slug once, from the code. An unpublished agency answers 404; publish it first (dashboard, or the API in §3).

Terminal 3 — dashboard (the app that owns the website editor UI):
```bash
cd frontend/agency-dashboard-mantine
VITE_API_BASE_URL=http://localhost:3000 VITE_THEMES_BASE_URL=http://localhost:4321 npm run dev
# http://localhost:5175 — log in, then Website (content) and Themes (catalog +
# Preview / Customize / Activate)
```
`frontend/dashboard` is the same product on the older stack (port 5173). Dev CORS allows `5173`, `5174` (admin) and `5175` (mantine dashboard) — anything else needs `CORS_ORIGINS` in `backend/.env`. `VITE_THEMES_BASE_URL` is where the dashboard fetches `themes.json` (§4's storefront); the dev server can also proxy it.

## 10. Verification

- **Backend e2e** (`backend/test/website.e2e-spec.ts`, real PostgreSQL): permission matrix, ensure-once, publish atomicity + audit, slug isolation, public-boundary whitelist, token-gated draft.
- **Dashboard clients against the live API** (opt-in, skips without the env contract — it publishes the agency, so use a throwaway one):
  ```bash
  cd frontend/agency-dashboard-mantine
  VITE_API_BASE_URL=http://localhost:3000 VITE_THEMES_BASE_URL=http://localhost:4321 \
  WEBSITE_TEST_THEMES_BASE_URL=http://localhost:4321 \
  WEBSITE_TEST_EMAIL=… WEBSITE_TEST_PASSWORD=… WEBSITE_TEST_AGENCY_CODE=… \
  npm run vitest -- src/features/website/__tests__/backend.integration.test.ts
  ```
  `WEBSITE_TEST_THEMES_BASE_URL` opts into the storefront manifest assertion and must equal `VITE_THEMES_BASE_URL`: the committed `.env` points that at the root-relative dev proxy path `/themes`, which a browser resolves through Vite but Node's `fetch` cannot.
- **Full-stack integration** (real backend + real database + real storefront):
  ```bash
  cd frontend/theme-agency
  WEBSITE_TEST_EMAIL=… WEBSITE_TEST_PASSWORD=… WEBSITE_TEST_AGENCY_CODE=… \
    node tools/website-integration-test.mjs
  ```
  The runner starts/stops the storefront, pins the tenant + website origin, and runs `tests/integration/website.spec.ts` (`playwright.integration.config.ts`). Optional `WEBSITE_TEST_OTHER_EMAIL/_PASSWORD` adds a second agency so the cross-tenant 403 actually runs. **The specs publish the configured agency — point them at a throwaway one.** There is no `package.json` script on purpose: it needs a real database and must never be mistaken for a unit gate.
- **Storefront gates** (no backend needed): `npm test`, `npm run lint`, `npm run check`, `npm run build`, `npm run theme:check`, `npm run theme:test`.
- **Backend gates**: `npm run lint`, `npm test`, `npm run test:e2e`, **and `npm run build`** — the build is what caught the 12 type errors the other gates could not see (vitest transpiles, `oxlint --type-aware` does no assignability check).
