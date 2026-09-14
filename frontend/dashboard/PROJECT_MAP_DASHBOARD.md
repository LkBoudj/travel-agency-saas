# PROJECT_MAP_DASHBOARD

## [PURPOSE]
The Agency Dashboard is the authenticated SPA workspace used by travel-agency
owners and staff. It manages operational Agency data (trips, departures,
bookings, customers) and (future) configures the public Storefront (theme,
branding, homepage settings). It does NOT render the public Storefront — the
standalone `frontend/storefront` Next.js app does that. The Dashboard does NOT
require SEO.

## [SCOPE]
Dashboard owns: authenticated agency management UI, forms, client validation,
API/query integration, client interaction state, Storefront configuration,
Theme selection, Agency public profile management.
Dashboard does NOT own: backend business rules, tenant security enforcement,
public Marketplace rendering, production Storefront rendering, Admin app,
payment processing, subscription enforcement.

## [STACK]
React 19 + TypeScript (~6) + Vite 8 + React Router 7 + Tailwind CSS 4 +
shadcn/ui (Base UI) + TanStack Query 5 + Zustand 5 + React Hook Form 7 +
Zod 3 + TanStack Table 9 + Recharts 3 + Lucide React — all installed,
confirmed, locked. i18next + react-i18next — used by the i18n layer
(pending user-side `npm install i18next react-i18next`). Do not replace.
Do not install new deps without proving the current stack cannot solve
the problem.

## [ARCHITECTURE]
Feature-first: Route → Page → Feature Hook → UI Components → Schema/Query/
API/Utility. Pages compose; components present; hooks orchestrate; schemas
validate; queries own server state; APIs transport; types contract;
utilities transform; stores own meaningful cross-page client state.
Thin pages. Practical hooks. No premature shared abstractions. No micro-file
fragmentation. Feature-local ownership; promote to shared only with real
cross-feature reuse.

