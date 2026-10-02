# PROJECT_MAP

## [PRODUCT]
Multi-tenant SaaS ("Shopify for Travel Agencies"). Agencies manage trips →
departures → bookings → customers, get a public themed storefront on
{slug}.platform.com, and appear in a global public Marketplace. Fixed monthly
subscription per agency (billing = future). Actors: agency owners/staff,
anonymous travelers, platform operators.

## [ACTORS]
- Owner: user + owner membership; full agency control.
- Staff: user + staff membership; agency data, owner-gated ops server-side.
- Traveler: no account; reads Marketplace + Storefronts via public APIs only.
- Platform operator: Platform Admin app (frontend/admin) — shell + RBAC UI implemented.

## [SYSTEM_BOUNDARIES]
- backend/        EXISTS. NestJS 12 runtime application scaffolded and running
                  locally: single NestJS + TypeScript modular monolith; Prisma 7 →
                  PostgreSQL (hosted via Neon); REST under /v1; Swagger/OpenAPI
                  served at /docs + /docs-json. Group 1 (authentication +
                  platform RBAC), the Platform Users slice (CRUD +
                  platform-role assignment + ACTIVE/SUSPENDED status) and the
                  Agency Foundation (Agency lifecycle + explicit OWNER/EMPLOYEE
                  membership + database-enforced ownership invariants)
                  implemented — see [PLATFORM_ADMIN] and [AGENCY_OWNERSHIP].
                  Agency-side authorization (AGENCY permission guard), member
                  management + invitations, the Customers vertical slice
                  (backend + Dashboard), the Tours vertical slice
                  (backend + Dashboard) and the Bookings vertical slice
                  (backend + Dashboard — Module I closed) are IMPLEMENTED —
                  see backend/
                  backend_PROJECT_MAP.md [AGENCY_AUTHORIZATION],
                  [AGENCY_MEMBERS], [MEMBER_INVITATIONS], [CUSTOMERS] and
                  [AGENCY_TOURS].
 - frontend/agency-dashboard-mantine/  Vite 8 + React 19 + Mantine 9 SPA — the
                          agency dashboard. Dev port 5175. Auth + shell,
                          Members/Team, Customers, Trips (quick-create +
                          section-nav editor), Departures + Pricing, Bookings +
                          Travelers and the permission-aware Overview are
                          complete against the real NestJS backend.
 - frontend/marketplace/  PUBLIC web = Marketplace + Trip Details + Agency
                         Profiles (future; will reuse the storefront renderer
                         for `{slug}.platform.com`). Does NOT exist yet.
 - frontend/admin/        Platform Super Dashboard — authenticated shell +
                         Roles & Permissions (platform RBAC UI) + Platform Users
                         management + Agencies (list, create, details, edit,
                         suspend/reactivate). Overview is an honest placeholder.
                         Exists.
 - REMOVED: `frontend/dashboard/` (shadcn React SPA) and `frontend/storefront/`
            (Next.js App Router public storefront) were a superseded approach and
            have been deleted. `frontend/theme-agency/` is the storefront/theme
            engine; `frontend/agency-dashboard-mantine/` is the dashboard.
 - Root `package.json` +   One command (`npm run all` / `npm run dev`) starts every
   `scripts/dev-all.mjs`   app's dev server with prefixed output: backend :3000,
                           admin :5174, agency-dashboard-mantine :5175,
                           theme-agency :5176. Apps without `node_modules` are
                           skipped with the exact install command printed.

## [TECH_STACK]
 - storefront (theme-agency): Astro + Cloudflare — the storefront/theme engine.
              Platform owns theme resolution, tenant resolution, locale, SEO,
              preview, not-found; themes are rendered from props only.
 - marketplace: future, undrafted.
- admin: Vite+React19+TS+RR7+Tailwind4+shadcn(base-nova/@base-ui)+TSQuery+
         RHF+Zod3+Lucide — CONFIRMED. Consumes the backend RBAC API with cookie
         sessions.
