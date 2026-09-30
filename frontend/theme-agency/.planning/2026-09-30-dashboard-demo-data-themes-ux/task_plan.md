# Task Plan — Agency Dashboard: demo data, View Website, Themes UX, UI/UX audit

Supersedes nothing: the website production-flow plan (`2026-09-29-…-dashboard-website-integration`) is **complete** (T1–T8 done). This plan takes the finished, verified pipeline and makes the product *usable and presentable* on a real tenant.

## Goal

**T2 is a full reset**: agency `AGY-0C937B377B89` ("hichem traveling") starts from **zero business data**, then T3–T6 progressively rebuild a realistic, internally consistent dataset written through the real API, ending with a published website the storefront actually serves. That dataset then becomes the fixture while fixing the two visible product gaps (no `View Website`, Themes page shows raw i18n keys and a 404 preview image) and lifting the dashboard UI to a clean professional SaaS bar.

## Decisions locked with the user (2026-09-30)

| # | Decision | Consequence |
|---|---|---|
| 1 | **Images: remote real photos** (Unsplash CDN URLs) stored in the DB | Works from both origins (dashboard `:5175`, storefront `:4321`); no git binaries, no installs. Demo data needs network for images. |
| 2 | **Full reset of agency 91's business data, then rebuild coherently** | Destructive **only** on agency `91`'s business rows. Today that is 3 DRAFT tours (two named `test`, one `اكتشاف غرداية 3 ايام` with `days=2, hours=3`), 1 customer `Smoke Tester`, 2 bookings, 1 departure, 1 pricing option — but T2 removes **every** business/demo row of that agency, not a hand-picked list, so the rebuild starts from a provable zero. Approved explicitly. |
| 3 | **`View Website` = live URL when published, preview otherwise** | One pure, custom-domain-ready URL resolver; no dead links. |
| 4 | **Seed through the real authenticated API** as `hichem@mail.com` (Agency Owner) | Real Zod validation, real RBAC, real audit rows. Needs the password from the user (env var only, never written into a repo file). |
| 5 | **UI/UX: foundations + all 7 prioritized pages** | Tokens/primitives/app shell first, then Overview, Tours, Departures, Bookings, Customers, Website, Themes. |
| 6 | **`audit_log` is preserved, never reset** | It is the append-only audit trail of what previous phases really did; deleting it would falsify history. Business data is reset, the record of that reset is not. |

## Hard constraints (repo policy)

- **No dependency installs**, no `package.json`/lockfile edits, no commits/branches/PRs, no architecture changes without approval.
- No new backend endpoints, no Prisma schema/migration change, no RBAC change (**data + UI only**). Analysis in "DB / schema / security analysis" below.
- Real flow only: real API, real Postgres. No mocks, no file stores, no fake auth, no hardcoded `authenticated = true`.
- Reuse existing components/hooks/i18n; do not rewrite working business logic for visual reasons; keep the `page → hooks → components → lib` separation and thin pages.
- `ar` is a product language: every UI change ships en **and** ar with correct RTL.
- Preserve the durable website invariants: public data only via `/v1/public/*`, content ⇄ theme-settings separation, drafts only behind a signed token.
- `theme:check` boundary stays intact (themes import only SDK/islands/own dir).

## DB / schema / security analysis (before any write)

**No schema change. No migration. No new column. No new endpoint. No RBAC change.** This plan is data-only plus UI.

