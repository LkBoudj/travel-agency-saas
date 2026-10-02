# Findings — dashboard demo data, Themes UX, UI/UX audit

## Verified state of the target tenant (recon via `neon` SQL, 2026-09-30)

`AGY-0C937B377B89` = **"hichem traveling"**, `agency.id = 91`, `status = ACTIVE`, `country = null`, `description = null`. One membership: `hichem@mail.com` (`app_user.status = ACTIVE`) with role **Agency Owner**.

Rows found (all placeholder-grade):

| Entity | Rows | Detail |
|---|---|---|
| Tours | 3 | `TUR-2929DE49CDAB` `اكتشاف غرداية 3 ايام` (DRAFT, `days=2 nights=0 hours=3` — contradictory), `TUR-ABFF62DD00D6` `test` (DRAFT, `stay`, `days=10 nights=10`), `TUR-F9CEF9D7E64C` `test` (DRAFT, `experience`, no duration). All: `short_description = null`, `cover_image_url = null`, `highlights = []`, `gallery = []`, `languages = []`, `themes = []`, `activities = []`, 0 itinerary days, 1 destination each. |
| Departures | 1 | `DEP-0CF24E464D0A` on `TUR-F9CEF9D7E64C`, OPEN, 2026-10-15 → 2026-10-20, capacity 6, no booking deadline. |
| Pricing | 1 option / 1 price | `PRC-64A294754119` "Base fare", `per_person`, DZD, 50 000.00 on the single departure. |
| Customers | 1 | `CUS-F941C9F036F2` "Smoke Tester" `smoke@example.com` — smoke-test residue. |
| Bookings | 2 | `BKG-61F3CFE56950` CANCELLED (2 seats, 100 000) and `BKG-4F1F8DA8F8A7` PENDING (6 seats = full capacity, 300 000), both on the same customer + departure. |
| Website | none | No `agency_website_draft` row yet for agency 91 (`ensureDraft` creates it on first draft read). |

Across the **whole database**: no tour anywhere has a `cover_image_url` or a non-empty `gallery` — there is no existing image-URL convention to copy.

Schema facts that shape the seed (from `backend/prisma/schema.prisma`):
- `Tour`: `format` ∈ experience | day_excursion | stay | circuit | cruise; `geographicScope`; `availabilityMode`; `days`/`nights`/`hours`; `minTravelers`; `origin` JSON; `languages`/`themes`/`activities`/`audiences`/`transportModes`/`accommodationTypes` are `String[]`; `highlights`/`included`/`notIncluded`/`gallery` are JSON arrays; `coverImageUrl` VarChar(2048). CHECK constraints restrict the enum vocabularies.
- `Departure`: `status` OPEN|CLOSED|CANCELLED, `capacity`, `bookingDeadline`, tenant inherited through `tour_id` (no `agency_id`).
- `PricingOption`: `@@unique([tourId, name])`, `basis` per_person|per_booking, DZD default. `DeparturePrice` is the composite PK `(departureId, pricingOptionId)` — one amount per (departure, option), managed as a set per departure.
- `Booking`: `totalAmount` is **server-computed** from `BookingPriceLine` snapshots (`unitAmount × quantity`); `reservedSeats`; `status` PENDING|CONFIRMED|CANCELLED.
- `AgencyWebsiteDraft` (editable) and `AgencyWebsite` (published) share the aggregate shape; the draft row has no `published_at`; a global deferred trigger `website_slug_global_unique` guards slug uniqueness across both tables; a deferred trigger `agency_ownership_invariants` guards membership (relevant only if memberships are inserted/deleted — the seed never does).

## Verified frontend state (2026-09-30)