- backend: NestJS 12 + TypeScript (ESM, strict) modular monolith · REST /v1 ·
           Prisma 7 + `@prisma/adapter-neon` · PostgreSQL on Neon · Zod
           validation · Passport JWT in HttpOnly cookie · CASL permission guard ·
           Swagger/OpenAPI — IMPLEMENTED (Group 1). Source of truth:
           `backend/package.json` + `backend/package-lock.json`.

## [DOMAIN_MODEL]
Platform-owned: User, Theme{id,nameKey,version,preview,settingsSchema},
theme-specific settings schema. Agency (tenant) owns: Agency, Membership(role),
AgencyProfile, AgencySettings, Storefront{slug,enabled,themeId,branding,
themeSettings}, Trip(=backend Tour, overview/itinerary/media owned today;
pricing options Module H, departures Module G), Departure(dates/
capacity/deadline/status OPEN|CLOSED|CANCELLED + prices by pricingOptionId —
Module H), Booking(→departure,
snapshot), Customer, Media. Trip ≠ Departure. Prices are departure-specific.
Composite super-keys (agency_id,id) on tenant tables.

## [SYSTEM_FLOW]
Register → verify → create agency → dashboard → create trip → itinerary →
pricing options → departures → set prices → publish → bookings/customers →
profile → storefront: select/preview/apply theme → enable → public render.

## [ARCHITECTURE]
One future backend (NestJS modular monolith, REST /v1) serving all agencies.
Two API surfaces: protected agency APIs (session + server-verified membership)
and purpose-built public read APIs (published data only; drafts/disabled
storefronts never exposed). Frontends independent, feature-first;
Route→Page→Hook→Components→Schema/Query/API. Backend owns tenancy, publication
state, visibility, pricing, capacity, booking rules.

## [TENANCY]
Tenant = Agency. Shared PostgreSQL, app-level tenancy, composite FK super-keys.
Tenant context from session server-side; client agencyId never trusted. Public
resolution: hostname/slug → public agency → published data only.

## [AGENCY_OWNERSHIP]
Backend-implemented foundation (see `backend/backend_PROJECT_MAP.md` for the
constraint-level detail). Ownership is explicit and separate from authorization:

- Membership carries `membershipType` = OWNER | EMPLOYEE. Ownership is never
  inferred from a role.
- Every Agency has EXACTLY ONE OWNER, that OWNER is always ACTIVE, and that
  OWNER always holds the canonical global agency role, identified by a
  protected `systemKey` (AGENCY_ADMIN) rather than by editable role key/name.
- OWNER (who owns the agency) != AGENCY_ADMIN (what the owner may do). An
  EMPLOYEE may hold AGENCY_ADMIN without owning the agency, and nothing is ever
  authorized because someone is the owner — authorization stays permission-based.
- Suspending the BUSINESS is `Agency.status`; an OWNER membership can never be
  suspended. Suspending the owner as a person requires transferring ownership
  first (transfer is a later slice).
- An Agency can never be created orphaned: agency + ACTIVE OWNER membership +
  canonical role assignment are written in one transaction, by one shared
  provisioning path used by both platform creation and application approval.
  When the owner is a brand new account, its identity is created inside that
  same transaction, so a failure leaves no orphan account either.
- Owning an agency does not imply platform access: an owner created this way
  gets no platform role, and an AppUser whose only context is an OWNER
  membership is a valid state.
- Agency-side authorization is IMPLEMENTED and permission-based: an agency-scoped
  route resolves `:agencyCode` from the URL, requires an ACTIVE membership in an
  operational agency, and evaluates AGENCY `Permission.key`s resolved from the
  database on every request. OWNER gets no bypass - the owner is allowed because
  their membership holds the canonical agency admin role. Cross-tenant leakage is
  blocked in the service and in PostgreSQL. `GET /v1/agencies/:agencyCode/me`
  returns the caller's context in one agency.
- Derived data (owner, member counts) is always computed from relationships;
  no denormalized owner or counter columns exist.
- The Agency profile is intentionally small: code, name, status, country,
  description, timestamps. There is no `website`/`domain` field - custom domains
  are deferred to Agency Dashboard -> Settings -> Domain, with their own
  configuration and DNS verification.

## [PUBLIC_WEB]
FUTURE (not implemented): ONE Next.js app. platform.com = Marketplace;
/trips/:slug trip details; /agencies/:slug profiles; {slug}.platform.com =
agency storefront. SEO server rendering + ISR with on-demand revalidation.

