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
- Platform operator: future Admin app.

## [SYSTEM_BOUNDARIES]
- backend/        single Node+TS Fastify modular monolith + Postgres + object storage.
- frontend/dashboard/    React SPA — agency management only; does NOT render the storefront.
- frontend/storefront/   Next.js PUBLIC STOREFRONT renderer — one app, all agencies, all themes.
- frontend/marketplace/  Next.js PUBLIC WEB = Marketplace + Trip Details + Agency Profiles (future;
                        will reuse the storefront renderer for `{slug}.platform.com`).
- frontend/admin/        future, undrafted (pattern: Vite+React+shadcn).

## [TECH_STACK]
- dashboard: React19+TS+Vite+RR7+Tailwind4+shadcn(@base-ui)+TSQuery/Table+
             Zustand+RHF+Zod3+Recharts+Lucide — CONFIRMED, keep locked.
- marketplace: Next.js 16 stable + React19 + TS6 + Zod3 (+Tailwind chrome).
               Hostname-aware routing; themes compiled in as components.
- storefront: Next.js 15 App Router + React19 + TS + Tailwind4 — standalone
              public app (migrated out of the dashboard). Platform owns routing,
              locale, tenant resolution, SEO, preview, not-found; themes are
              server components fed via props only (no fetch/headers/SEO inside).
- admin: undecided; lean same-pattern as dashboard.
- backend: Node24 + TS + Fastify 5 + Prisma 7.10 (PIN; v8 is RC today) + pino
           + argon2id + Postgres — PROPOSED (Q1/Q2 blocking).

## [DOMAIN_MODEL]
Platform-owned: User, Theme{id,name,version,preview,capabilities,settingsSchema}.
Agency (tenant) owns: Agency, Membership(role), AgencyProfile, AgencySettings,
Storefront{slug,enabled,themeId,branding,homepageConfig,themeConfig},
Trip(overview/itinerary/pricingOptions/media), Departure(dates/capacity/
deadline/status + prices by pricingOptionId), Booking(→departure, snapshot),
Customer, Media. Trip ≠ Departure. Prices are departure-specific.
Composite super-keys (agency_id,id) on tenant tables.

## [SYSTEM_FLOW]
Register → verify → create agency → dashboard → create trip → itinerary →
pricing options → departures → set prices → publish → bookings/customers →
profile → storefront: select/preview/apply theme → enable → public render.

## [ARCHITECTURE]
One backend monolith (REST /v1). Two API surfaces: protected agency APIs
(session + server-verified membership) and purpose-built public read APIs
(published data only; drafts/disabled storefronts never exposed).
Frontends independent, feature-first; Route→Page→Hook→Components→Schema/
Query/API. Backend owns tenancy, publication state, visibility, pricing,
capacity, booking rules.

## [TENANCY]
Tenant = Agency. Shared Postgres, app-level tenancy, composite FK super-keys.
Tenant context from session server-side; client agencyId never trusted.
Public resolution: hostname/slug → public agency → published data only.

## [PUBLIC_WEB]
ONE Next.js app. platform.com = Marketplace; /trips/:slug trip details;
/agencies/:slug profiles; {slug}.platform.com = agency storefront.
SEO server rendering + ISR with on-demand revalidation.

## [STOREFRONT]
Agency ↔ Storefront (1:1): slug, enabled, themeId, branding, homepageConfig,
themeConfig. Public storefront = Agency public profile + published trips +
selected theme. Backend assembles normalized StorefrontData CONTRACT:
{agency, branding, navigation, featuredTrips, trips, destinations, contact,
socialLinks}. Themes present this contract only — no business logic.