- **Routes**: `src/Router.tsx` — `/:agencyCode/website` (line 105) and `/:agencyCode/themes` (line 113). Dev port 5175 (`.env` `VITE_DEV_PORT`, `strictPort`).
- **Env** (`src/config/env.ts`, `parseEnv` is pure and unit-tested): `apiBaseUrl` (required, must be an origin with no path), `themesBaseUrl` (origin **or** root-relative path — the committed `.env` uses `/themes`, a Vite dev-proxy path, proxied to `http://localhost:4321` in `vite.config.ts`), `devPort`, optional `platformDomain` (`.env` = `example.com`). `getEnv()` caches `import.meta.env` on first call.
- **Raw i18n keys confirmed**: `src/features/themes/pages/themes.page.tsx:86` renders `theme.nameKey` and `:95` renders `theme.descriptionKey` (also `alt={theme.nameKey}` at :78) → the screen shows `themes.starter.name` / `themes.starter.description`.
- **Broken theme preview**: `frontend/theme-agency/themes/starter/manifest.ts:8` → `previewImage: "/demo/themes/starter-preview.jpg"`, but `frontend/theme-agency/public/` only contains `demo/hero.jpg` and `demo/tours/{istanbul-discovery,dubai-adventure,santorini-escape}.jpg` → the URL 404s.
- **Themes page today**: one `Card` per theme in a `SimpleGrid`, `isActive` badge only, one contextual action (Customize when active, otherwise Activate), a page-level Preview + Publish, a `DrawerFormShell` for Customize. It does **not** distinguish "selected on the draft" from "actually live on the published site" — the two differ until a publish, which is exactly the state a user cannot currently see.
- **No `View Website` action** anywhere in the dashboard; no storefront-origin concept in `config/env.ts` yet.
- **Storefront tenant resolution** (`src/middleware.ts` + `src/platform/tenant-resolver.ts`): production = `<slug>.<platformDomain>`; custom domains via a `customDomains` map (`source: "custom"`); dev = exactly one tenant from `LOCALHOST_TENANT_SLUG` (default `demo`), fail-closed 404 on an invalid value. So a live URL for a *different* agency legitimately 404s in dev — the reason for the "live when published, preview otherwise" decision.
- **Storefront public boundary path**: `GET /v1/public/website/:slug` (singular). Composed payload = `StorefrontData` envelope (`config`, `hero`, `tours`, `trustPoints`, `promotion`, `testimonials`, `finalCta`) — **not** `{ content: {...} }`.
- **RTL already exists**: `src/theme/provider.tsx` mounts `<Notifications position={isRtl ? 'bottom-left' : 'bottom-right'} />`; `getLocaleDirection` maps `ar → rtl`; both `en` and `ar` locale trees exist per namespace. The audit must *verify coverage*, not build RTL from scratch.
- **Playwright is already installed** in `frontend/theme-agency` (used by the visual suite and the T8 integration config) → theme preview screenshots and dashboard browser checks need **no new dependency**.
- **Reusable dashboard primitives** (candidates for the foundations pass): `PageHeader`, `StatusBadge`, `EntityCode`, `FormActions` (`src/components/form/`), `DrawerFormShell`, `ErrorState` (`src/components/empty-state.tsx`), `ConfirmDialog`/`useConfirmDialog`, plus the app shell/nav in `Router.tsx` and the theme provider.

## Defect found and fixed during the previous phase (context for the audit)

A brand-new draft failed the editor's own schema (`websiteFormSchema`: `hero.title`, `branding.name` were `min(1)`) while the backend's `ensureDraft` stores an empty aggregate by contract → **Save changes was a silent no-op** for any untouched agency (the error was on an unmounted tab). Fixed: both fields now only cap length (the public composer falls back to the agency name — `backend/src/website/website-compose.ts` `composeHero`), plus `features/website/lib/website-validation.ts` reveals the offending tab on a rejected submit. Lesson for the audit: **never let a validation failure be invisible** — the same class of bug hides in drawers and other tabbed surfaces.

## Baseline gates (T1, 2026-09-30, all green — logs in `/tmp/opencode/t1/`)

| App | Command | Result |
|---|---|---|
| `frontend/agency-dashboard-mantine` | `npm test` (typecheck → format:test → oxlint+stylelint → vitest → build) | **EXIT 0** — typecheck ✓, format ✓, lint ✓, vitest **41 files passed / 1 skipped**, **37 tests passed / 6 skipped** (the 6 are the opt-in live specs), build ✓ 991ms |
| `frontend/theme-agency` | `npm test` | **144/144** tests, 7 suites |
| `frontend/theme-agency` | `npm run lint` | ✓ clean |
| `frontend/theme-agency` | `npm run check` | **0 errors / 0 hints**, 72 files |
| `frontend/theme-agency` | `npm run build` | ✓ |
| `frontend/theme-agency` | `npm run theme:check` | ✓ |
| `frontend/theme-agency` | `npm run theme:test` | **33/33** |
| `backend` | `npm run lint` | 0 errors (6 pre-existing `no-unused-vars` warnings) |
| `backend` | `npm run build` | ✓ |
| `backend` | `npm test` | **29 files / 549 tests passed** |