| Concern | Analysis |
|---|---|
| Schema | Not touched. The business tables are `customer`, `tour`, `tour_destination`, `tour_itinerary_day`, `departure`, `pricing_option`, `departure_price`, `booking`, `booking_price_line`, `booking_status_history`, `booking_traveler`, plus the website pair `agency_website` (published) / `agency_website_draft`. They already model everything the demo data needs. |
| Write path | All **creations** go through the authenticated `/v1` endpoints as `hichem@mail.com` (Agency Owner) with a normal session cookie — exactly what the UI does. Zod validation, RBAC checks and `audit_log` rows therefore apply for free. |
| Delete path | **The API has no `DELETE` verb for any business aggregate** (verified against every controller): tours expose `archive`/`unpublish`, customers `archive`, bookings `cancel`, departures `cancel`, pricing options `deactivate`, website none. Lifecycle transitions are one-way by design, so "start from zero" is impossible through the API and the reset is done by **direct SQL scoped to `agency_id = 91` only** — which is exactly the case the user authorized. It never touches `agency`, `app_user`, `agency_membership`, `agency_role_assignment`, `role`, `permission`, `agency_member_invitation*`, `agency_application`, `platform_role_assignment` or `audit_log`, and never another tenant. The deferred `agency_ownership_invariants` trigger is not involved (no membership row is written or deleted). Each delete is preceded by a `select` that prints exactly which rows it will remove, and the script is idempotent. |
| Delete order & FK safety | Children are removed through **cascades only**, never as a direct child delete, because the frozen-manifest trigger `booking_traveler_booking_pending_delete` **refuses a direct `DELETE` on travelers of a non-PENDING booking** (`check_violation`) and passes only when `pg_trigger_depth() > 0`. Order: `booking` (cascades `booking_price_line`, `booking_status_history`, `booking_traveler`) → `tour` (cascades `tour_destination`, `tour_itinerary_day`, `departure` → `departure_price`, `pricing_option`) → `customer` → `agency_website` → `agency_website_draft`. Deleting both website rows in one transaction is safe: the deferred `website_slug_global_unique` triggers only raise when **more than one** tenant holds the slug, and after the commit none do. |
| Known side effect | After T2 the agency has **no published website**, so the anonymous public boundary answers `404 WEBSITE_NOT_PUBLISHED` and the dev storefront shows the not-published state until T6 publishes. That is expected, and T6 restores it. Also note `GET /website/draft` auto-ensures the draft row on first read, so simply opening the Website page after T2 re-creates an empty draft — that is the intended starting point for T6. |
| Security | No secret is written to the repo: the seed takes the password from an env var, uses it only to `POST /v1/auth/login`, and never logs it. Session cookie stays in the script's memory. Public reads stay anonymous and unchanged. No new endpoint means no new attack surface; the `View Website` URL is built client-side from already-public data (`slug`). |
| Tenant isolation | Every create sends `agencyCode` in the path only; no `agency_id` is ever accepted from a body (server-enforced invariant, unchanged). The seed asserts every response's echoed `agencyCode` matches. Every SQL statement is filtered by `agency_id = 91` resolved from the agency code first, never hardcoded blind. |
| Booking math | `booking.total_amount` is server-computed from the price lines; the seed never writes totals, and asserts `Σ unit_amount × quantity == total_amount` afterwards. `reserved_seats ≤ departure.capacity` is asserted. |
| Data volume | Target end state after T6: exactly **5** tours, **~8** departures, **~10** pricing options, **~10** departure prices, **5** customers, **4** bookings, **~12** travelers, 1 website draft + 1 published row. Small, readable, no generated filler, and every count is asserted **from zero** so no pre-existing row can hide in a total. |

## Phases and tasks

Every task lists its dependencies and a verifiable Done Definition. Tasks execute strictly in order; each one ends with its gates green and a `progress.md` entry.

### Phase 0 — Preflight (no behavior change)