## [STOREFRONT]
Conceptual pipeline: Platform layer → tenant resolution → shared Storefront
data/business boundaries → Theme Resolver → active Theme renderer. The public
storefront = Agency public profile + published trips + selected theme; themes
present it only — no business logic, no tenancy, no booking/pricing.

`frontend/theme-agency/` (Astro + `@astrojs/cloudflare`) is the storefront/theme
engine: it reads the published website through `/v1/public/*`, resolves `themeId`
from the registry per request (runtime theme switching needs no redeploy),
serves the starter theme, and renders Theme Lab previews through the same render
path. Its Cloudflare/wrangler deployment is deferred; its local data path is
live. The earlier Next.js prototype (`frontend/storefront/`) was a superseded
approach and has been deleted — do not conflate the two or recreate it. See
`frontend/theme-agency/PROJECT_MAP_THEME_AGENCY.md` for the theme internals.

NOT YET in the storefront: `/[locale]` routes + middleware, Arabic/i18n of
system UI, SEO metadata (static title/description only today), preview mode
plumbing, hostname/slug tenant resolution (dev adapter only), Trips /
Trip-detail routes. No checkout, no fake trust data.

## [AGENCY_PROFILE]
Single Agency record is the one source of truth shared by Marketplace and
Storefront. Dashboard edits it (M1 implemented): section-scoped forms
(General, Brand, Contacts, Locations + weekly opening hours, Services,
Legal & Trust, Social Links) plus a Public Profile Readiness judgement
(required = agencyName, logo, shortDescription, public primary phone,
public primary email, primary location, tourism licence, >= 1 service).
Onboarding writes the SAME record the settings read via one shared
frontend-local boundary (agency.api.ts, dev-only — a real backend/API
replaces it). Contact primaries are per-type; internal contacts never
satisfy public readiness. Locations are array-based with at most one
primary; each location carries its own opening hours. Legal data is
self-declared and clearly not verified. Algeria legal compliance (Loi
18-05 Art. 8 & 11 tourist-activity licence requirements) is a FUTURE
backend-enforced gate, not a Dashboard claim.

## [DASHBOARD DESIGN SYSTEM]
The Agency Dashboard (Mantine variant) has one shared visual layer instead of
per-page invention. Tokens live in `src/theme/tokens.css` (`--app-*` surfaces,
borders, row hover, focus ring, status iconography, navbar active tint, sticky
save-bar clearance, theme-card media height) and are wired through
`src/theme/theme.ts`; `src/theme/component-defaults.ts` sets app-wide component
defaults, including overlay transitions that drop to zero duration under
`prefers-reduced-motion`. `src/theme/colors.ts` owns the `brand`, `gray` and
`dark` palettes plus the `STATUS_COLORS` vocabulary every status chip, badge and
row action maps to (semantic `success`/`warning`/`danger`, never hand-picked
hues). The shell (`src/app/layouts/dashboard-layout.tsx`) provides the single
`h1` per page, a skip link as the first focusable element and the navbar.
List pages compose the same primitives from `src/components/`: `PageHeader`
(h1 + actions + meta), `SectionHeader` (h2 band heading), `DataToolbar`
(search/filters/actions contract), `SearchInput`, `DataTable` (keyboard-operable
rows inside a horizontal scroll container), `RowActionsMenu` (the one row action
shell), `StatusBadge`, `StatCard`, `CellStack`, `EmptyState` and
`FormErrorSummary`. Every primitive takes its copy from i18n (en + ar) and uses
logical properties only, so the RTL layout is a direction flip rather than a
second design. A `StyleGuide.page.tsx` renders the tokens and primitives in both
locales. Website editing adds one feature-local rule on top: `.app-sticky-save-bar`
pins long forms' Save with reserved scroll padding so keyboard focus is never
parked behind it.

## [CUSTOMERS]
Agency business customer records — first agency business slice, vertical
(backend + Dashboard). A Customer is NOT an identity: no `app_user` link, no
credentials; booking records can exist for customers who never sign in.

