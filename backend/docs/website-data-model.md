# T1 — Website Data Model (Draft → Published)

Status: **DESIGN (T1 of the "Agency Website — Production Data Flow" plan). No code, no schema changes.**

This is the authoritative design for persisting an agency's public website. It is one 1:1 extension of `Agency` and must **reuse** the existing business aggregates (`Agency`, `Tour`, `Departure`, `PricingOption`, `DeparturePrice`) — it never duplicates business data.

## 1. Problem & boundaries

The Theme Agency consumes the `StorefrontDataSource` contract (`frontend/theme-agency/src/platform/data-source.ts`), which has exactly two read modes:

- `published(tenantSlug)` — the real storefront.
- `draft(tenantSlug)` — Theme Lab preview, rendered through the *same* render entry (`renderStorefront`), always noindex/no-store.

The backend must therefore persist **both** a published state and an editable draft state, plus a guarded transition between them (publishing is an explicit, permissioned action — the backend never auto-publishes, mirroring `AGENCY_TOUR_PUBLISH`).

Two more hard requirements constrain the shape:

- **Content ⇄ settings separation.** Agency-owned content (`hero`, `trustPoints`, `promotion`, `testimonials`, `finalCta`, `branding`, `navigation`, `footer`, tour curation) and theme-owned `settings` must live in distinct columns, be mutated by distinct endpoints, and be granted by distinct permissions.
- **No business-data duplication.** Tour cards, prices, itineraries are composed from `Tour` / `Departure` / `DeparturePrice` / `PricingOption` at serve time. The website stores only *references* (tour codes) for curation.

## 2. Model options evaluated

### Option 1 — separate published + draft records (CHOSEN)

| Model | Role |
|---|---|
| `AgencyWebsite` | 1:1 Agency — the **published** aggregate. Row exists ⟺ the site has been published at least once. |
| `AgencyWebsiteDraft` | 1:1 Agency — the **editable workspace**. Always ensured on first request. |

`PUBLISH` = one DB transaction: upsert `AgencyWebsite` from the draft, set `publishedAt`, write the audit row.

**Why this wins for this domain:**

- 1:1 mapping to the existing `StorefrontDataSource` (`published()` / `draft()`) and to the preview path (draft reads land in the preview boundary). No mapping/shim layer.
- Publish is a trivial, atomic copy — no merge, no diffing, no live-row mutation during editing (draft edits can never corrupt the live site).
- The aggregate is almost entirely `Json` columns + 2 scalars, so the "duplication" cost of two rows is negligible and the shapes stay identical by construction (one shared TypeScript type + one compose mapper).
- Matches the repo's explicit-transition conventions (`Tour.status`, `Booking` lifecycle): a visible, permissioned, auditable go-live action.
- Version history can be layered later without restructuring (a future `WebsiteRevision` on top of the published row).

### Option 2 — single website record + draft/revision

Rejected (sub-options and why):

- **2a — single row edited in place, `draft` JSON overlay.** Requires a merge/compose service to overlay unsaved edits over published columns, drafts are not a first-class typed shape, and an overlay doubles schema surface anyway (base columns + overlay JSON). Higher complexity, lower type safety.
- **2b — single row + `WebsiteRevision` version table (pointer to live revision).** Introduces a revision lifecycle (create/select/GC/ordering) the product does not need today; publishing is still a copy. Heavier than the domain warrants.
- **2c — single row whose columns are the draft, plus a published JSON snapshot.** Published state becomes an untyped JSON blob read by the public boundary — weaker guarantees than a typed row, equal storage.

## 3. Models (proposal for the T2 migration)

```prisma
/// One agency's published public website. Row exists ⟺ the website was
/// published at least once (absence = never published, public boundary 404s
/// WEBSITE_NOT_PUBLISHED). Tenant isolation: the row is 1:1 with Agency; the
/// agency is the tenant. `slug` is the public tenant key handed to the storefront
/// edge and must be globally unique ACROSS AgencyWebsite and AgencyWebsiteDraft
/// (enforced by the `website_slug_global_unique` deferred trigger).
model AgencyWebsite {
  id          BigInt   @id @default(autoincrement())
  agencyId    BigInt   @unique @map("agency_id")
  slug        String   @unique @db.VarChar(120)
  locale      String   @default("en") @db.VarChar(10)
  themeId     String?  @db.VarChar(64)
  themeSettings Json   @default("{}") // theme-owned SettingsMap (string|boolean|number)
  content     Json     @default("{}") // OWNED marketing copy (see §4); includes featuredTourCodes[] refs
  branding    Json     @default("{}") // logo/tagline/colors; name falls back to Agency.name
  navigation  Json     @default("[]") // NavLink[]
  footer      Json     @default("{}") // FooterData
  publishedAt DateTime  @map("published_at") @db.Timestamptz()
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz()

  agency Agency @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  @@map("agency_website")
}

/// One agency's editable website workspace. Always ensured (ensure-once) on the
/// first draft read/write. Publishing copies it atomically into AgencyWebsite,
/// never mutates it; the draft stays as the next workspace.
model AgencyWebsiteDraft {
  id          BigInt   @id @default(autoincrement())
  agencyId    BigInt   @unique @map("agency_id")
  slug        String   @unique @db.VarChar(120) // mirrors published; written by one service method
  locale      String   @default("en") @db.VarChar(10)
  themeId     String?  @db.VarChar(64)
  themeSettings Json   @default("{}")
  content     Json     @default("{}")
  branding    Json     @default("{}")
  navigation  Json     @default("[]")
  footer      Json     @default("{}")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz()

  agency Agency @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  @@map("agency_website_draft")
}
```

Notes / decisions:

