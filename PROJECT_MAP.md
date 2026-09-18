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
                  Agency-scoped authorization and agency member management are
                  NOT implemented.
- frontend/dashboard/    React SPA — agency management only; does NOT render the
                         public storefront.
- frontend/storefront/   Next.js 16.3.5 App Router PUBLIC STOREFRONT — one app,
                         all agencies, all themes. Exists.
- frontend/marketplace/  PUBLIC web = Marketplace + Trip Details + Agency
                         Profiles (future; will reuse the storefront renderer
                         for `{slug}.platform.com`). Does NOT exist yet.
- frontend/admin/        Platform Super Dashboard — authenticated shell +
                         Roles & Permissions (platform RBAC UI) + Platform Users
                         management + Agencies (list, create, details, edit,
                         suspend/reactivate). Overview is an honest placeholder.
                         Exists.

## [TECH_STACK]
- dashboard: React19+TS+Vite+RR7+Tailwind4+shadcn(@base-ui)+TSQuery/Table+
             Zustand+RHF+Zod3+Recharts+Lucide — CONFIRMED, keep locked.
- storefront: Next.js 16.3.5 + React 19.2.8 + TypeScript + Tailwind CSS v4 —
              EXISTS, one app for every agency. Platform owns theme resolution,
              tenant resolution, locale, SEO, preview, not-found; themes are
              server components fed via props only.
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
themeSettings}, Trip(overview/itinerary/pricingOptions/media), Departure(dates/
capacity/deadline/status + prices by pricingOptionId), Booking(→departure,
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

IMPLEMENTED in `frontend/storefront/` (standalone Next.js 16.3.5 App Router
app): one Home route renders the active Theme against a dev adapter
(`features/*/demo-data.ts` + `demo-agency.ts` — clearly temporary; a real
backend/API boundary replaces it). Theme platform implemented: typed
StorefrontTheme contract (`themes/contracts.ts`: manifest id/name/version,
settings schema + defaults, Layout + Home/Trips/TripDetail templates), explicit
Theme Registry (`themes/registry.ts`, keyed by stable id `explorer`; unknown
ids fall back to default), Theme Resolver (`themes/resolver.ts`) and settings
validation (`themes/settings.ts`). Root layout renders the active Theme
(Layout: Header/Footer) with branding→CSS-vars; content is a platform
view-model (ThemeRenderContext / StorefrontContent) passed via props — the same
code path renders public and preview, they never fork.

Explorer Theme (id `explorer`, v1.0.0 — the current first Theme): complete Home
(discovery-first hero + search panel, featured tours, destinations, trust
points, promotion, traveler stories, final CTA). Trips and Trip-detail
templates are contract-complete but their routes are NOT wired yet (honest
placeholders, no fabricated listing data).

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

## [THEME_SYSTEM]
Platform-owned presentation system. Explorer (`explorer`) is the current first
Theme; Luxe / Minimal are future examples only — not implemented.

- Explicit Theme Registry: themes statically imported, keyed by stable id
  (e.g. `explorer`). Ids are validated against the registry — never used to
  load arbitrary filesystem paths/modules. No runtime third-party theme code.
- Theme Resolver: `agency.themeId` → registry → settings → context; unknown or
  missing ids fall back to the default Theme (a storefront never fails on a
  bad theme id).
- Typed Theme contract: manifest (id, name, version) + settings schema +
  Layout / Home / Trips / TripDetail templates; themes are pure renderers
  receiving a resolved platform context and settings as props.
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
reimplementation) into the standalone `frontend/storefront` app, then the
storefront feature was removed from the dashboard. Future marketplace reuse is
a move/copy of the same isolated boundaries.

## [ORPHANS & PENDING]
Open questions: Q3 currency model · Q4 booking/payment sequencing · Q5 team
roles · Q6 marketplace-visibility toggle · Q7 app hosting + object-storage
provider · Q8 email provider · Q9 OAuth timing · contract packaging mechanism ·
audit/monitoring vendor.
Resolved (no longer open): backend framework = NestJS · ORM = Prisma · DB =
PostgreSQL · managed Postgres = Neon (see [DECISIONS]). Preview strategy = one
shared public/preview renderer (D13); preview plumbing, `/[locale]` Arabic
routes + middleware + i18n, full SEO metadata (canonical/hreflang/OG/JSON-LD),
hostname/slug tenant resolution, and wiring the Trips / Trip-detail routes are
pending Storefront platform work.

## [DO_NOT_BUILD_YET]
billing/subscription enforcement · online payments · custom-domain automation ·
theme marketplace / third-party SDK / runtime theme code · visual page builder ·
traveler self-service · reviews/chat · mobile · i18n · complex RBAC · analytics ·
AI features · microservices/queues/Redis · DB-per-tenant tenancy ·
one-backend-per-agency model.