Backend (see `backend/backend_PROJECT_MAP.md` [CUSTOMERS]): `customer` table
(migration `20260919191328_agency_customers`, `agency_id` FK cascade, CITEXT
email not unique, `customer_status_check` pinning ACTIVE | ARCHIVED). REST
under `/v1/agencies/:agencyCode/customers`, agency-scoped via
`AgencyPermissionGuard` and the pre-existing `AGENCY_CUSTOMER_VIEW/CREATE/
UPDATE/ARCHIVE` permissions (no RBAC change): searchable list (ACTIVE only, no
pagination yet), get by `CUS-` code (archived stay readable), create (blank →
null, email normalized), partial update (null clears), one-way archive
(`CUSTOMER_NOT_FOUND` 404 tenant-scoped, `CUSTOMER_ALREADY_ARCHIVED` 409).
Every mutation is audited (`AGENCY_CUSTOMER_CREATED/UPDATED/ARCHIVED`) and
documented in Swagger.

Dashboard (`frontend/agency-dashboard-mantine` customers feature,
`src/features/customers/`): list + search + shared
create/edit dialog, details route keyed by the customer code, one-way archive
with confirmation. Controls are gated on the `AGENCY_CUSTOMER_*` permissions
(UX only; backend guards authoritative). UI is a dedicated `customers` i18n
namespace (EN + AR, RTL-correct). Archived customers leave the listing; no
restore is offered anywhere.

NOT in this slice: Customers ↔ Bookings (Module I), customer counts in
platform views.

## [TOURS]
Agency reusable travel products — second agency business vertical slice
(backend + Dashboard). The backend names the product **Tour** (`TUR-…` code,
`/v1/agencies/:agencyCode/tours`); the Dashboard keeps calling it a *Trip* at
the UI layer (`/trips`). See `backend/backend_PROJECT_MAP.md` [AGENCY_TOURS]
for the backend detail.

Backend: `tour` aggregate + ordered `tour_destination` / `tour_itinerary_day`
children (migrations `20260920100000_tours_module`, `20260920101000_tour_origin`),
guarded by `AgencyPermissionGuard` and the pre-existing AGENCY catalog
(`AGENCY_TOUR_VIEW/CREATE/UPDATE/DELETE/PUBLISH`; `AGENCY_TOUR_MANAGER`
preset). Lifecycle: create always lands DRAFT; `PUT` is a full aggregate
replacement in one transaction (children re-created, positions 0..n); publish
is EXPLICIT only and runs a server-side readiness gate (`NAME`,
`DESTINATION` resolved, `SHORT_DESCRIPTION`, `COVER_IMAGE`,
`SCHEDULED_DEPARTURES_REQUIRED` — SCHEDULED tours publish only while they hold
≥ 1 OPEN departure, counted through the Departures module; pricing stays
Module H); the gate is checked on the transition only, so an already-published
tour stays PUBLISHED even if its last open departure is later closed/cancelled;
unpublish is idempotent; archive is one-way. Departures (Module G, IMPLEMENTED):
per-tour `departure` rows (migration `20260920120000_departures_module`) under
`/v1/agencies/:agencyCode/tours/:tourCode/departures`, `AGENCY_DEPARTURE_*`
guarded, create always lands OPEN, wire statuses OPEN|CLOSED|CANCELLED, cancel
is one-way and never changes `tour.status`. Contract: `TOUR_NOT_FOUND`,
`DEPARTURE_NOT_FOUND` (404, tenant-scoped),
`TOUR_PUBLISH_READINESS_BLOCKED` / `TOUR_PUBLISH_STATE_BLOCKED` /
`TOUR_ALREADY_ARCHIVED`, `DEPARTURE_ALREADY_CANCELLED` (409). Every mutation
audited + in Swagger. See `backend/backend_PROJECT_MAP.md` [AGENCY_DEPARTURES].