## [ROUTING]
createBrowserRouter with feature-owned route modules. Guest routes:
/login, /register, /register/agency, /verify-email, /forgot-password,
/reset-password. Authenticated routes: /dashboard, /trips,
/trips/:tripId, /bookings, /bookings/:bookingId, /customers,
/customers/:customerId, /agency, /team, /settings. Feature routes spread into
DashboardLayout.children. Lazy loading per feature group. Guards
(RequireAuth, GuestOnly) are UX only.
Trip v4: trip creation happens in a Create Trip drawer on the Trips list;
the standalone /trips/new route was removed (creation always yields a
draft trip and navigates to its editor at /trips/:tripId).
Agency Profile M1: the /agency placeholder was replaced by the agency
feature route module (features/agency/routes/agency.routes.tsx) —
AgencySettingsPage at /agency. Storefront was removed wholesale with the
storefront app migration (see STOREFRONT section: no /storefront, /s/:slug,
or /preview/* routes remain).

## [LAYOUT]
DashboardLayout: Sidebar (primary domains + agency display + user menu),
Header (sidebar toggle on mobile, breadcrumb, spacer, user menu dropdown),
Main (<Outlet />), Mobile overlay (drawer for sidebar). Sidebar items:
Overview, Trips, Bookings, Customers, Agency Profile, Team,
Settings. Active route highlighted via NavLink.

## [FEATURES]

### Auth
Routes: /login, /register, /register/agency, /verify-email, /forgot-password,
/reset-password. Pages: 6. Forms: RHF+Zod all wired. Demo-login dev bypass
(removable). Real integration needs: useAuthStore, session mutations,
real API calls. Status: UI COMPLETE, needs backend wiring.

### Agency Onboarding
Route: /register/agency. Creates agency after registration. M1: the submit
now calls the shared Agency boundary (createAgency in agency.api.ts — the
same record Agency Settings reads), shows an "Agency created" toast, and
navigates to /dashboard. Status: UI COMPLETE, wired to the shared dev
boundary, needs backend wiring.

### Trips
Routes: /trips, /trips/:tripId (v4: /trips/new removed — creation is a
drawer on the list). 1 page, +1 create drawer, 18+ components, 3 hooks,
2 schemas (editor + create), domain readiness functions, a dev in-memory
trip repository, and a zustand trip-editor store. Professional domain
model: format, scope, availability, duration, themes, activities, audience,
physical profile, transport, accommodation. Trip!=Departure correctly
modeled. Status: UI SUBSTANTIALLY BUILT (M1 of v4 done), needs API wiring.

### Departures & Pricing
Within Trip editor (not separate route). DeparturesAndPricingSection +
DeparturesEditor + PricingOptionsEditor. Adapts to the trip's availability
mode: scheduled → full departures editor; on_request / custom_quote →
informational states (no fake departures). Correctly separates trip-level
pricing option definitions from departure-level actual prices. Departure
start/end are ISO datetimes (startAt/endAt) with endAt >= startAt.
Status: UI BUILT within trip editor.

### Bookings
Routes: /bookings, /bookings/:bookingId. Booking→Departure→Trip. Financial
snapshot read-only. No payment in Phase 1. Status: NOT STARTED.

### Customers
Routes: /customers, /customers/:customerId. Agency CRM records. Customer!=User.
Status: NOT STARTED.

### Agency Profile
Route: /agency (real page since M1). Public identity: name, tagline, short
description, full about, brand media (logo + hero image URLs), structured
contacts (phone/mobile/whatsapp/email; per-type primary; public/internal),
locations (array-based, wilaya code + optional commune/address + per-location
weekly opening hours), services (14 typed services + service languages),
legal & trust (tourism licence number self-declared + seasonal Omra/Hajj
special authorizations with expiry), social links. Readiness card shows
Public Profile Readiness (required list drives completion, recommended is
informational). 7 sections, each a separate form owning its own slice; a
save persists only that section's patch. Shared by the public frontends
(storefront/marketplace). Status: M1 IMPLEMENTED (frontend, shared dev
boundary), needs API wiring. Media upload is NOT available — image fields
are truthful URL strings (upload boundary pending).

### Storefront
MIGRATED OUT (see CURRENT_IMPLEMENTATION migration milestone): the whole
storefront feature (config page placeholder, /s/:slug* public + /preview/*
routes, shared renderer StorefrontApp/StorefrontView/StorefrontThemeHost,
themes registry, theme01, read models + fixtures + adapter, discovery hook,
sf-* CSS tokens, storefront i18n namespace, PreviewBanner, Agency Settings
"Preview site" + Trip Editor "Preview trip" buttons) was moved as a code
move/copy into the standalone `frontend/storefront` Next.js app and then
REMOVED from the dashboard (Lint + build verified green, 2725 modules).
The dashboard no longer renders or previews the storefront in any form.
Remaining dashboard responsibility: eventually CONFIGURE the storefront
(theme selection, branding, homepage config) — that management UI was never
built and is still pending.

### Themes
Route: /storefront/themes was removed with the storefront migration. Theme
browse/preview/select/apply is a future dashboard feature; themes now render
in the standalone `frontend/storefront` app via the theme registry
(a `storefront.themeId` → `getTheme`). Themes affect presentation only.
Phase 1: 4 platform themes, no custom themes. Status: NOT STARTED.

### Team
Route: /team. Members, invitations, roles (owner+staff). Owner manages.
Status: NOT STARTED.

### Settings
Route: /settings. Tabbed: General, Localization, Security, Notifications.
Only create tabs with verified value. Status: NOT STARTED.

### Dashboard Overview
Route: /dashboard. Minimal placeholder. Finalized last using real feature
data. Status: DEFERRED (placeholder exists).

## [DOMAIN_RULES]
Trip != Departure. Trip = WHAT (title, origin, destinations, duration,
itinerary, pricing option definitions, media). Departure = WHEN (start,
end, capacity, deadline, status, departure-specific prices by pricing
option name). PricingOption belongs to Trip (definitions only). Actual
prices belong to Departure (keyed by pricing option name). Booking
→ Departure → Trip (never directly to Trip). Booking snapshots financial
facts (amount_snapshot + total). Customer != authenticated User (CRM
record, not identity). Agency Public Profile is one source of truth
shared by the public frontends (storefront / marketplace).

Trip dimensions tree (Dashboard-owned, frontend only for now):
- TripFormat (product shape) = experience | day_excursion | stay | circuit
  | cruise. Determines duration editing and logistics expectations.
- GeographicScope = domestic | international (a SCOPE, not a format).
- AvailabilityMode = scheduled | on_request | custom_quote. Only
  "scheduled" uses the departures editor; the other two are informational.
- Duration derived from Format: experience → hours; day_excursion →
  same day (no overnight); stay/circuit/cruise → days + nights, with
  0 <= nights <= days. Hidden duration values are preserved on format
  switch (never erased).
- Themes / Activities / Audience are explicit, never auto-filled.
  Definitions: Hiking / Trekking / Climbing / Cycling / Skiing-Snow are
  ACTIVITIES; Sahara / Desert is a THEME; Family / Honeymoon / Couples are
  AUDIENCES; Domestic / International is SCOPE; "Weekend trip" is a derived
  presentation label, not a Format.
- ParticipationMode (shared_group | private | individual) and GuidanceType
  (guided | escorted | self_guided | mixed) are metadata.
- ActivityRequirements appears only when physical activities are selected;
  fields optional, all numbers non-negative.
- Transport modes and accommodation types are optional multi-values;
  accommodation "None" is natural for same-day formats.
- Departures carry time of day: startAt/endAt ISO datetimes, endAt >= startAt.
- Departures have capacity > 0 and per-option prices >= 0; on-request and
  custom-quote trips have no capacity (no fake capacities).
- Location hierarchy (Dashboard-owned): Country → Region/Wilaya →
  City/Commune → optional Specific place. Domestic locations store a
  stable wilaya code (purpose codes "01"–"58") — never a translated label;
  the active locale resolves display names. Origin always stays Algerian;
  a domestic destination must resolve to a wilaya; an international
  destination falls back to free text bound to the Specific-place slot
  (structured international reference data pends). Only circuits support
  an ordered multi-destination list; list order = travel order and lives
  purely in array index (no surrogate ordering field). Changing a wilaya
  predictably clears any incompatible city selection.

## Trip v4 — FROZEN (M1)
Frozen v4 contracts (Agreed 2026). Do not renegotiate inside this task.
Trip creation collects ONLY: Name, Format, Geographic scope, Destination,
Availability, Duration. Nothing else. A created trip is always `draft`.
- TripFormat = experience | day_excursion | stay | circuit | cruise.
- GeographicScope = domestic | international; AvailabilityMode =
  scheduled | on_request | custom_quote; TripStatus = draft | published |
  archived.
- Guidance = guided | escorted | self_guided | mixed; Participation =
  shared_group | private | individual.
- Duration v4: `{ shape: 'hours'|'same_day'|'days_nights'; value:
  number | {days, nights} | null; isFlexible: boolean }`. shape derives
  from format (experience→hours; day_excursion→same_day;
  stay/circuit/cruise→days_nights). isFlexible is valid ONLY for
  custom_quote (value null, numeric fields hidden); otherwise false.
  Constraints: days > 0; 0 <= nights <= days; default nights = days - 1.
  Hidden duration values are preserved on format switch.
- TripLocation v4: `{ countryCode, regionCode?, localityId?,
  specificPlace? }`. TripDestination extends TripLocation with `{ id,
  order }`. Trip ≠ Destination(s): one trip, one or more ordered
  destination stops. The editor keeps the TripLocationDraft form model
  (wilayaCode/cityId/place); mapping to v4 TripLocation/TripDestination
  happens at the persistence boundary only.
- Pricing / Departures (unchanged from existing rules): PricingOption
  definitions belong to the trip; actual departure prices are keyed by
  option name on Departure. Meeting instructions resolve departure-first,
  else trip.defaultMeetingInstructions.
- Publish readiness: `computePublishReadiness(trip)` returns
  { required[], recommended[], canPublish }. Required: basic information
  (name), destination (resolved), customer-facing summary
  (shortDescription), cover photo, pricing (pricing option definitions),
  availability (mode set; scheduled additionally needs >= 1 departure).
  Progress counts REQUIRED items only; canPublish = all required satisfied.
- Structural change: `isStructuralChange(trip, field, context?)` is true
  for format / geographicScope / availabilityMode / status changes and
  destination-list edits. Format/scope/availability changes require an
  explicit confirm before persisting; no silent data destruction.
- No autosave. Save persists the full draft in ONE mutation when dirty;
  discard reverts to the saved snapshot. When published and the new draft
  would fail canPublish, save is blocked behind an explicit confirm that
  flips published → draft. Never auto-unpublish.
- Protection: the editor store keeps the full dirty baseline and must
  never silently redefine it from a background refetch; in-editor
  unsaved data is never discarded by strip-question behavior.

## [STOREFRONT_MANAGEMENT]
Future Dashboard feature (NOT YET BUILT). Storefront domain: enabled, slug,
themeId, branding (logo, colors), homepageConfig (hero, featured trips,
sections), themeConfig (validated by theme's settingsSchema). Dashboard
responsibilities (future): configure Storefront, edit public Agency
identity, select Theme, preview Theme, apply/publish Theme, manage branding,
manage homepage config. Public rendering belongs to the standalone
`frontend/storefront` app; preview crosses into it (developer-mode URL) until
a shared preview tunnel exists.

## [THEME_MANAGEMENT]
Phase 1: browse predefined themes, preview, select, apply/publish. Themes
are React components compiled into the `frontend/storefront` app. Dashboard
shows theme catalog (cards with preview images), preview panel, apply button
(future). Themes affect presentation only. Do NOT build: Theme Marketplace,
external Theme SDK, page builder, arbitrary theme code. Architecture avoids
extensibility blockers but does not implement extensibility.

DISTINCTION: Dashboard UI dark/light mode (ThemeProvider in main.tsx,
CSS variables for the Dashboard shell) is a SEPARATE concept from the
product's Storefront Theme Selection feature. Do not conflate.

## [STATE_MANAGEMENT]
TanStack Query: all server state (trips, bookings, customers, agency
profile, team, settings). Query keys per feature.
Mutations invalidate related keys on success. Zustand: meaningful
cross-page client state only — useAuthStore (session + active agency),
useSidebarStore (sidebar open/collapsed). React local state: page-level
UI interactions (dialog open, active section, temporary filters, form
dirty tracking). Do not duplicate server state in Zustand.
SANCTIONED EXCEPTION (Trip v4, M1): the trip-editor store owns editor
session state — `savedSnapshot` (last-successfully-saved trip for THIS
session), canonical `draft`, `isDirty`, `discard`, `initialize`,
`syncDraft`, `rebase`. The query cache is NOT the dirty baseline; a
background refetch must never silently redefine the draft/snapshot while
dirty. React Hook Form becomes a validation mirror of the canonical
draft: input changes flow RHF → zustand draft; section remounts reset
from the zustand draft. This exception exists only for the editor
session, is documented, and is not a precedent for server data in
Zustand elsewhere.
Agency Profile M1 (NO new Zustand): the agency settings page keeps all
seven section forms MOUNTED, hidden via the `hidden` attribute — switching
sections never destroys an unsaved draft. Each section owns only its form
slice: defaults map from the canonical record via getDefaults, save sends
only its own patch (toPatch → AgencyPatch), a successful save writes the
mutation's canonical response to the query cache (setQueryData, key
["agency","profile"]) and resets ONLY that section. Resync effects only
fire while a form is clean, so a background canonical change never
silently overwrites dirty fields. staleTime: Infinity on the agency query
(no background refetch). Persistence: one shared dev in-memory boundary
(agency.api.ts) used by both onboarding and settings.

## [FORMS]
React Hook Form + Zod. Page → Hook (useForm + zodResolver) → Form
Component (shadcn Form/FormField) → Zod Schema. Frontend validation
only. Server validation mapped from API error responses. useFieldArray
for dynamic arrays. Do not fake server checks.
Agency section forms follow a shared section-save lifecycle hook
(use-agency-section): each section defaults from the canonical record,
validates its own slice, persists only that patch, resets after a
successful save, and never overwrites while dirty. Switches between
sections use the hidden attribute (forms stay mounted).

## [API_BOUNDARY]
Component → Feature Hook → TanStack Query/Mutation → Feature API
module → HTTP Client → Backend. HTTP client: credentials: "include"
(session cookies), baseURL from env, error interceptor normalizing
to { status, message, fields? }. No Bearer token. Feature APIs
own their endpoints. Query keys own invalidation patterns.

## [UI_PATTERNS]
DataTable (TanStack Table wrapper), PageHeader (title+desc+action),
EmptyState (icon+message+CTA), StatusBadge (color+label), ConfirmDialog,
PageLoader, ErrorState. Promote to shared/ only after genuine cross-
feature reuse exists.

## [PAGE_INVENTORY]
/login (Auth), /register (Auth), /register/agency (Auth/Onboarding),
/verify-email (Auth), /forgot-password (Auth), /reset-password (Auth),
/dashboard (Overview), /trips (Trips list), /trips/:tripId (Trip edit),
/agency (Agency Profile settings). Creation is a drawer on /trips (v4; the
former /trips/new page was removed). Unbuilt domains are M0 placeholder
pages, replaced by feature route modules as features land: /bookings
(placeholder), /bookings/:bookingId (from bookings feature), /customers
(placeholder), /customers/:customerId (from customers feature),
/team (placeholder), /settings (placeholder).

## [CURRENT_IMPLEMENTATION]
Existing (M0 done): main.tsx (StrictMode+ThemeProvider+QueryProvider+
App+Router), app/providers/query-provider.tsx (QueryClient: staleTime 30s,
retry 1, refetchOnWindowFocus off), router.tsx (createBrowserRouter),
routes.tsx (authRoutes + authenticatedRoutes + placeholder routes),
route-paths.ts (13 paths: auth + trips + agency + bookings/customers/team/
settings placeholders), dashboard-layout.tsx (Sidebar + Header + Main +
mobile drawer), auth-layout.tsx. Layout: stores/sidebar.store.ts
(useSidebarStore), layouts/dashboard-sidebar.tsx (7 primary NavLink items:
Overview, Trips, Bookings, Customers, Agency Profile, Team, Settings),
dashboard-header.tsx (mobile toggle + user menu),
user-menu.tsx (Account placeholder menu: Agency Profile/Settings/Sign out),
components/shared/placeholder-page.tsx (honest placeholder for unbuilt
domains). Auth feature: 6 pages, 9 components, 5 hooks, 6 schemas, routes,
demo-login (dev-only). Trips feature: 2 pages, 13 components, 2 hooks, 1
comprehensive schema, types, routes, placeholder-trips (TODO remove).
DashboardPage: temporary placeholder. No API client, no useAuthStore, no
bookings/customers/team/settings features + agency feature (see below).
... [prior M0/M1 content unchanged] ...

Storefront migration milestone (D13 honored, /move-copy): all isolated
storefront + theme boundaries were moved as a code copy into the new
standalone `frontend/storefront/` Next.js app (App Router, `/[locale]`
EN/AR, middleware locale header, platform-owned tenant resolver + SEO +
preview mode + not-found, theme registry via `agency.themeId`, props-fed
server-component themes, read models + 6 bilingual fixtures, dev provider).
The dashboard-side copies were then REMOVED: src/features/storefront/**,
src/themes/theme01/**, /storefront, /s/:slug*, /preview/* routes (routes.tsx
+ route-paths.ts), sidebar Storefront item, storefront i18n namespace +
resources, sf-* CSS tokens + .storefront-theme canvas, Agency Settings
"Preview site" and Trip Editor "Preview trip" preview buttons, unused
readAllTrips/TripRecord boundary, stale preview keys. The new app renders
public AND preview from the SAME code path; preview chrome lives OUTSIDE the
themes. Verification for THIS milestone: dashboard npm run lint + npm run
build green (2725 modules, pre-existing chunk-size warning only).

Theme 01 + Storefront Preview milestone (HISTORY — dashboard implementation;
since migrated by code move to `frontend/storefront` and REMOVED from this
repo): added storefront feature
(src/features/storefront/) — read models, fixtures, adapter, discovery
hook, URL search params, 6 trips, shared renderer (StorefrontApp,
StorefrontView, StorefrontThemeHost, themes registry), theme01 (layout,
header, footer, home/trips/trip-detail templates), public route group
(/s/:slug*), auth-gated preview routes (/preview/*), preview actions
(agency-settings preview button, trip editor header preview button), sf-*
CSS tokens, storefront i18n namespace (en/ar), shared preview banner.
Verification: npm run lint + npm run build pass on this milestone. Browser
visual/RTL/responsive/manual checks are outside CLI scope (no tooling).

Theme 01 Visual Refinement milestone (reference-image conversion via the
written design contract; the reference PNG is not readable by the coding
model — user approved "proceed from written contract"): final production
design-system pass over THEME_01. DESIGN SYSTEM: sf-* palette reworked to
premium navy + warm-neutral canvas (bg warm paper, surface white, ink/deep
navy, muted warm gray, line warm border, accent navy, dark navy panel for
footer/hero, whatsapp green) + focus ring overridden to the navy accent
inside .storefront-theme. COMPONENTS added: SearchPanel (hero primary
search → navigates to pre-filtered /trips URL, real destination/format/scope
fields from the same facets), DestinationCard (photography tile, scope
context, real journey count → ?destination= facet link; fully derived from
published trips), PriceDisplay (real starting price via Intl/DZD or an
honest custom-quote label), AvailabilityDisplay (next departure or honest
mode label), Gallery (main + keyboard-operable thumbnails, no deps),
ContactActions (WhatsApp green primary + call/email, hidden gracefully when
no public contact exists), MobileCta (restrained sticky bottom action on
trip detail, lg:hidden, real price + WhatsApp/call). TripCard and
SectionHeading upgraded to the new system. HEADER/FOOTER: navy/warm premium,
real routes only, locale toggle pill, WhatsApp action when published;
footer moved to the deep-navy brand panel with licence + honest contact +
navigational links. HOMEPAGE: immersive 86vh hero (agency hero image with
navy gradient, tagline→name→shortDescription→SearchPanel→secondary CTAs;
never hardcodes Sahara Atlas Travel or Djanet), destinations discovery
(≥2 facets), featured journey grid (max 6), about + services, navy CTA band.
TRIPS: consumer filter bar (q/destination/format/scope, still 100% URL
state), results count, premium empty state. TRIP DETAIL: gallery hero,
title + meta chips + shortDescription, sticky aside (PriceDisplay lg +
AvailabilityDisplay + ContactActions + AgencyIdentity licence block),
sectioned narrative (highlights, timeline, included/excluded, practical,
meeting, important, cancellation, extras), departures table (cancelled
filtered), MobileCta. i18n: added home.destinationTrips(en/ar),
trip.requestInfo, trip.galleryImage, contact.office, home.searchTitle.
No checkout anywhere; no fake reviews/ratings/counts. Verification:
npm run lint + npm run build pass (2767 modules, only pre-existing chunk-size
+ vite native warnings). No new dependencies installed.
Theme 01 Final Convergence milestone: production design convergence pass
(discovery-first, search-as-product, premium hierarchy). UPDATES:
price-display now omits decimals for DZD ("96,000 دج" not "96,000.00 دج").
SearchPanel redesigned — consumer fields only (destination + type + submit),
larger controls, visible labels, strong focus rings. Trips template gains a
mobile Filters sheet (local-state, no new deps) and labeled desktop filter
bar including real availability filter (filters by actual nextDeparture from
the domain, URL semantics extended to `availability=soon`). Home hero is
discovery-first — big H1 ("Discover your next journey" / "اكتشف رحلتك
القادمة"), agency brand as the small eyebrow, hero subtitle translated via
system i18n, SearchPanel prominent (max-w-4xl), quick-discovery chips derived
from real facets (scopes + top destinations, deep-linked to /trips URLs),
labeled "Quick ideas". Destinations section: mobile horizontal snap-scroll,
desktop grid up to 5 cols (max-w-7xl). About section recomposed: imagery +
story + primary office location + translated service labels (agency:services
keys reused, bilingual EN/AR) + serviceLanguages chip row. CTA band split
with navy overlay. Footer recomposed: 4 columns (AGENCY / EXPLORE / CONTACT /
LEGAL+SOCIAL), real routes only (Trips, upcoming, domestic, international),
real socialLinks with external-link icons, neutral licence line. Header made
sticky (z-30, backdrop-blur), nav bumped to 15px, container widened to
max-w-7xl (1280px) across header/footer/templates/trip-detail. Trip detail
widened, Gallery gets a configurable aspectClass (lg:aspect-[21/10]),
departures status chips restyled (open=status accent, others muted).
Documentation: per-locale content storage (trip copy, agency text) documented
as a domain gap (content is single-locale in the real Trip v4 / Agency
models; i18n covers system UI only). Verification: npm run lint + npm run
build pass (same module count, same pre-existing warnings only).
UI/UX pass (post-M0): shared primitives added — PageHeader
(components/shared/page-header.tsx), SectionHeading
(features/trips/components/section-heading.tsx), NativeSelect
(components/ui/native-select.tsx, styled native select replacing raw
inline selects for consistent control height/focus). Trips index:
PageHeader + Create trip, unified search/filter toolbar with clear
search + clear filters, results count, resource table with real Edit
row action (dead buttons removed), tabular-right-aligned price,
status badges with dot + border, icon-ed empty states. Trip editor:
slim header, sticky section nav (top-14), full-bleed sticky footer
(status + Publish + Save), grouped Overview sections
(Basic / Route / Duration & travelers / Description / Highlights),
consistent SectionHeading + NativeSelect across sections.
Not-found + dashboard placeholder aligned to shell language.
Compact SaaS visual refinement: theme tokens remapped to a neutral
operational palette — gray app canvas (#F1F1F1 via `--background`),
white content surfaces, `#EBEBEB` sidebar, `#E3E3E3` borders, #303030
foreground, brand `primary` reserved for links/focus/semantic status,
`--ring` now the brand focus ring, dark-neutral default button
(`bg-foreground text-background`). Full-width 48px dark top chrome
(brand + mobile toggle + user menu); sidebar under the chrome,
240px, 32px rows, 16px icons, 13px labels, neutral white active
state. Trips index: one integrated surface (toolbar row + table +
byline) at max-w-7xl, 18px page header, compact table (12px muted
header, 13px body, 36px thumbs, tabular prices, single bordered Edit
affordance), dashed-free integrated empty states. Trip editor: focused
max-w-4xl, quiet 13px underline tabs under the 48px chrome, rounded-lg
sections, compact repeatable editors. Auth card rounded-xl; labels
13px. Primary buttons dark neutral; brand kept for links/focus/
selected/badges.
Professional Trip model & editor upgrade: feature-local domain taxonomy
(enum types + labels in trip.types.ts, typed options in
constants/trip-taxonomy.ts). Duration derived from format with
format-gated validation (hours for experiences, same-day note for day
excursions, days/nights with nights <= days for stay/circuit/cruise);
hidden duration values are preserved on format switch. Overview
restructured: Basic information / How this trip is offered /
Classification (themes, activities, audience) / Activity requirements
(progressive disclosure for physical activities) / Description /
Highlights. Transport & Accommodation moved to Details.
Departures migrated to startAt/endAt (datetime-local) with endAt >=
startAt. Departures & Pricing adapts to availability mode. Trips index:
Format column (Format · Duration), format + scope filters, compact
select-to-add + removable-chip multi-select picker, three representative
placeholder trips.
Guided Overview editor (Shopify-style IA): the Overview section now
renders as a primary editing column + secondary rail on the gray canvas
(no outer card) inside a wider max-w-6xl container. Main column: Basic
information (name, internal ref, short description) / Route & duration
(format, scope, format-gated duration, structured departure location,
destinations) / Activity requirements (conditional) / Description &
highlights. Side rail (sticky): Status / Trip setup (availability,
participation, guidance, min travelers) / Classification (themes,
activities, audience). Section tabs quieted to 12px; footer keeps
Publish + Save with a dirty-state indicator ("Unsaved changes"); Status
moved into the rail (one control per responsibility, no Discard).
Structured location editing: wilaya is a searchable Base UI Combobox
(58-wilaya reference set in constants/algeria-geo.ts, locale-resolved
labels, stable codes stored); City/Commune is a controlled text field
(cleared when its wilaya changes); Specific place is optional free text.
Circuit destinations are an ordered, progressively disclosed list
(numbered compact rows expand on demand; add/remove/reorder/nudge up-down;
remove disabled at one item); switching off circuit narrows the list to
the first destination. Validation is scope-aware via schema superRefine:
origin wilaya always required; domestic destinations need a wilaya,
international ones need the free-text place.
i18n (en/ar LTR/RTL): centralized locale layer in src/i18n (i18next +
react-i18next, namespaces common/auth/trips, fallback-to-English,
localStorage persistence, central document lang/dir sync). Three locale
packages (en + ar) with full key parity; Arabic plural forms
(_one/_two/_few/_many/_other). Locale-aware Zod validation (schema
factories taking TFunction), Intl date/currency formatting via
getIntlLocale (ar→ar-DZ to keep Latin digits), localized taxonomy labels
(trip types adopt dotted i18next keys with per-value leaf keys).
Full shell RTL: mirrored sidebar slide, logical inset/end utilities
(ps/pe/start/end), dir="ltr" on email/slug/datetime/number inputs, back
icon flips via useIsRtl. Language switcher lives in the header user menu.
dashboards of the app remain English-clean (no hardcoded UI strings
outside locale resources); user-generated content is never translated.
- Arabic RTL authenticated shell corrected: sidebar slide transform was
  conflicting with the desktop pin (`rtl:translate-x-full` emitted after
  `md:translate-x-0` hid the sidebar on Arabic desktop). Open/closed
  transforms are now gated behind `max-md:`, so the desktop sidebar is
  pinned at the inline-start edge with no transform at all.
- Desktop Sidebar is direction-aware: left in LTR, right in RTL; main
  content offset is reserved exactly once via logical `md:ps-60`.
- Mobile drawer is direction-aware (slides from left in LTR, right in
  RTL) with the same component tree.
- Top bar pushed to the inline-end with `ms-auto` (physical `ml-auto`
  collapsed the account area toward the brand in RTL).
- Mixed LTR/RTL trips content: a shared BidiText primitive isolates
  user-generated names; technical references are pinned `dir="ltr"`;
  inline numeric counters (e.g. "+1" in destination summaries) are
  isolated separately so the Arabic phrase keeps its reading order.
- Locale-aware currency display: price formatter switched to the
  ar-DZ symbol (English "DZD 120,000" / Arabic "د.ج 4.500,00"); dates
  already go through the active Intl locale.
- Arabic typography: stronger muted contrast token, neutralized
  negative letter-spacing for Arabic script, slightly taller Arabic
  line-height; search microcopy shortened to "ابحث في الرحلات".
- Trips table polish: compact 32px neutral thumbnails, 42-48px rows,
  stronger header contrast, quieter ghost edit action, subtler
  secondary metadata.
Trip v4 freeze + Milestone 1: v4 domain rules frozen above. Create Trip
is a Base UI Drawer (desktop: fixed to the logical inline-edge, full
height; mobile: full screen) with ONLY Name, Format, Geographic scope,
Destination, Availability, Duration. One shared DurationInput component
used by both create and editor (format-gated: hours / same-day / days
+ nights with default nights = days-1; custom_quote exposes "Flexible
duration"). Creating a trip persists a draft in the dev in-memory repo,
navigates to /trips/:tripId, and shows a Base UI toast "Draft created —
continue setting it up below." Trip editor now v4: header row with
breadcrumb ("Trips › [inline name edit]") + status badge; Overview =
main column (Basic information: internal ref + short customer-facing
description; Route & duration: optional origin, ordered destination
list, shared duration) + sticky side rail (Status + publish readiness,
Trip setup with structural-change confirm for format/scope/availability,
Discovery thematic chips). Description / Highlights / Activity
requirements relocated from Overview to Details; min travelers relocated
to Booking settings. Footer only appears when dirty: "Unsaved changes"
[Discard] [Save]; published-but-incomplete saves are blocked behind an
explicit unpublish confirm. Editor state per the sanctioned Zustand
exception; RHF mirrors the zustand draft. Readiness and structural
helpers are pure domain functions (semantic keys, no React/i18n/Zod).
Persistence is a clearly-marked dev in-memory repository standing in
for the future trips API (no production endpoints, no fake backend).
Agency Profile M1: the /agency placeholder was replaced by an agency
feature module — types (features/agency/types/agency.types.ts), pure
readiness domain (domain/agency-readiness.ts), one shared dev persistence
boundary (api/agency.api.ts, seeded with a demo "Atlas Travel" record on
first access, same record onboarding writes), i18n-key-based options
(constants/agency-options.ts + agency-sections.ts), Zod section schemas
(schemas/agency.schemas.ts), hooks (use-agency / use-save-agency /
use-agency-section), local agency-owned UI helpers (agency-field.tsx,
agency-section-heading.tsx, agency-settings-nav.tsx,
agency-readiness-card.tsx, agency-section-actions.tsx), four editors
(opening-hours-editor, contacts-editor, locations-editor,
special-authorizations-editor), seven section forms, and
agency-settings-page + agency.routes spread into the authenticated
router. Global geography reference promoted to src/constants/algeria-geo.ts
(shared with Trips, stable wilaya codes, locale-resolved labels). Media
fields are truthful URL strings — no upload mechanism exists (documented
boundary, pending). Legal data is self-declared and shown without
verification claims. Full en/ar i18n (agency namespace) with key parity.
Gaps: real auth not wired (M1); API client not created; placeholder
pages replaced by feature route modules as features land.

## [DECISIONS]
Feature-first architecture. Thin pages. TanStack Query owns server
state. Zustand for meaningful cross-page client state only. RHF+Zod
for forms. shadcn/ui as primitive layer. Storefront CONFIG is a future
Dashboard feature (rendering migrated out — see STOREFRONT section). Theme selection is first-class Dashboard feature.
Dashboard Overview deferred. Session cookies not JWT (global D5).
QueryClientProvider added as wrapper component (M0). Active agency
context in Zustand (not URL params). Feature route modules spread
into DashboardLayout. Storefront and Themes as sibling features.
Dashboard UI theming ≠ Storefront theme selection (explicit separation).
Shared theme renderer: public + preview SHARE ONE renderer — the code path
lives in the standalone `frontend/storefront` app (migration honored global
D13; the dashboard copies were removed). Preview chrome (PreviewBanner)
renders OUTSIDE the theme; preview detection uses the `x-storefront-mode`
header / `storefront_mode` cookie / `preview.*` host and forces noindex.
Theme selection/apply + branding config remain a future dashboard feature.
Dashboard uses a productivity-first visual language inspired by mature global SaaS admin systems: compact 4px-based spacing rhythm, restrained neutral surfaces, 13-14px operational typography, compact controls, subtle borders, limited elevation, consistent Lucide iconography, full-width resource indexes, and feature-focused editors.
Trip classification stays explicit: no auto-selected themes/activities/audience/
guidance; duration editing adapts to the chosen format instead of showing
every unit; hidden duration values are never erased on format switch.
The trip editor Overview follows a calm guided IA: primary editing column
next to a secondary sticky rail; the overview section renders its own
cards on the gray canvas while the other editors keep the shared outer
card. Destinations use a structured geography model on the frontend with
one centralized 58-wilaya reference set (stable codes, locale labels);
City/Commune stays a controlled text field because no commune dataset is
available (do not fabricate one). No fake backend endpoints: reference
data is frontend-local and its structured gaps are documented, not
invented.
Dashboard UI follows a productivity-first operational design language
inspired by mature SaaS admin systems: restrained neutral surfaces,
clear action hierarchy, consistent information density, resource-index
patterns, and feature-local secondary navigation. Auth keeps a lower
density and more focused presentation than the operational Dashboard.
Dashboard shell uses one direction-aware component tree: desktop
navigation is placed at the logical inline-start (left in LTR, right
in RTL). Physical left/right layout hacks must not be used to maintain
separate Arabic positioning.
Localization strategy is centralized i18next (no per-component
hardcoded strings, no duplicate copy); Arabic is a first-class RTL
locale with ar-DZ number formatting; locale preference is
client-persisted for now (backend-managed locale belongs to the user
profile later).
Trip v4 decisions (M1): Create Trip is a drawer, not a page route (the
editor is always reached with an existing trip id). Editor state uses
the sanctioned Zustand exception for the editor session; RHF validates,
Zustand owns the draft. The query cache is never the dirty baseline.
No autosave; explicit dirty bar only. Publish guard is truthful
(canPublish → block + explicit unpublish confirm); never auto-unpublish.
Scheduled availability requires departures; on_request / custom_quote do
not. Background refetch never silently overrides an unsaved draft. The
editor and overview offer skeleton hides nothing that the task schedules
for redesign; relocated blocks (description/highlights/activity
requirements to Details, min travelers to Booking settings) stay fully
functional rather than being invented/stubbed in the new Overview. The
dev in-memory trip repository mirrors the existing PLACEHOLDER_TRIPS
precedent as a clearly-marked swap boundary, NOT a production endpoint.
Agency Profile M1 decisions: one shared Agency persistence boundary for
both onboarding and settings (no parallel source of truth); service
languages modeled as an open string[] (ar/fr/en only as initial UI
chips); domain types carry semantic values only (labels via i18n keys);
contact primaries are PER TYPE (at most one public primary phone, email,
WhatsApp each) and internal contacts never satisfy public readiness;
locations are array-based with at most one primary (saves replace the
whole array, never a single location); opening hours are per-location
weekly rows frozen to opensAt/closesAt and compact weekend-first
(Sat–Fri); media stays truthful URL strings (no fake uploader);
readiness is Agency-only with the exact required/recommended lists (no
storefront theme/terms/privacy/published-trips checks); no Storefront
routes were added in M1 (replacing the /agency placeholder only); shared
geography (wilaya reference) promoted to src/constants and reused by both
features; geographic structure stays honest (only wilaya references
exist — commune is optional free text, documented).

## [ORPHANS & PENDING]
DQ1: Sidebar items and order — RESOLVED (M0, updated post-migration):
Overview, Trips, Bookings, Customers, Agency Profile, Team, Settings
(Storefront item removed with the storefront app migration). DQ2: Active-
agency UX (switcher needed?) — NON-BLOCKING (default: display only).
DQ3: StorefrontData contract shape for preview — DEFERRED to M5/M6.
NQ1: Booking details page or just list+create? — NON-BLOCKING.
NQ2: Team invitation flow complexity — NON-BLOCKING. NQ3: Settings
categories for Phase 1 — NON-BLOCKING. NQ4: Trip editor save
behavior — NON-BLOCKING. Real auth integration timing — DEFERRED
to backend M6. Media upload integration — DEFERRED to backend M7.
Storefront preview mechanism — DONE (migrated to the standalone
frontend/storefront app: header/cookie/host detection + noindex). Theme
configuration shape — DEFERRED to M5.
Multi-pickup logistics engine — DEFERRED (meeting point/instructions
retained for now). Custom-quote request workflow (quote creation/
approval) — DEFERRED to bookings integration. Omra/Hajj dedicated
religious-travel product type — DEFERRED (expressible today as a themed
circuit/stay). Cruise-specific extensions (cabins, ports of call) —
DEFERRED (generic cruise format only). Backend persistence contract for
the expanded trip model — DEFERRED to backend. Capacity for
on-request/custom-quote trips — DOCUMENTED gap: no capacity without
departures; acceptable for now.
Locale preference — currently client-persisted (localStorage);
backend-managed per-user locale belongs to the user profile. Error
messages from an API — contract must return stable codes (not UI
strings) so they can be localized reactively. Future feature domains
(bookings, customers, team, settings) must be added to the locale packages
as they land.
Structured reference data — DOCUMENTED dependency: commune (Baladiyah)
names per wilaya are not included in the frontend reference set; the
editor therefore exposes City/Commune as controlled free text and
clears it when the wilaya changes. A future official/authoritative
commune dataset (from the backend or a vetted source) slots into
algeria-geo.ts without form-model changes. International destinations
likewise stay free-text until structured country/city reference data
exists. Neither dataset is fabricated (protocol: no invented geo data).
Trip v4 backend contract — the trips API does not exist yet; the editor
persists through a dev in-memory repository (features/trips/api,
marked TODO(api)) standing in for the future trips.api.ts. When the
real API lands it must implement: create trip (6-field payload →
draft), fetch trip by id, update whole trip (single mutation). Backend
must also enforce publish-readiness and never auto-publish a trip
whose editor shows it incomplete; the frontend guard is UX only.
Meeting-instructions fallback (departure-first, else trip default)
pends departure data modelled with per-option prices. Dev in-memory
data is ephemeral (page refresh drops created trips) — by design, no
fake persistence.
Agency device data — the dev Agency repo is ephemeral in-memory seed
("Atlas Travel") standing in for the future agencies API; onboarding and
settings both write the same record today.
Agency media upload — NOT implemented: logo/hero are plain URL strings; a
real storage-backed upload boundary is DEFERRED (backend object storage).
Commune (Baladiyah) reference data — DOCUMENTED gap (same as Trips): no
commune IDs exist in the frontend set, so Agency locations expose an
optional free-text commune field; never fabricated.
Agency legal authority — licence number and seasonal Omra/Hajj
authorizations are self-declared inputs with no verification or
government-linkage; the Dashboard must never present them as verified.
Natural-language service types (omra/hajj) vs seasonal authorizations are
distinct: services are catalog entries; actual Omra/Hajj capacity is a
future bookings concern.
Arabic system font coverage — the `html[lang="ar"]` fallback stack
uses installed "Noto Sans Arabic" or OS alternatives; a bundled Arabic
font (e.g. a self-hosted Noto Sans Arabic woff2, no npm dependency
required) should be added once the design system decisions are
finalized. The actual `ar-DZ` currency symbol (`د.ج`) should be
verified on real devices since the sandbox blocks Node.

## [DO_NOT_BUILD_YET]
Analytics dashboard. Advanced reports. Billing management UI. Online
payment UI. Complex RBAC editor. Notification center. Custom-domain
automation. Visual Storefront builder. Theme Marketplace. External
Theme SDK. AI trip generation. Chat. Reviews. Advanced integrations.
Mobile application. Data export. Bulk operations. Advanced search.
Redis/frontend caching. Service workers.
Trip v4 beyond M1 (REDESIGNS SCHEDULED FOR LATER — keep existing
working editors as-is): redesigned Itinerary editor; redesigned
Departures & Pricing editor; redesigned Details with rich/media writer
fields; redesigned Media gallery; redesigned Booking settings with
custom question builder; drag-and-drop destination reorder (dnd-kit);
Published Snapshots / Working Drafts; publish audit trail; custom-quote
request workflow; the rest of Trip v4 M2+ scope. The v4 Overview is
done in M1; later milestones redesign the other sections without
regressing M1 Overview behavior.