Note: the dashboard vitest count moved from 31 → **37** tests since the empty-draft fix added `website.schema.test.ts` + `website-validation.test.ts`; the previously outstanding "full `npm test` after the schema/i18n edits" is now **verified green**.

## Reusable component inventory (T1) — extend, don't duplicate

`src/components/` (shared, all already used by the 7 prioritized pages):

| Primitive | Export | Reuse for |
|---|---|---|
| `data-table.tsx` | `DataTable<T>`, `DataTableColumn<T>`, `DataTableProps<T>` | every list page (tours/departures/bookings/customers) — one place to fix density, alignment, empty & loading rows |
| `empty-state.tsx` | `EmptyState`, `ErrorState` | real empty + error states on all 7 pages |
| `page-header.tsx` | `PageHeader` | title/description/actions row; `View Website` (T7) attaches here |
| `status-badge.tsx` | `StatusBadge({ status })` | tour/departure/booking/customer/publish status — one color mapping for the whole app |
| `search-input.tsx` | `SearchInput` (+ `useDebouncedSearch`) | list filtering |
| `money-text.tsx` | `MoneyText` | prices/totals formatting (single locale/currency path) |
| `entity-code.tsx` | `EntityCode` | `TUR-/DEP-/BKG-/CUS-` codes, mono |
| `confirm-dialog.tsx` | `useConfirmDialog`, `openConfirmDialog` | destructive/confirming actions (publish, activate, cancel) |
| `permission-gate.tsx` | `PermissionGate`, `useCan` | permission-aware actions |
| `form/drawer-form-shell.tsx` | `DrawerFormShell` | Customize drawer (T10) + edit drawers |
| `form/modal-form-shell.tsx` | `ModalFormShell` | small forms |
| `form/form-actions.tsx` | `FormActions` | Save/Discard alignment everywhere |
| `form/form-section.tsx` | `FormSection` | consistent grouping inside forms |
| `form/field-error.tsx` | `FieldError` | inline errors (must pair with an error summary — see guidance) |
| `form/use-zod-form.ts` | `useZodForm` | the only form-state path (keep it; don't add a second) |
| `entity-picker/**` | `EntityCombobox`, `QuickCreate`, `useEntityPicker`, pure `entity-option`/`quick-create-flow` | customer/tour pickers |
| `full-page-loader.tsx`, `agency-failure-screen.tsx` | — | loading / agency-load failure |

Shell & routing: `app/layouts/dashboard-layout.tsx`, `dashboard-header.tsx`, `dashboard-sidebar.tsx`, `app/layouts/hooks/use-nav-items.ts`, `app/router/route-paths.ts`, guards in `app/router/guards/`. `src/pages/StyleGuide.page.tsx` (191 lines) is the existing visual reference page — reuse it as the token showcase instead of inventing a second one.

Tokens: `src/theme/{colors,spacing,radius,typography,shadows,component-defaults,theme}.ts` + `provider.tsx`; global CSS custom properties in `src/index.css` (`--app-heading-h1…h6` via `clamp()`, `--app-glass-bg/-blur/-border`). Single stylesheet (`src/index.css` is the only CSS file). Typography: **Fira Sans** body + **Fira Code** mono.

Feature pages: `features/{overview,trips,departures,bookings,customers,website,themes}/pages/*.page.tsx` (+ `trips-editor`, `booking-details`, `members`, `agency-chooser`).

## `ui-ux-pro-max` guidance adopted (T1)

Skill: `/home/hichem-pc/projects/travel-saas/.opencode/skills/ui-ux-pro-max` (Python 3.14 present; scripts work). Queries run: `--design-system` ×2 (travel-SaaS and internal-admin variants), `--domain ux` for data-table density, empty states, RTL, and form validation.

**Adopted:**
- **Density 8/10 (dashboard)**: keep a tight 8–32px rhythm; change it once in `theme/spacing.ts` / `--app-*` tokens, not per page. The app's `spacing` (4/8/12/16/24px) is already close — extend the scale rather than inventing per-page values.
- **Modular type scale, no arbitrary sizes**: `fontSizes` (12/13/14/16/20px) is already a clean scale; headings use `clamp()` — keep, don't add page-local sizes. Body line-height 1.5–1.75 (current `lineHeights` comply).
- **Empty states must show a message *and* the next action** (`EmptyState` already accepts an action — use it everywhere; a bare message is the anti-pattern).
- **Focusable error summary (High severity)**: after a failed submit, an error container at the top of the form must be focusable (`role="alert"`, `tabIndex={-1}`), receive focus, link each item to its field, and inline errors must stay. The website editor currently shows a Mantine notification + tab reveal — acceptable baseline, but T12 should add the focusable summary without changing the validation logic.
- **Error messages must be announced** (`role="alert"` / `aria-live`) — never a red border alone. Applies to the new Themes states and every form.
- **Active nav item must be visually indicated** (sidebar) — verify in the audit screenshots.
- **Tables must not break narrow layouts**: horizontal scroll or a card layout below the smallest supported width.
- **Motion/icons pre-delivery list**: vector icons only (no emoji as structural icons), hover/focus transitions 150–300ms, visible keyboard focus, `prefers-reduced-motion` respected, contrast ≥4.5:1 for text and ≥3:1 for meaningful non-text/icon boundaries.
- **Status colors** (green/amber/red) must be consistent per status everywhere — reinforces fixing `StatusBadge` once in T11 rather than per page.

**Explicitly rejected (verified mismatch, not persisted):** the skill's top style matches for this query were *Aurora UI* (mesh gradients) and *Glassmorphism dark* — landing/marketing patterns that do not fit a dense, light, professional admin dashboard. Per the skill's own verification rule I discarded them and kept only the structural guidance above. The app's existing green brand palette (`theme/colors.ts` `brand`) stays; the skill's first query independently matched the **already-installed Fira Sans + Fira Code** pairing for dashboards, which is a keep-confirmation, not a change.

**No verified RTL guidance exists in the skill's dataset** (the RTL query returned generic animation/stacking results). RTL work will follow general, clearly-labeled practice instead: CSS logical properties over `left/right`, `margin-inline`/`padding-inline`, no hardcoded directional icons in RTL, and a full en/ar + ltr/rtl screenshot pass per page.

## UI audit baseline (T1) — measured from the live DOM, 2026-09-30

14 screenshots: `/tmp/opencode/audit-baseline/{en,ar}-{overview,trips,departures,bookings,customers,website,themes}.png` (1440×900, full page). Machine-readable audit: `/tmp/opencode/audit-baseline/audit.json`; scripts `capture.mjs` / `audit.mjs` (throwaway, not in the repo). Method: Playwright logs in as the agency owner, then probes computed styles, headings, actions, table metrics, empty states, image health, failed requests, contrast and overflow per page in both locales. *(I cannot view images myself, so the audit is DOM/computed-style evidence plus the screenshots for human review.)*

**Confirmed healthy (leave alone):**
- `dir`/`lang` are correct on all 14 page loads (`ltr`/`en`, `rtl`/`ar`) — the locale switch + `applyDocumentLocale` work.
- **No horizontal overflow** at 1440 (`overflowX = 0` on every page, both locales).
- Table density is already reasonable: row heights 44–63px, cell font 13px, semantic `<table>` markup, sticky-header-free but scannable column sets.
- Empty states **do** carry the next action (website testimonials: "No testimonials yet. Add the first one below." + an *Add testimonial* button) — the guidance is already followed there.
- Public images: no tour/customer image exists yet anywhere in the DB, so the empty image set is a data gap (fixed by T3), not a UI bug.
- `Theme`/`Website` pages have zero contrast failures other than the shared primary button (below).

**Defects found (new evidence, to fold into the later tasks):**

| # | Finding | Evidence | Lands in |
|---|---|---|---|
| A1 | **Primary buttons fail WCAG AA**: white text on brand green, ratio **2.28:1** at 13px (needs 4.5). Affects *New trip / New departure / New option / New booking / Add customer / Save changes / Publish* on every page, both locales. | `audit.json` → `lowContrast` on all 7 pages | **T11** (fix once in the Mantine button/`brand` tokens, not per page) |
| A2 | **Raw i18n key on Departures**: `pricing.basis.per_person` is rendered as literal text in the pricing table (en **and** ar). Previously unknown — the plan only listed the Themes keys. | `en|departures.rawI18nKeys`, `ar|departures.rawI18nKeys` | **T8** (extend its scope from Themes to the pricing basis label) |
| A3 | **Raw i18n keys on Themes**: `themes.starter.name` + `themes.starter.description` shown as text. | `en|ar themes.rawI18nKeys` | **T8** (already planned) |
| A4 | **Broken theme preview image**: 1 image, `naturalWidth === 0`, URL `http://localhost:5175/demo/themes/starter-preview.jpg` (proxied `/demo/themes/…` 404). | `en|ar themes.images.broken` | **T9** (already planned) |
| A5 | **No `h1` on any page** — every page starts at `H2` (the `PageHeader` primitive renders `h2`), so there is no document-level page heading. | `h1 = NONE` on 14/14 loads | **T11** (`PageHeader` renders the page `h1`; section titles stay `h2/h3`) |
| A6 | **Mobile nav Burger has no accessible name** — `mantine-Burger-root` with no `aria-label`/`title` (only control on the page without a name; it is `mantine-hidden-from-sm`, so it only affects small screens). | one unnamed control on 14/14 loads | **T11** (shell fix) |
| A7 | **Tables are not horizontally scrollable** — every table wrapper is `overflow-x: visible; scrollable: false`. Harmless at 1440, but the 3 departures tables and the 7-column trips table risk breaking below ~1024. | `tableScrollers` on all pages | **T11/T12** (wrap in a scroll container, per the skill's table guidance) |
| A8 | Overview mixes stat tiles and a bookings table with **no page-level action**, and its headings are only `H2: Overview` — no section headings for the tile groups. | `en|ar overview.headings` | **T12** (hierarchy pass) |
| A9 | The TanStack **query devtools** launcher is present in the running app shell. | action list on 6/7 pages | verify it is dev-only; no change if gated by `import.meta.env.DEV` |

**Content-quality notes feeding T3–T5:** current data is thin (3 draft tours, 1 customer, 2 bookings, 1 departure, 1 pricing option, no images) which is exactly why every list page looks sparse — the T2 reset + T3–T6 rebuild is a prerequisite for judging the real UI, so page polish (T12) is deliberately sequenced after the data work.

## Open items needing the user

- **`hichem@mail.com` password** — provided and used via env var only (never written to a repo file, never echoed by the scripts). Needed for T3–T6 as well.

## Data-work findings (T5–T6)

| # | Finding | Impact | Where |
|---|---|---|---|
| D1 | **Composed “Price from” is the cheapest price line of any OPEN departure — including a child rate.** Ghardaïa shows `DZD 6 000` (child), Chegaga `11 000`, Constantine `19 000`; the adult rates are 24 000 / 18 500 / 32 000. `composeTourPrice` in `backend/src/website/website-compose.ts` takes the min across all `DeparturePrice` rows and drops the pricing basis. | A public storefront under-sells the adult rate by ~4×; “Price from” is misleading. Backend compose is out of scope for this plan (no backend changes) — needs a decision: filter to the `per_person` adult line, or carry the basis. | homepage tour cards, every trips page |
| D2 | The active customer listing hides `ARCHIVED` rows (by design) — a “5 customers” audit must count DB rows, not the list endpoint. | Verifier false-failure risk; not a product bug. | `GET /agencies/:code/customers` |
| D3 | The Astro dev build serves **fixtures** unless `WEBSITE_API_URL` is set, and resolves the tenant from the **hostname** (`LOCALHOST_TENANT_SLUG` on localhost), not a path prefix. Routes are `/`, `/trips`, `/trips/[slug]`. | A dev storefront pointed at `http://localhost:4321/<slug>` 404s and looks broken; a fixtures-backed dev server silently shows the `demo` tenant. | `src/middleware.ts`, `src/platform/resolve-data-source.ts` |
| D4 | Website content is stored in an **agency-authored key shape** that differs from the theme contract (`trustPoints[].text` → `description`, `testimonials[].location` → `role`, `promotion.text` → `description`); hero CTAs are dropped by the composer. | Seeding or editing content with theme-shaped keys silently renders empty sections. | `backend/src/website/website-compose.ts` |