Dashboard (`frontend/agency-dashboard-mantine` tours feature,
`src/features/tours/`): list wired to the real API
(search + status server-driven; format/scope/destination client-side), create
drawer, editor keyed by `TUR-` code (`/trips/:tourCode`). Load = GET, Save =
PUT aggregate + explicit publish/unpublish/archive transition; a failed
transition leaves the tour exactly where the server kept it. Readiness panel matches the server gate (pricing satisfied—recommended—from the real pricing overview;
scheduled readiness counts OPEN departures from the real API). The Departures &
Pricing section is live on both Modules: a DeparturesManager (list/create/edit/
cancel, per-occurrence status badges, cancel confirmation, PUBLISHED-with-no-
open-departures warning banner) and, above/below it, the PricingManager (option
create/edit/one-way deactivate, derived starting price + priced-open-departure
summary, per-departure whole-set price dialogs inside the departures manager,
gated on AGENCY_PRICING_VIEW/MANAGE); on-request and custom-quote tours explain
the mode instead. The old draft-only
`departures-editor` was deleted and embedded `departures` were stripped from the
Tour form/draft/payload; the deferred `pricing-options-editor` placeholder was
deleted and draft `pricingOptions` stripped — real departures and prices live
only in the backend. Lists and
the editor are gated on `AGENCY_TOUR_*` via `useTourCapabilities` (UX only —
the backend guards are authoritative). The dev in-memory trips repository and
`PLACEHOLDER_TRIPS` were removed — persistence is the real Tours API. Dedicated
`trips` i18n namespace (EN + AR). Pure helpers covered by Node `node --test`.

## [BOOKINGS]
Third agency business vertical slice (backend Module I + Dashboard), closing
Module I end-to-end: the Dashboard bookings feature is wired to the real
backend Bookings API. See `backend/backend_PROJECT_MAP.md` [BOOKINGS] for the
backend detail.

Backend (Module I, IMPLEMENTED): `booking` + `booking_price_line` +
`booking_status_history` tables (migration `20260920140000_bookings_module`),
codes `BKG-…`, guarded by `AgencyPermissionGuard` and the pre-existing
`AGENCY_BOOKING_VIEW/CREATE/UPDATE/CANCEL/ADJUST` permissions (no RBAC change).
REST under `/v1/agencies/:agencyCode/bookings`: list (search by booking code /
customer name / tour name + optional `status` filter, newest first), get by
`BKG-` code (tenant-scoped 404), create with pricing selections, one-way cancel
(POST `:bookingCode/cancel`, optional reason). Creates re-read the departure
inside an interactive transaction with `SELECT … FOR UPDATE` (D11, D12), so a
burst of concurrent bookings for the last seat lets exactly one win — proven by
the live-PostgreSQL concurrency e2e suite (`test/bookings-concurrency.e2e-spec.ts`).
Prices are snapshotted into `booking_price_line` with basis-aware per-line
totals (per_person × seats / per_booking × 1); the client estimate is a preview
only, the server total is authoritative. Lifecycle begins `PENDING`; `CANCELLED`
is terminal, freeing the reserved seats; `CONFIRMED` requires a complete traveler manifest (Module J). Confirm is
wired front-to-back: the confirm dialog gates submit on
`travelerManifestComplete` (`disabled={pending || !complete}`) so it cannot
offer a guaranteed 409; manifest shown as i18n `{{count}} of {{seats}}`
(EN+AR, RTL-correct). Reserved seats immutable. Reserved seats are immutable. Every mutation audited + in
Swagger: `BOOKING_TRAVELERS_REQUIRED`, `BOOKING_ALREADY_CANCELLED`,
`BOOKING_CAPACITY_EXCEEDED`, `BOOKING_NO_PRICES`, `BOOKING_PRICE_INACTIVE`,
`BOOKING_CURRENCY_MISMATCH`, `BOOKING_DEPARTURE_CLOSED`. 34 controller specs +
concurrency e2e; Module I gates green before the Dashboard slice.

Dashboard (`frontend/agency-dashboard-mantine` bookings feature,
`src/features/bookings/`, IMPLEMENTED): list page (server-driven search + status
filter), details route keyed by the `BKG-` code with the frozen price-line
breakdown, currency, lifecycle status history, traveler manifest summary, and cancel with optional
reason;
create dialog cascades customer → tour → only-OPEN departure → only-active
pricing options and estimates the total client-side (server-authoritative on
submit). Row actions/cancel are gated on `AGENCY_BOOKING_*` via
`useBookingCapabilities` (UX only; backend guards authoritative). Confirm is
shipped in Module J (travelers slice). Dedicated `bookings` i18n namespace
(EN + AR, RTL-correct); pure helpers covered by Node `node --test`.