IMPLEMENTED as a standalone app (`frontend/storefront/`, migrated from the
dashboard): ONE Next.js app serves every agency. Platform layer owns routing,
locale (`/[locale]` + middleware `x-storefront-locale` header → html lang/dir,
ar primary/en secondary), tenant resolution (dev resolver → single demo agency;
hostname/slug mapping is the future real path), data loading via a
StorefrontProvider boundary, SEO (canonical, hreflang alternates across
locales, Open Graph, JSON-LD agency + tourist trip) and preview mode
(header `x-storefront-mode: preview` / `storefront_mode` cookie / `preview.*`
host; preview forces noindex and renders platform preview chrome OUTSIDE the
theme). Locations: `/` → `/en`; `/[locale]` home; `/[locale]/trips`;
`/[locale]/trips/[slug]`; not-found; robots. Theme registry
(STOREFRONT_THEME_REGISTRY + getTheme) keys off `agency.themeId`; themes are
pure renderers receiving a full StorefrontRenderContext via props — the SAME
code path renders public and preview; they never fork. Discovery/social/
contact all derive from the Agency record; prices/dates/availability from the
public Trip read model (open departures only, Intl DZD whole-dinar). No fake
trust data, no checkout.

Theme 01 (migrated + final convergence state): discovery-first hero (brand as
small eyebrow, big translated H1, prominent search-as-product panel,
quick-discovery chips derived from real facets), container widened to
max-w-7xl (1280px) for discovery surfaces while long-form text stays on a
narrow measure, DZD prices rendered whole-dinar, mobile Filters sheet +
desktop labeled filter bar on Trips (`availability=soon` URL semantics), navy
sticky blurred header + recomposed 4-column navy footer, about/services/CTA
(system UI translated via en/ar i18n namespaces with locale-aware plurals),
trip-detail gallery hero + sticky no-checkout contact panel + mobile CTA.
Per-locale authored content (trip copy, agency copy) remains a documented
domain gap — the real Trip v4 and Agency models store single-locale text; i18n
covers the system UI. No new dependencies.

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

## [THEME_SYSTEM]
Predefined platform themes (Modern/Classic/Minimal/Luxury) shipped as React
components compiled into the marketplace app; id→component registry. Each
declares settingsSchema (controls Dashboard forms + server validation).
No runtime code execution; no third-party themes; contract + schema are the
future external-theme seed.

## [SECURITY]
Priority: no cross-agency leakage. argon2id; HttpOnly Secure SameSite=Lax
session cookies on .platform.com; membership authz server-side; Zod on all
routes; rate-limited auth; CORS allowlist; CSP; upload allowlist; public read
service as sole public path; structured pino logs with redaction.

## [DECISIONS]
D1 modular monolith · D2 Fastify 5 · D3 REST /v1 only · D4 shared DB +
super-key tenancy · D5 session cookies (no JWT) · D6 storefront inside
marketplace app · D7 compiled platform themes over StorefrontData contract ·
D8 independent apps + one contract package · D9 Prisma 7.10 pinned · D10 object
storage · D11 capacity via row locks in tx · D12 booking price snapshot ·
dashboard stack locked as-is.
D13 shared theme renderer: the theme engine (context + host + registry) is
implemented ONCE and serves public, site-preview and trip-preview from the
same code path; the dashboard boundary has been migrated (/move-copy, never a
reimplementation — D13 honored) into the standalone `frontend/storefront`
app; the storefront feature was then REMOVED from the dashboard. Future
marketplace reuse is a move/copy of the same isolated boundaries.

## [ORPHANS & PENDING]
Q1 backend framework · Q2 Prisma vs Drizzle · Q3 currency model · Q4 booking
payment · Q5 team roles · Q6 marketplace-visibility toggle · Q7 hosting/
storage · Q8 email provider · Q9 OAuth timing · preview mechanism (DONE —
shared renderer, see D13) · Admin app + features · contract packaging
mechanism · audit/monitoring vendor.

## [DO_NOT_BUILD_YET]
billing/subscription enforcement · online payments · custom-domain automation ·
theme marketplace / third-party SDK / runtime theme code · visual page builder ·
traveler self-service · reviews/chat · mobile · i18n · complex RBAC · analytics ·
AI features · microservices/queues/Redis · DB-per-tenant tenancy.