- [x] **T1 — Baseline: gates + UI audit baseline + component inventory** — *complete (2026-09-30): all gates green (dashboard `npm test` 41 files/37 tests, theme-agency 144/144 + 33/33, backend 549/549); 14 en/ar screenshots + a measured DOM audit in `findings.md`; 20 shared primitives inventoried; ui-ux-pro-max guidance adopted (its Aurora/glass style matches rejected as verified mismatches). New defects found: primary-button contrast 2.28:1, `pricing.basis.per_person` raw key on Departures, broken theme preview image, no `h1` on any page, unnamed mobile Burger, non-scrollable tables.*
  - Depends on: nothing.
  - Do:
    - Run and record the gates for all three apps (`frontend/agency-dashboard-mantine`, `frontend/theme-agency`, `backend`) so any later regression is attributable.
    - Capture **before** screenshots of the 7 prioritized pages in `en` and `ar` (Mantine dev server on `:5175` against the live backend) into `/tmp/opencode/audit-baseline/` (throwaway, not committed).
    - Inventory the reusable pieces that already exist (shell/nav, `PageHeader`, `StatusBadge`, `FormActions`, `DrawerFormShell`, `ErrorState`/empty states, table patterns, `EntityCode`, theme tokens in `src/theme/`) into `findings.md` so the audit extends rather than duplicates.
    - Load the `ui-ux-pro-max` skill and record which of its guidelines apply (spacing scale, type scale, card/table/empty-state patterns, RTL) in `findings.md`.
  - **DoD:** gate table written in `progress.md`; ≥14 baseline screenshots exist; `findings.md` has the component inventory + the ui-ux-pro-max decisions. No source change.

### Phase 1 — Full reset, then progressive rebuild through the real API