NOT in this slice: price-adjust / re-pricing flows, customer ↔ bookings
cross-navigation. (Booking confirmation/travelers Module J SHIPPED; see
travelers slice + Module J roadmap lines below.)

## [PLATFORM_ADMIN]
IMPLEMENTED in `frontend/admin/`: authenticated Platform Super Dashboard shell
(cookie-session login, `RequireAuth`/`GuestOnly` guards, sidebar shell, Overview
placeholder) plus the Roles & Permissions and Platform Users features. The RBAC UI
consumes the backend RBAC API only (`GET/POST /v1/roles`, `GET/PATCH/DELETE
/v1/roles/:id`, `GET /v1/roles/available-permissions`, `GET/PUT
/v1/roles/:id/permissions`) with `credentials: "include"`; it never decodes the
JWT, never stores tokens in web storage, never hardcodes a second permission
catalog, and exposes no Permission CRUD. `scope` is server-owned and never sent
by the client. Permission grouping and labels derive from backend
`resource`/`name`; duplicate-name (409), assigned-role delete (409) and rejected
permission keys (400) surface as explicit messages, and 401 re-validates the
session so the guard redirects. Pure RBAC helpers are tested with Node's
built-in `node --test` (no test runner dependency). The Platform Users feature
is now IMPLEMENTED: list/search, create, edit profile, platform-role assignment
and ACTIVE/SUSPENDED status management, consuming `/v1/platform-users` (+ the
existing `/v1/roles` catalog) with `credentials: "include"`; role `key`s come
from the backend, no second catalog, no token decoding, no web-storage tokens.
Suspended accounts (and their previously issued JWTs) are rejected by the
backend; `409 EMAIL_ALREADY_REGISTERED`, unknown/agency role keys (400) and
self-suspension (400) surface as explicit messages. Platform Users is NOT
agency-side user/membership management (Group 2+).

The Agencies feature is IMPLEMENTED against the real Agency API
(`GET/POST /v1/agencies`, `GET/PATCH /v1/agencies/:code`,
`PATCH /v1/agencies/:code/status`) with `credentials: "include"`: list with
search + status filter, create, details overview, edit of descriptive fields
only, and suspend/reactivate with confirmation. Creating an agency also creates
its owner: the operator either searches and selects an existing account
(`GET /v1/app-users/search`, which covers accounts with no platform role) or
fills in a new one, which the backend creates in the same transaction. The
account code is captured from the selection and is never typed by hand. Derived owner and `membersCount` come from
the backend and are never stored client-side. The UI never exposes ownership
internals (membership type, canonical system role, role ids), never edits
membership state, and shows no customer count — the platform has no customer
model. Owner click-through is deliberately NOT linked: no AppUser details route
covers agency owners yet (Platform Users only serves accounts holding a platform
role), so the owner renders as text with its code and linking is deferred to the
unified user-details slice. Agency Members / Customers / Application tabs are
absent rather than rendered empty. Group 1 closure was verified
end-to-end against the live backend (login → HttpOnly cookie → `/me` →
PLATFORM_ADMIN list → create/edit role → assign/remove permissions → reload
persistence → assigned-role delete conflict → delete temp role → logout →
protected-route redirect), with temporary verification data removed.

## [AGENCY_WEBSITE]
IMPLEMENTED end to end: backend + public boundary + the dashboard editor UI
(`frontend/agency-dashboard-mantine/features/website/` and `features/themes/`)
+ the theme-agency engine rendering the published result. The public website is
one publish-gated aggregate per agency, split into two ownership groups that
never write each other's keys.

- Data: `agency_website` (the live row) + `agency_website_draft` (the editable
  row), one each per agency, `slug` unique across both tables and written once
  from the lowercased `agency.code`; a deferred constraint trigger blocks a slug
  claimed by another tenant (`WEBSITE_SLUG_CONFLICT`).