- **No `status` column.** Published state = "row exists OR not". An explicit offline/pause toggle is future scope (it would add `status` + `POST /website/offline`). Keeps the first iteration simpler.
- **`slug`** is the public tenant key on the storefront boundary (dev `demo`, see `resolveTenantFromHostname`). Assigned once by the single ensure/publish writer, defaulting to the sanitized `agency.code` (stable, collision-free), overridable later by the Settings→Domain feature. Globally unique **across both tables** via a deferred constraint trigger (repo already uses deferred triggers, e.g. `agency_ownership_invariants`).
- **`themeId` / `themeSettings`** are opaque to the backend: theme schemas are frontend-owned (`src/core/contracts.ts` `SettingsSchema`). The backend shape-guards `themeSettings` as a flat map of string|boolean|number; deep schema validation happens in the Dashboard against the live registry; the engine falls back to the default theme (`usedDefaultTheme`) for unknown ids.
- **`locale`**: single locale per site for now (`en`); multi-locale is future scope.
- **Business data is never stored here**: see the mapping table (§5).

## 4. Column payloads (JSON shapes, mirroring `frontend/theme-agency/src/core/contracts.ts`)

| Column | Shape | Owned by |
|---|---|---|
| `content` | `{ hero: HeroContent; trustPoints: TrustPoint[]; promotion: PromotionContent; testimonials: TestimonialContent[]; finalCta: FinalCtaContent; featuredTourCodes: string[] }` | Agency (marketing copy + curation refs) |
| `branding` | `{ name?: string; logo: string | null; tagline?: string; colors: Partial<Record<string,string>> }` (`name` falls back to `Agency.name`) | Agency |
| `navigation` | `NavLink[]` `{ label, href }` | Agency |
| `footer` | `FooterData` `{ description?; columns: {title, links: NavLink[]}[]; legal?: NavLink[] }` | Agency |
| `themeSettings` | flat `Record<string, string|boolean|number>` (SettingsMap) | Theme (schema-bound) |

`hero.image` / `branding.logo` / `Tour.coverImageUrl` are **URL strings** (no media service yet; upload is future scope).

## 5. No-duplication mapping (compose-time only; `WebsiteComposeService`)

| Storefront DTO field | Source (read at compose, never copied) |
|---|---|
| `config.tenantSlug` | `AgencyWebsite.slug` (or draft) |
| `config.locale` | website row `locale` |
| `config.themeId` | website row `themeId` (default theme if unknown id) |
| `config.branding` | website `branding`, `name` fallback `Agency.name` |
| `config.navigation` / `config.footer` | website rows |
| `config.settings` | website `themeSettings` |
| `hero / trustPoints / promotion / testimonials / finalCta` | website `content` |
| `tours[]` | `Tour` where `status = 'PUBLISHED'` and `agency_id = website.agencyId` |
| featured order | `content.featuredTourCodes` (codes resolved to published tours, unknown/non-published dropped, then remaining published tours newest-first) |
| `tours[].durationDays` | `Tour.format/days/nights/hours` via documented formula: `days ?? nights ?? (hours? 1 : 1)` (min 1) |
| `tours[].price { amount, currency }` | `MIN(DeparturePrice.amount)` over `Departure.status = 'OPEN'` of that tour; `currency` from `PricingOption.currency` (per-tour, fallback `DZD`); `null` when none |
| `tours[].image` | `Tour.coverImageUrl` (alt = `Tour.name`) |
| `tours[].destinations` | `TourDestination` ordered by `position` (`place ?? locality`) |
| `tours[].highlights/includes/excludes` | `Tour.highlights/included/notIncluded` (JSON arrays) |
| `tours[].itinerary` | `TourItineraryDay` ordered by `position` → `{ day, title, description }` |

**Never composed** (internal surface): `Tour.internalRef`, `Tour.notes`, `Departure.notes`, capacities, `PricingOption`/`DeparturePrice` beyond the derived `startingPriceFrom`, member/user data, booking data.

## 6. Publish lifecycle

1. Dashboard edits the **draft** (content or theme) — sees a live preview via the draft boundary whenever it wants.
2. `POST /agencies/:agencyCode/website/publish` (requires `AGENCY_WEBSITE_PUBLISH`): one transaction =
   - upsert `AgencyWebsite` (create if first publish) from the draft (copy `slug/locale/themeId/themeSettings/content/branding/navigation/footer`),
   - set `publishedAt = now()`,
   - write `AuditLog` `AGENCY_WEBSITE_PUBLISHED`.
3. Public boundary now serves the new published row; the draft is untouched (next workspace).
4. The backend never auto-publishes; nothing is published implicitly by a content edit.

A site that has never been published has **no** `AgencyWebsite` row → `GET /website` and the public boundary both answer `404 WEBSITE_NOT_PUBLISHED`.

## 7. Tenant isolation & security properties

- Every website row is 1:1 with `Agency` (`agency_id` unique FK, cascade). `agency_id` is never accepted from a request body — it always comes from `:agencyCode` route resolution (existing `AgencyPermissionGuard` / `@CurrentAgency`).
- Dashboard API: JWT + ACTIVE membership + catalog permission key; all reads/writes re-scoped to the resolved agency.
- Public boundary: resolved **purely by `slug`** (never by body); returns only the published row; unpublished/unknown → 404. DTO is a whitelist (no internal fields). Draft boundary additionally requires a valid preview token (`claims.tenantSlug === :slug`).
- Preview tokens: HMAC-SHA256 `payload.signature`, payload `{ tenantSlug, themeId, iat, exp }`, TTL 900s — the exact format `frontend/theme-agency/src/platform/preview.ts` already verifies. The backend mints; the storefront only verifies; the browser never holds the secret.