- [x] **T2 — FULL RESET of agency `AGY-0C937B377B89`'s business data (to zero)** — *complete (2026-09-30): executed through the Neon serverless driver (`@neondatabase/serverless`, already a backend dep) with a throwaway script; agency resolved by code → id 91; dry-run preview reviewed first; one transaction, cascade-only children, 88ms; all 13 business tables now `0`; agency/profile/membership/roles/permissions/`audit_log` and all other tenants byte-identical; second run deleted 0 rows; login + agency endpoints still 200 (verified in T3).*
  - Depends on: T1.
  - Scope: **every business/demo row owned by agency 91** — not a hand-picked list. Zero rows of `customer`, `tour` (+ `tour_destination`, `tour_itinerary_day`), `departure` (+ `departure_price`), `pricing_option`, `booking` (+ `booking_price_line`, `booking_status_history`, `booking_traveler`), `agency_website`, `agency_website_draft`.
  - **Preserved, never touched:** the `agency` row itself (id 91, `AGY-0C937B377B89`), its profile/logo, `app_user` (incl. `hichem@mail.com`), `agency_membership`, `agency_role_assignment`, `role`, `permission`, `role_permission`, `agency_member_invitation*`, `agency_application`, `platform_role_assignment`, `audit_log`, and **every other tenant** (incl. the throwaway `AGY-T8LIVE`).
  - Do:
    1. Resolve `agency_id` from the code `AGY-0C937B377B89` (never hardcode `91` blind) and print it with the agency name, so the script fails loudly if the mapping is unexpected.
    2. **Print before destroying**: for each table, a `select` listing the exact rows (code + identifying fields) that will be removed, plus a `count` per table. Review that output before running the delete.
    3. Snapshot the preserved tables' counts (agencies, app_user, role, permission, agency_membership, agency_role_assignment, audit_log) for the whole DB **and** for every other agency, to prove isolation afterwards.
    4. Run the deletes in one transaction, **children only via cascade**, in this order (see the delete-order row in the analysis above — a direct `DELETE` on travelers of a non-PENDING booking is refused by `booking_traveler_booking_pending_delete`):
       ```sql
       BEGIN;
       DELETE FROM booking            WHERE agency_id = :agency;  -- cascades lines/history/travelers
       DELETE FROM tour               WHERE agency_id = :agency;  -- cascades destinations/itinerary/departures→prices/options
       DELETE FROM customer           WHERE agency_id = :agency;
       DELETE FROM agency_website       WHERE agency_id = :agency;
       DELETE FROM agency_website_draft WHERE agency_id = :agency;
       COMMIT;
       ```
    5. Reconcile: per-table counts for agency 91 are all `0`; the preserved snapshots are byte-identical; `audit_log` for `AGY-0C937B377B89` is unchanged (it keeps the history of the reset's predecessor phases).
    6. Prove idempotency: run the whole script a second time and show it deletes `0` rows and still reconciles.
  - **DoD:** all business tables `= 0` for agency 91; agency 91 still exists and is still reachable/authenticable as `hichem@mail.com` (login + `GET /v1/agencies/AGY-0C937B377B89/...` still 200); every other agency's row counts identical before/after; `app_user`/`role`/`permission`/`agency_membership` counts unchanged; `audit_log` count unchanged; second run deletes 0 rows; the printed preview is in `progress.md`. Recorded side effect: the public boundary now answers `404 WEBSITE_NOT_PUBLISHED` until T6.

- [x] **T3 — Seed 5 realistic tours through the API (from zero)** — *complete (2026-09-30): 5 tours created through `/v1` as the owner (2 `on_request` published, 3 `scheduled` correctly refused by `SCHEDULED_DEPARTURES_REQUIRED` and published in T4); 11 destinations, 16 itinerary days, 24 distinct HEAD-verified landmark images; every aggregate field re-read per tour and asserted; `GET /tours` = exactly 5.*
  - Depends on: T2.
  - Do: throwaway seed script that logs in and `POST`s 5 tours with coherent, non-repeating content — e.g. Ghardaïa M'zab UNESCO circuit (domestic, 3 days), Sahara erg Chegaga overnight (domestic, 2 days/1 night), Algiers Casbah & Tipaza day trip (domestic, 1 day), Istanbul Bosphorus circuit (international, 5 days), Constantine–Tlemcen heritage route (domestic, 4 days). Each: `format` consistent with its duration (no more `days`+`hours` contradictions), `minTravelers`, `shortDescription` (≤160), full `description`, 3–5 `highlights`, `included`/`notIncluded`, `meetingPoint` + `meetingInstructions`, `cancellationPolicy`, `importantInformation`, `languages`, `themes`/`activities`/`audiences`/`transportModes`/`accommodationTypes` consistent with the format, ≥1 `destination`, 2–3 `itinerary` days, `coverImageUrl` + 3–4 `gallery` images (Unsplash, matching the destination, **no image URL reused across tours**), and `status: PUBLISHED` via the real publish endpoint.
  - **DoD:** `GET /v1/agencies/AGY-0C937B377B89/tours` returns **exactly 5** tours (total, not "5 among leftovers"); each has a distinct name, non-empty description/shortDescription, ≥1 destination, ≥2 itinerary days, a cover image and a gallery; every `cover_image_url` is an absolute `https://` URL and all 5 covers are mutually distinct; `audit_log` shows the create actions. **Corrected during execution (real API behaviour, not a preference):** `computeTourPublishBlockers` refuses to publish a `SCHEDULED` tour while it has no `OPEN` departure (`SCHEDULED_DEPARTURES_REQUIRED`), so publishing and departures cannot both live in T3. The 5 tours therefore mix availability modes — `scheduled` (Ghardaïa, Chegaga, Constantine–Tlemcen: they get real departures in T4) and `on_request` (Algiers day trip, Istanbul: publishable immediately) — T3 publishes the 2 `on_request` tours and **records the 3 `SCHEDULED` blockers as the readiness gate working**, and T4 publishes the remaining 3 as soon as their departures exist. The "all 5 `PUBLISHED`" assertion moves to T4's DoD.

- [x] **T4 — Departures + pricing through the API (on the 5 clean tours)** — *complete (2026-09-30): 8 OPEN departures (Oct 2026 → Mar 2027, capacity 8–14, deadline always before start), 9 pricing options, 19 departure prices, 19 distinct amounts; the 3 `scheduled` tours published → all 5 `PUBLISHED`; `startingPrice` non-null for the 3 scheduled and `null` by design for the 2 `on_request`.*
  - Depends on: T3.
  - Do: for each tour 1–2 `OPEN` departures with realistic future dates (spanning at least two months so the departures list is not uniform), capacity 6–14, a `bookingDeadline` before `startAt`, and internal notes; plus pricing options per tour (e.g. `Adult` `per_person`, `Child` `per_person`, sometimes `Private departure` `per_booking`) with prices per departure, all in `DZD`, realistic Algerian travel pricing, and no identical amount reused across every departure. Option names are unique per tour (the `(tour_id, name)` CITEXT unique).
  - **DoD:** DB totals for agency 91 are now exactly 5 tours / ~8 departures / ~10 pricing options / ~10 departure prices and nothing else; every tour has ≥1 `OPEN` departure with ≥1 price; **all 5 tours are `PUBLISHED` (the 3 `scheduled` ones are published here, right after their first `OPEN` departure exists — see the T3 correction)**; `booking_deadline < start_at`; `end_at > start_at`; each amount > 0; a direct compose check yields a non-null `startingPrice` for all 5 tours.

- [x] **T5 — Customers + bookings + travelers through the API (on the clean departure set)**
  - Depends on: T4.
  - Do: 5 realistic customers (Algerian + international mix, plausible unique emails/phones, one `ARCHIVED` to show that state), then 4 bookings across different departures and customers: 2 `CONFIRMED` (with `confirmedAt`, travelers and price lines), 1 `PENDING`, 1 `CANCELLED` (with `cancellationReason` + `cancelledAt`). Travelers get real names/passport-style metadata the DTO allows (first/last name, email, phone, notes — the model has no passport field, so none is invented); price lines are snapshotted from the departure's own prices so the totals stay consistent; every booking's `reservedSeats` equals its traveler count while PENDING.
  - **DoD:** agency 91 now holds exactly 5 customers, 4 bookings and ~12 travelers; no booking exceeds its departure capacity; `total_amount == Σ unit_amount × quantity` for all 4; every booking has ≥1 traveler except the `PENDING` one (the documented shape, and the only one that legally can still take travelers); no customer email repeats; the customers/bookings pages show the mixed statuses with no placeholder names.

- [x] **T6 — Website content + publish (from a fresh auto-created draft)**
  - Depends on: T3, T4, T5.
  - Do: T2 removed the draft, so the first `GET /website/draft` auto-creates an empty one — fill it through the website API: `branding` (name "Hichem Traveling", tagline, logo URL), `content.hero` (title/subtitle/image + CTAs), 3 `trustPoints`, a `promotion` block, 2 `testimonials`, `finalCta`, `featuredTourCodes` (3–4 of the 5 published tours, distinct, all resolvable), `navigation` (Home / Trips / About anchors), `footer` (description, 2 columns, legal links) — then `POST /publish`. `featuredTourCodes` must reference the **new** tour codes produced by T3, not any code from before the reset.
  - **DoD:** exactly 1 `agency_website_draft` and 1 `agency_website` row exist for agency 91; `GET /v1/public/website/agy-0c937b377b89` (anonymous) returns `hero.title` = the seeded title, ≥3 trust points, the 3–4 featured tours **and** all 5 in `tours`, non-null `startingPrice`; the storefront renders the published home page (hero text present, `theme-starter`, `robots: index`); the 5 trips render on `/trips` and each detail page 200s; the draft still differs from nothing (publish copied it) and a second publish is idempotent.

### Phase 2 — `View Website`

- [x] **T7 — Public URL resolution + action**
  - Depends on: T1 (dev) and T6 (live verification).
  - Do:
    - Add optional `storefrontBaseUrl` / reuse `platformDomain` in `src/config/env.ts` (`VITE_STOREFRONT_BASE_URL`, validated like the existing keys, with `.env`/`.env.example` entries — env config only, no dependency change).
    - New pure `features/website/lib/website-url.ts` + unit tests: `websitePublicUrl({ slug, platformDomain, customDomain? })` → `https://<slug>.<platformDomain>/`, or `https://<customDomain>/` when a custom domain exists (the future Domain feature's shape; nothing invents a mapping today).
    - `View Website` action on the Website page (and the Overview page header): opens the live URL when the site is published; otherwise offers the existing signed draft preview instead of a dead link; in dev, when the storefront's single tenant (`LOCALHOST_TENANT_SLUG`) is not this agency, the tooltip/hint says so rather than pretending.
  - **DoD:** unit tests cover platform-domain form, custom-domain precedence, slug-less and malformed input; browser check — the button on `/AGY-0C937B377B89/website` opens the storefront home page for that tenant; unpublished state falls back to preview; `npm test` green.

### Phase 3 — Themes UX

- [x] **T8 — Fix the raw i18n keys** — DONE (resolver + catalog + 13 unit tests + `npm test` green + en/ar browser PASS)
  - Depends on: T1.
  - Do: translate `nameKey` / `descriptionKey` through the `themes` namespace with a safe fallback to the raw key when a theme ships an unknown key; add the catalog strings to **both** `en` and `ar`; use the translated name for the preview image `alt` too.
  - **DoD:** no raw `themes.*` key is visible on the page (screenshot in en + ar); a new unit test covers known-key translation, unknown-key fallback and RTL-safe interpolation; `npm test` green.

- [x] **T9 — Real theme preview images** — DONE (4 real captures in theme-agency/public, manifest repointed, dashboard resolves preview against the themes base, all gates green)
  - Depends on: T1 (storefront available), T8.
  - Do: capture real screenshots of the `starter` theme with the already-installed Playwright (home, trips, trip detail — desktop 1440 and a narrow viewport) into `frontend/theme-agency/public/demo/themes/`, and point `themes/starter/manifest.ts` `previewImage` at the real file(s) that exist. Keep it theme-owned data; no new dependency, no generated art.
  - **DoD:** every `previewImage` in `/themes.json` resolves `200`; the Themes page shows a real screenshot (not a broken image); `npm run theme:check` + `theme:test` + `npm test` green.

- [x] **T10 — Themes page redesign (Shopify-like management UX)** — DONE (draft/live split, extracted card, notices, en/ar; Activate path unit-tested only — see progress.md)
  - Depends on: T7, T8, T9.
  - Do: page stays thin (composition only) — extract the card into a component and any pure logic into `lib`. Card grid with real preview image (hover/selected affordance), translated name, description, version, and explicit **current** vs **published** state (the theme currently selected on the draft vs what the live site actually serves — these differ until a publish). Per-card actions: **Preview** (signed draft preview, opens the theme's own lab route), **Customize** (existing drawer), **Activate** (with a confirm dialog, because it changes the site) and a page-level **Publish** that explains the draft→live consequence. Real loading/empty/error states, `en` + `ar` with correct RTL, keyboard reachable.
  - **DoD:** screenshots en + ar (ltr + rtl) show the intended hierarchy; Activate on a non-current theme updates `draft.themeId` and the card state flips to current with the published badge still showing the old theme until Publish; Preview opens a `noindex` draft URL; `npm test` (typecheck/format/lint/vitest/build) green; no raw i18n keys; no business-logic change outside `features/themes`.

### Phase 4 — UI/UX audit (ui-ux-pro-max)

- [x] **T11 — Foundations: tokens, primitives, app shell**
  - Depends on: T10 (so the shared primitives serve the already-redesigned Themes/Website pages).
  - Do: apply the ui-ux-pro-max guidance recorded in T1 to the shared layer only — spacing/typography scale, surface/border/radius tokens, and upgrades to the reused primitives (`PageHeader`, `StatusBadge`, `FormActions`, `DrawerFormShell`, `ErrorState`/empty states, table + card patterns, app shell/nav). Reuse-first: change a primitive once instead of per page. No feature business logic touched.
  - **DoD:** `npm test` green; the primitive list from T1 is either upgraded or explicitly justified as already-sufficient (recorded in `progress.md`); after-screenshots of the shell on a 1440 and a 1024 viewport in en + ar.

- [ ] **T12 — Per-page polish: Overview, Tours, Departures, Bookings, Customers**
  - Depends on: T11.
  - Do: per page, in priority order — information hierarchy, section spacing, primary/secondary action placement and labeling, table density and alignment, card layout, filter/sort affordances that already exist, and real empty states (each empty state explains the next action instead of showing a bare message). Website and Themes are already covered by T7/T10 and only get consistency fixes. No business-logic rewrite: only layout, copy, hierarchy and component composition change.
  - **DoD:** before/after screenshot pair per page in en + ar; `npm test` green; the diff touches no `services/`, no `api/` payload shape and no validation logic (verified by reviewing the diff); no duplicated component introduced (`find src -name "*.tsx" | xargs grep -l` sanity check + a short note in `progress.md`).

### Phase 5 — Closeout

- [ ] **T13 — Docs, final gates, cleanup**
  - Depends on: T12.
  - Do: sync `PROJECT_MAP.md` (mantine dashboard website/themes reality, the URL-resolution contract, demo-data conventions), `frontend/theme-agency/PROJECT_MAP_THEME_AGENCY.md` (new theme preview assets), `docs/website-api-contract.md` (env additions: `VITE_STOREFRONT_BASE_URL`), and `AGENTS.md` only if a durable rule emerged. Re-run every gate for all affected apps. Delete the throwaway tenant `AGY-T8LIVE` and stop the dev services. Mark the plan complete.
  - **DoD:** all gates green (or a documented pre-existing failure unrelated to this work, e.g. the 3 stale `payments.e2e-spec.ts` cases); docs contain no false claims; `AGY-T8LIVE` removed and confirmed gone; `task_plan.md` fully checked with `progress.md` matching reality.

## Dependency graph

```text
T1 ─┬─▶ T2 (reset to zero) ─▶ T3 (tours) ─▶ T4 (departures+pricing) ─▶ T5 (customers/bookings) ─▶ T6 (website+publish) ─┐
     │                                                                                                              ├─▶ T7 ─┐
     ├─▶ T8 ─▶ T9 ────────────────────────────────────────────────────────────────────────────────────────────────────┼───────┼─▶ T10 ─▶ T11 ─▶ T12 ─▶ T13
     │                                                                                                              │       │
     └──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘       └─ (T7 also needs T6 for live proof)
```

## Verification strategy (run for every affected app)

- `frontend/agency-dashboard-mantine`: `npm test` (composite: typecheck → `format:test` → oxlint+stylelint → vitest → build). Live opt-in spec: `VITE_API_BASE_URL=… VITE_THEMES_BASE_URL=… WEBSITE_TEST_THEMES_BASE_URL=… WEBSITE_TEST_EMAIL=… WEBSITE_TEST_PASSWORD=… WEBSITE_TEST_AGENCY_CODE=… npm run vitest -- src/features/website/__tests__/backend.integration.test.ts`.
- `frontend/theme-agency`: `npm test`, `npm run lint`, `npm run check`, `npm run build`, `npm run theme:check`, `npm run theme:test`, plus `node tools/website-integration-test.mjs` for the full-stack loop (needs `WEBSITE_TEST_*`; it publishes a throwaway agency).
- `backend`: only read/verify — `npm run lint`, `npm run build`, `npm test`; `npm run test:e2e` (3 pre-existing `payments.e2e-spec.ts` failures are unrelated and must not be "fixed" here).
- Browser proof: Playwright (already installed in `frontend/theme-agency`) driving `:5175` for the dashboard and `:4321` for the storefront.

## Out of scope (explicitly)

- No custom-domain/DNS feature (the URL resolver only accepts a custom domain when one is supplied; nothing stores or maps domains).
- No image upload service, no media library, no file storage; images stay URLs.
- No multi-locale website content (one `locale` per site, as today).
- No new themes, no theme engine changes beyond the manifest's `previewImage` and new preview assets.
- No dependency installs, no `package.json` edits, no commits.
- No `audit_log` deletion (append-only trail — preserved through the reset, decision #6).
- No schema/migration/RBAC/architecture change, and no new endpoint — T2's SQL is a one-off data operation, not a new capability.