- Aggregate: `content` (hero, trustPoints, promotion, testimonials, finalCta,
  featuredTourCodes) + `branding` + `navigation` + `footer` = agency marketing
  copy; `themeId` + `themeSettings` = presentation. Edited through separate
  strict endpoints (`PATCH …/draft/content`, `PATCH …/draft/theme`).
- Publish is explicit (`POST …/publish`), atomic (one transaction copies draft →
  published + stamps `publishedAt`) and audited; nothing goes live by editing.
- Preview: the backend mints a 15-minute signed Theme Lab URL from the shared
  `PREVIEW_TOKEN_SECRET`; the storefront verifies it per request and always
  answers `noindex, nofollow` + `no-store`. A missing/tampered/expired token is
  a hard 404 — never a fallback to published.
- Read boundary: `GET /v1/public/website/:slug` (published whitelist DTO;
  unknown slug and never-published site both answer `WEBSITE_NOT_PUBLISHED`) and
  the token-gated `/:slug/draft`. Tours are composed, never copied: the
  summary/detail DTOs project `Tour` + `Departure` + `PricingOption`, and a tour
  with no priced OPEN departure carries `price: null` (rendered as a
  "request a price" treatment, and omitted from SEO offers).
- Permissions: `AGENCY_WEBSITE_VIEW` / `_CONTENT_EDIT` / `_THEME_UPDATE` /
  `_PUBLISH`; agency OWNER and MANAGER presets hold all four. Full-stack proof
  in `backend/test/website.e2e-spec.ts`,
  `frontend/theme-agency/tests/integration/` (backend + storefront) and the
  opt-in `frontend/agency-dashboard-mantine/src/features/website/__tests__/backend.integration.test.ts`
  (dashboard clients against the live API); the contract and run guide are
  `frontend/theme-agency/docs/website-api-contract.md`.
- **View Website** (dashboard): the public address is resolved by the pure
  `features/website/lib/website-url.ts` — `customDomain` > `VITE_STOREFRONT_BASE_URL`
  (single-tenant dev) > `slug` + `VITE_PLATFORM_DOMAIN` (production). Unresolvable
  → the signed draft preview, never a dead link. Unit-tested; env contract in
  `frontend/theme-agency/docs/website-api-contract.md`.

## [THEME_SYSTEM]
Platform-owned presentation system. The Astro engine in `frontend/theme-agency/`
ships one theme, `starter` (`themes/starter/`, contract-complete, SDK-only
imports), which is also the scaffold source for new themes. Luxe / Minimal are
future examples only — not implemented. (`explorer` belonged to the deleted
`frontend/storefront/` prototype and is gone with it.)

- Explicit Theme Registry: themes statically imported, keyed by stable id
  (e.g. `explorer`). Ids are validated against the registry — never used to
  load arbitrary filesystem paths/modules. No runtime third-party theme code.
- Theme Resolver: `agency.themeId` → registry → settings → context; unknown or
  missing ids fall back to the default Theme (a storefront never fails on a
  bad theme id).
- Typed Theme contract: manifest (id, name, version, `previewImage`) + settings
  schema + Layout / Home / Trips / TripDetail templates; themes are pure
  renderers receiving a resolved platform context and settings as props.
- **Theme preview images** are real captures shipped in
  `frontend/theme-agency/public/demo/themes/` (`starter-home`, `starter-trips`,
  `starter-trip-detail`, `starter-home-narrow`); the dashboard Themes page
  renders them via `VITE_THEMES_BASE_URL`. Manifest `nameKey`/`descriptionKey`
  are fully-qualified keys resolved through the `themes`/`settings`
  namespaces with a raw-key fallback — a manifest never shows its own key as UI.
- Theme ≠ Branding. Theme controls layout, page composition, Hero structure,
  card presentation, Header/Footer treatment, section composition. Branding
  controls agency identity: logo, primary/secondary color, identity assets.
  Changing agency colors must NOT require creating another Theme.
- Theme settings logically belong to Agency + Theme: settings are keyed per
  theme for that agency, so switching away from Explorer and back does not
  destroy its previous settings. (Architectural contract, not a DB design.)
- V1 does NOT include a visual page builder.

## [SECURITY]
Priority: no cross-agency leakage. argon2id; HttpOnly Secure SameSite=Lax
session cookies on .platform.com; membership authz server-side; Zod on all
routes; rate-limited auth; CORS allowlist; CSP; upload allowlist; public read
service as sole public path; structured pino logs with redaction.

## [DECISIONS]
D1 modular monolith · D2 NestJS (backend framework, TypeScript) · D3 REST /v1
only · D4 shared DB + super-key tenancy · D5 session cookies (no JWT) · D6
storefront is an independent standalone app — ONE Next.js app serves every
agency and every theme; it is not embedded in the dashboard or marketplace · D7
registered platform themes over a props-only Storefront contract — no theme-side
business logic · D8 independent apps with a shared data/read-model boundary
(packaging mechanism still pending) · D9 Prisma as the ORM over PostgreSQL,
hosted via Neon (exact versions pinned at backend scaffold time) · D10 object
storage · D11 capacity via row locks in tx · D12 booking price snapshot ·
dashboard stack locked as-is · D13 shared public/preview renderer — the theme
engine (context + resolver + registry) is implemented ONCE and public + preview
run the same code path; the dashboard boundary was moved (/move-copy, never a
reimplementation) out of the dashboard into a standalone app. Future marketplace
reuse is a move/copy of the same isolated boundaries.

## [DEMO DATA CONVENTIONS]
The demo tenant `AGY-0C937B377B89` ("hichem traveling", `agency.id = 91`) holds the
hand-built demo dataset used to exercise every dashboard page: 5 published tours,
8 open departures, 9 pricing options, 19 departure prices, 5 customers, 4
bookings (mixed statuses) and a published website.

- **Everything is created through the authenticated `/v1` API** as `hichem@mail.com`
  (Agency Owner) — never direct SQL, so Zod validation, RBAC and `audit_log` apply.
  The only exception is the one-time zeroing of the tenant's business rows, which
  SQL did because the API has no `DELETE` verb for any business aggregate (lifecycle
  transitions are one-way by design).
- **Images stay remote URLs** (Unsplash CDN) — no binaries in git, and they resolve
  from both the dashboard and the storefront origin.
- `audit_log` is append-only and was never reset; resetting business data does not
  erase the history of that reset.
- Creating a tenant: the API has **no agency `DELETE`** either, so a throwaway
  tenant (e.g. the integration-test agency) is removed with a **single scoped
  `DELETE FROM agency`** — one statement, and every child disappears through
  `onDelete: CASCADE`. `app_user`, `role`, `permission`, `role_permission` and
  `audit_log` are never touched, so a throwaway login survives as an orphan with
  no tenant access, and the tenant's own audit rows stay on record.

## [ORPHANS & PENDING]
Open questions: Q3 currency model · Q4 booking/payment sequencing · Q5 team
roles · Q6 marketplace-visibility toggle · Q7 app hosting + object-storage
provider · Q8 email provider · Q9 OAuth timing · contract packaging mechanism ·
audit/monitoring vendor · host→slug resolution for the website (the slug is
written from the agency code today; the Domain feature owns custom domains) and
the Cloudflare/wrangler deployment of `frontend/theme-agency` (its local data
path is live).
Resolved (no longer open): backend framework = NestJS · ORM = Prisma · DB =
PostgreSQL · managed Postgres = Neon (see [DECISIONS]). Preview strategy = one
shared public/preview renderer (D13); preview plumbing, `/[locale]` Arabic
routes + middleware + i18n, full SEO metadata (canonical/hreflang/OG/JSON-LD),
hostname/slug tenant resolution, and wiring the Trips / Trip-detail routes are
pending Storefront platform work. Trips persistence — the Dashboard trips
feature now persists through the real backend Tours API (see [TOURS]); the dev
in-memory trip repository and `PLACEHOLDER_TRIPS` were removed.

## [DO_NOT_BUILD_YET]
billing/subscription enforcement · online payments · custom-domain automation ·
theme marketplace / third-party SDK / runtime theme code · visual page builder ·
traveler self-service · reviews/chat · mobile · i18n · complex RBAC · analytics ·
AI features · microservices/queues/Redis · DB-per-tenant tenancy ·
one-backend-per-agency model.