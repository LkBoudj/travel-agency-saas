# Progress — dashboard demo data, Themes UX, UI/UX audit

## 2026-09-30 — Plan created, awaiting approval (no implementation yet)

**State:** plan + findings written, **T1 not started**. Nothing in `frontend/agency-dashboard-mantine`, `frontend/theme-agency` or the database was changed by this plan.

**Previous plan closed first:** `2026-09-29-2026-09-29-dashboard-website-integration` → T8 marked **complete**, with its `progress.md` corrected (the earlier "the dashboard has no website feature yet / `frontend/dashboard` has no `npm test`" claims were wrong — the UI lives in `frontend/agency-dashboard-mantine`, which has a green composite `npm test`; the Mantine website/theme clients are now proven live, `6/6`, plus a real-browser smoke).

**What this plan does (T1–T13):**
1. T1 preflight: baseline gates + before-screenshots (en/ar) + reusable-component inventory + `ui-ux-pro-max` guidance.
2. T2–T6 realistic data for `AGY-0C937B377B89` through the **real API** (5 published tours, departures, pricing, 5 customers, 4 bookings, website content, published) + SQL cleanup of the placeholder rows (approved).
3. T7 `View Website` with a pure, custom-domain-ready URL resolver (live URL when published, preview otherwise).
4. T8–T10 Themes: fix raw `themes.starter.name` keys, capture **real** theme preview screenshots (Playwright already installed), redesign the page with current-vs-published state and Preview/Customize/Activate/Publish.
5. T11–T12 `ui-ux-pro-max`-driven foundations + per-page polish for Overview, Tours, Departures, Bookings, Customers (Website/Themes covered in T7/T10), en + ar with RTL.
6. T13 docs sync, all gates, cleanup of the throwaway `AGY-T8LIVE` tenant, plan closeout.

**No DB/schema/security change is proposed** — data + UI only; see the "DB / schema / security analysis" table in `task_plan.md`.

**Blocking input:** the `hichem@mail.com` password (env var for the seed run only) to execute T3–T6 through the authenticated API.

**Live services currently running (from the previous phase):** backend `:3000` (Neon), theme-agency `astro dev :4321`, mantine dev server `:5175`.

## 2026-09-30 — T1 COMPLETE (baseline + audit baseline + inventory)

Plan approved by the user; T1 executed read-only (no source change, no DB write).

**Gates — all green (logs `/tmp/opencode/t1/`):** dashboard `npm test` EXIT 0 (typecheck/format/lint/build ✓, vitest **41 files / 37 tests**, 1 file + 6 tests skipped = the opt-in live specs) — this closes the previously outstanding "full dashboard test after the empty-draft fix"; theme-agency `npm test` **144/144**, lint ✓, `check` **0 errors/0 hints**, build ✓, `theme:check` ✓, `theme:test` **33/33**; backend lint 0 errors (6 pre-existing warnings), build ✓, `npm test` **29 files / 549 tests**.

**Services:** backend `:3000` and Mantine `:5175` were already up; the Astro storefront `:4321` had died, so it was restarted (needed for the Themes page's `/themes.json` proxy) — `:4321` and `/themes.json` both answer 200 again.

**Audit baseline captured** with the owner login: 14 screenshots (`/tmp/opencode/audit-baseline/{en,ar}-*.png`, 1440×900, full page) plus a computed-style audit (`audit.json`). I cannot view images in this session, so the audit is DOM/computed-style evidence; the screenshots are the human-review artifact.

**New defects recorded in `findings.md` (A1–A9):** primary buttons at **2.28:1** contrast (WCAG AA fail, 7 buttons × 2 locales) → T11; `pricing.basis.per_person` raw key on Departures → T8 scope widened; broken `demo/themes/starter-preview.jpg` → T9; no `h1` on any page (`PageHeader` renders `h2`) → T11; mobile Burger without an accessible name → T11; tables not horizontally scrollable → T11/T12; Overview has no action/section headings → T12; devtools launcher presence to verify as dev-only.

**Confirmed healthy:** `dir`/`lang` correct on 14/14 loads, zero horizontal overflow at 1440, row heights 44–63px, empty states already carry their next action.

**ui-ux-pro-max:** queried (`--design-system` ×2, `--domain ux` ×4); adopted density-8 rhythm in tokens, modular type scale, error-summary/announced-errors a11y rules, active-nav indication, table-overflow rule, 150–300ms transitions, ≥4.5:1 contrast. Rejected the Aurora-gradient and dark-glass style matches as verified mismatches for a light dense admin app. The dataset has no real RTL guidance → general logical-property practice with en/ar verification instead.

## 2026-09-30 — T3 + T4 COMPLETE (5 tours, 8 departures, 9 options, 19 prices, all 5 tours published)

**T3.** All 5 tours created through `/v1` as the owner: Ghardaïa M'zab (3d/2n, scheduled), Erg Chegaga (2d/1n, scheduled), Algiers Casbah & Tipaza (1d/10h, on_request), Istanbul (5d/4n, on_request), Constantine–Tlemcen (4d/3n, scheduled). Result: **2 `on_request` published, 3 `scheduled` refused with `409 TOUR_PUBLISH_READINESS_BLOCKED` / `blockers: ["SCHEDULED_DEPARTURES_REQUIRED"]`** — the readiness gate working exactly as the plan predicted, not a failure. DB after T3: `tours 5, destinations 11, itinerary_days 16, customers 0, bookings 0, departures 0`, with `5 × AGENCY_TOUR_CREATED` + `2 × AGENCY_TOUR_PUBLISHED` audit rows for the new codes. `audit_log` holds 8 `AGENCY_TOUR_CREATED` in total: the 3 extra are the pre-T2 browser-smoke history, which is correct — the log is append-only and T2 deliberately preserved it.

**Two read-contract corrections found by running, not by reading:**
- `GET /tours` returns a **summary** shape (no description/itinerary/gallery), so the DoD content assertions must run against `GET /tours/:code`. My first verification pass flagged all 5 tours as "missing content" purely because it used the wrong endpoint; the data was fine.
- `PUT /tours/:code/departures/:code/prices` accepts **only** `{prices:[…]}` — `currency` is rejected by `.strict()` (`400 Unrecognized key: "currency"`) because the currency is fixed when the pricing option is created. The departure `PUT` is a full set replacement, as the module doc states.

**T4.** 8 `OPEN` departures on the 3 scheduled tours, spanning 2026-10-10 → 2027-03-06 (so the Departures page is not uniform), capacity 8–14, `bookingDeadline` always 10–14 days before `startAt`, `endAt` matching each tour's real span, and an internal note per departure. 9 pricing options (Adult/Child `per_person` + one `per_booking` per tour) and 19 departure prices, every amount distinct (19 unique values). The `per_booking` option is priced only on each tour's first departure, where it makes business sense. `GET /pricing-options` also returns the derived `startingPrice` and `pricedOpenDepartureCount`, which became the cheapest compose check. The 3 scheduled tours were then published → **all 5 tours `PUBLISHED`** (5 `AGENCY_TOUR_PUBLISHED` rows total in the audit log). T4 verify: `departures 8 (all OPEN), pricing_options 9, departure_prices 19, 3 tours with OPEN departures`, and **PASS** on the API + DB assertions.

**A concurrent human session was detected, and it matters for T6.** At 10:39–10:40 UTC — while T3/T4 were running — actor `USR-005DCC6ADF0E` (the owner) opened the Website page, which auto-created the draft, switched the draft theme to `starter`, **published an empty site**, and minted two preview tokens (`AGENCY_WEBSITE_DRAFT_THEME_UPDATED` → `AGENCY_WEBSITE_PUBLISHED` → `AGENCY_WEBSITE_PREVIEW_MINTED` ×2). So `agency_website` / `agency_website_draft` exist again with **empty content** (`{}` in every column), and the published row has `theme_id: null` while the draft has `starter` — the theme was changed *after* publishing, and content ⇄ theme-settings are separate endpoints by design, so the two are not kept in step automatically. T4's "nothing else was created" assertion was corrected to scope only what the seed created (customers/bookings = 0) and to *record* the website pair instead of failing on it. **T6 must therefore set the theme before publishing, not after.**

**T3/T4 DoD deltas recorded in the plan:** T4's "a non-null `startingPrice` for all 5 tours" is corrected to "non-null for the 3 `scheduled` tours; the 2 `on_request` tours compose `price: null` by design, and the starter theme already renders 'Request a price' (existing tested path)". Data volume is 9 options / 19 prices instead of the estimated ~10/~10 — every open departure carries Adult + Child, so the real number is higher by design.

## 2026-09-30 — T3 started: contracts read, verified image catalog built, seed written; blocked on the owner credential

**API contracts read from source (not guessed):** `POST /agencies/:code/tours` (full aggregate, `.strict()`, always lands DRAFT, `internalRef` ≤80, `shortDescription` ≤160, `destinations[].wilayaCode` ≤8 for domestic / `place` for international, `itinerary[].{title,location,description}`, enums for `themes/activities/audiences/transportModes/accommodationTypes`, `PRICING_BASIS = per_person | per_booking`, `BOOKING_STATUSES`, `createBooking = {customerCode, departureCode, reservedSeats, pricingSelections[], notes}`, travelers `POST /bookings/:code/travelers {firstName,lastName,email,phone,notes}`, `confirm` is gated on `travelerCount == reservedSeats`, `cancel {reason}`, customers have no `status` field — ARCHIVED comes from `PATCH /customers/:code/archive`).

**Sequencing corrected in the plan (real backend behaviour):** `computeTourPublishBlockers` refuses to publish a `SCHEDULED` tour with zero `OPEN` departures (`SCHEDULED_DEPARTURES_REQUIRED`), so T3 and T4 cannot both own publishing. The 5 tours therefore mix availability modes — `scheduled`: Ghardaïa, Chegaga, Constantine–Tlemcen (they get real departures in T4, then get published there); `on_request`: Algiers Casbah & Tipaza, Istanbul (publishable now). T3 publishes the 2 `on_request` tours and records the 3 gate refusals as evidence the gate works; "all 5 `PUBLISHED`" moved into T4's DoD. T3's DoD text was amended accordingly.

**Images — decision recorded:** Unsplash cannot be used safely here: its search API now needs an auth token, and hand-recalled `images.unsplash.com/photo-…` IDs are unverifiable (1 of 3 spot-checked 404'd, and a 200 says nothing about the subject → risk of a beach photo on a Sahara tour, undetectable by me). Instead a catalog of **real Wikimedia Commons photographs of the actual landmarks** was built with the public, key-less Commons API and **every URL HEAD-verified (200 + `image/*`, width ≥1200)** on the canonical `upload.wikimedia.org` host: 54 valid candidates across Ghardaïa/El Atteuf, Erg Chegaga & Saoura, Casbah d'Alger, Tipaza, Hagia Sophia, Bosphorus/Galata/ferry, Constantine (Pont des Chutes, médersa) and Tlemcen. **24 distinct images** are selected (1 cover + 3–4 gallery per tour, no reuse), and the script asserts uniqueness + absolute https. Licences are per-file (CC BY / CC BY-SA / public domain / CC0) and recorded in the script header. *Deviation from the plan's "Unsplash" example: attribution obligations (CC BY-SA) come with these files — flagged for the user; the URLs are placeholders for agency uploads anyway (the platform has no media upload).*

**Seed written** (`/tmp/opencode/t3-seed/`): `api.mjs` (login once, keep the HttpOnly cookie — the backend never returns the JWT in the body), `pick-images.mjs` (catalog builder), `images.json`, `seed-tours.mjs` (5 tours with full realistic content: coherent format/duration/min-travelers/activity-requirements per tour, 3–5 highlights, 2–3 itinerary days, included/not-included, meeting point + instructions, cancellation policy with the real business rules, important information, and destination-matched images). Pre-flight guards in the script: 24 distinct https image URLs, `shortDescription` ≤160, description ≥200 chars, ≥2 itinerary days, ≥1 destination, ≥3 gallery items, 5 distinct names.

**Blocked:** the first API call failed with `401 Invalid credentials` — the password in my command was a guess, and the real `hichem@mail.com` password is no longer in my context (it was deliberately not carried into the summary). Everything up to the login is verified; the moment the correct password is supplied via `SEED_PASSWORD` the 5 creates + 2 publishes + list read-back run as one command. The rest of the environment is ready (backend `:3000` up, catalog built, script syntax-checked).

## 2026-09-30 — T2 COMPLETE (full reset of agency 91 business data to zero)

**Tooling note:** there is no `psql` and no generated Prisma client in this checkout (`node_modules/.prisma` is absent), so the reset used the **already-installed `@neondatabase/serverless`** (v1.1.0) driver from `backend/` with the direct `DATABASE_URL_UNPOOLED` endpoint, and `sql.transaction([...])` for the single transaction. Throwaway script: `/tmp/opencode/t2-reset/reset.mjs` (nothing added to the repo; the connection string is read from `backend/.env` and never printed — an early attempt failed only because the quoted `.env` value had to be unquoted, and the driver error text was caught and redacted).

**Dry run first, then apply.** The agency was resolved from its **code** (`AGY-0C937B377B89` → id 91, `hichem traveling`) with a hard failure if the id is not 91.

**Preview printed before destroying (all of it):**
- `tour` (3, all `DRAFT`): `TUR-2929DE49CDAB` "اكتشاف غرداية 3 ايام" (circuit), `TUR-ABFF62DD00D6` "test" (stay), `TUR-F9CEF9D7E64C` "test" (experience)
- `tour_destination` (3) · `tour_itinerary_day` (0) · `departure` (1, `DEP-0CF24E464D0A` OPEN on the experience) · `pricing_option` (1, `PRC-64A294754119` "Base fare") · `departure_price` (1, 50000.00)
- `customer` (1): `CUS-F941C9F036F2` Smoke Tester `smoke@example.com`
- `booking` (2): `BKG-4F1F8DA8F8A7` PENDING 6 seats / 300000.00, `BKG-61F3CFE56950` CANCELLED 2 seats / 100000.00 (+2 price lines, 4 status-history rows)
- `booking_traveler` (2): `TRV-21C06A81B702` Ahmed Ben, `TRV-B3913CD0D595` Sara Ali — **both on the CANCELLED booking**, which proves the plan's trigger constraint was real: a direct `DELETE` on those rows is refused by `booking_traveler_booking_pending_delete`; they can only go through the booking cascade.
- `agency_website` (1) + `agency_website_draft` (1): slug `agy-0c937b377b89`, theme `starter`, published 2026-09-30 07:27 — **not present at planning time**: this row was created by the previous phase's live browser smoke, and the full reset correctly removes it too.

**Result (one transaction, 88ms, cascade-only children):** `booking` 2, `tour` 3, `customer` 1, `agency_website` 1, `agency_website_draft` 1. Recon for agency 91: `tours 0, customers 0, bookings 0, websites 0, drafts 0, departures 0, pricing_options 0, departure_prices 0, destinations 0, itinerary_days 0, price_lines 0, status_history 0, travelers 0` — all **13 tables zero**.

**Isolation proven:** preserved global counts identical before/after (`agency 4, app_user 6, role 11, permission 76, role_permission 211, agency_membership 4, agency_role_assignment 4, agency_member_invitation 0, audit_log 107, audit_log_this_agency 16`); the agency row, its name and its single membership survive; per-agency row counts for `AGY-3937A2F9283D`, `AGY-BF9A72B7DC36` and `AGY-T8LIVE` are identical. **Idempotency: a second full run deleted 0 rows.**

**Recorded side effect:** the public boundary now answers `404 WEBSITE_NOT_PUBLISHED` for `agy-0c937b377b89` until T6 republishes.

**Password:** received from the user and used only through `SEED_PASSWORD` in single commands; never written to a repo file, never echoed by the scripts.

## 2026-09-30 — Plan revised before approval: T2 became a FULL RESET

**User change:** T2 is no longer "delete the known placeholder rows" — it resets **all** business/demo data of `AGY-0C937B377B89` to **zero** (preserving the agency, its owner/user, memberships, roles, permissions, auth, `audit_log` and every other tenant), and T3–T6 then rebuild the realistic dataset progressively on that clean base. Plan only was updated; nothing had been executed at that point.

**Verified facts that shaped the revision (all read-only checks):**
- The API exposes **no `DELETE` verb for any business aggregate** — tours only `archive`/`unpublish`, customers `archive`, bookings `cancel`, departures `cancel`, pricing options `deactivate`, website none. "Start from zero" is therefore impossible through the API, which is exactly the authorized case for direct SQL scoped to `agency_id = 91`.
- Business tables in scope: `customer`, `tour`, `tour_destination`, `tour_itinerary_day`, `departure`, `departure_price`, `pricing_option`, `booking`, `booking_price_line`, `booking_status_history`, `booking_traveler`, `agency_website`, `agency_website_draft`.
- **Delete order is forced by a trigger:** `booking_traveler_booking_pending_delete` refuses a *direct* `DELETE` of travelers whose booking is not PENDING (`check_violation`) and passes only when `pg_trigger_depth() > 0`. So children must be removed **through cascades**: `booking` → `tour` → `customer` → `agency_website` → `agency_website_draft`, in one transaction.
- The deferred `website_slug_global_unique` triggers only raise when **more than one** tenant holds the slug, so deleting both website rows in the same transaction is safe.
- Side effect accepted: after T2 the public boundary answers `404 WEBSITE_NOT_PUBLISHED` (storefront shows not-published) until T6 publishes; and `GET /website/draft` auto-ensures a fresh empty draft, which is the intended T6 starting point.
- `BookingTraveler` has no passport field, so the seed must not invent one.

**DoD tightened on the rebuild tasks:** T3 asserts **exactly 5** tours (total, not "5 among leftovers"), T4/T5/T6 assert cumulative exact counts from zero, featured codes must reference the post-reset tour codes, and all 5 cover images must be distinct.

## Inherited from the completed website production-flow plan (T1–T8, dir deleted)

The superseded plan directory was removed at user request; the durable facts and evidence are preserved here. The older `2026-09-24-theme-agency` archive was removed too — its durable theme-engine knowledge lives in `PROJECT_MAP_THEME_AGENCY.md`, `TASKS_THEME_AGENCY.md` and `docs/`, not in the plan. This plan is now the only plan in the repo.

**Architecture/contract (in force — do not redesign):**
- Two-row model: `AgencyWebsite` (published) + `AgencyWebsiteDraft` (editable). Row existence ⟺ published; no `status` column. `PUBLISH` = atomic draft→published copy + `publishedAt`.
- `slug` is the public tenant key, globally unique across both tables (deferred trigger), written once.
- Hard invariant: content/branding/navigation/footer live in distinct columns with distinct endpoints + permissions from `themeId`/`themeSettings`; one PATCH type per key-group, backend `.strict()` rejects smuggled keys.
- Public boundary: `GET /v1/public/website/:slug` (published, whitelist DTO) → `404 WEBSITE_NOT_PUBLISHED`; `/:slug/draft` gated by a backend-minted preview token → `403 WEBSITE_PREVIEW_TOKEN_INVALID`. The dashboard never holds `PREVIEW_TOKEN_SECRET`.
- Compose rules: tour cards = the agency's **PUBLISHED** tours; `featuredTourCodes` order the home list (unknown/dropped); `startingPriceFrom` = cheapest `DeparturePrice` of the tour's **OPEN** departures; `tours[].slug = Tour.code`; `durationDays` derived; internal fields (`internalRef`, `notes`, capacity internals, members) never composed; branding falls back to `Agency.name`.
- Permissions added to the code-owned RBAC catalog: `AGENCY_WEBSITE_VIEW`, `AGENCY_WEBSITE_CONTENT_EDIT`, `AGENCY_WEBSITE_THEME_UPDATE`, `AGENCY_WEBSITE_PUBLISH` (granted via `ALL_AGENCY_PERMISSION_KEYS`; `AGENCY_MANAGER` filtered subset reviewed).
- Audit actions: `AGENCY_WEBSITE_PUBLISHED`, `AGENCY_WEBSITE_DRAFT_UPDATED`, `AGENCY_WEBSITE_THEME_UPDATED`, `AGENCY_WEBSITE_PREVIEW_MINTED`.
- Media are **URL strings only — there is no upload service**; this is why the remote-Unsplash decision fits the contract with no schema change.
- Deferred: custom domains, Cloudflare deployment, runtime theme switching, offline/pause toggle, multi-locale, `Tour.slug`.

**Files that exist from that work:** `backend/src/website/**`, the Prisma migration, `backend/test/website.e2e.ts`, `frontend/theme-agency/src/platform/website-data-source.ts` + `resolve-data-source.ts` + `src/pages/themes.json.ts`, `frontend/theme-agency/tests/integration/website.spec.ts`, `frontend/agency-dashboard-mantine/src/features/website/**` + `src/features/themes/**`, `frontend/theme-agency/docs/website-api-contract.md`, `backend/docs/website-data-model.md`.

**Deviations that shaped the current code (relevant to later tasks here):**
- The theme manifest exposes `nameKey` / `descriptionKey` / `previewImage` — there is **no plain `name`**, and no `textarea` settings field type. T8/T9 in this plan fix the unmapped keys and the missing preview image.
- `themesBaseUrl` (`VITE_THEMES_BASE_URL`, default `http://localhost:4321`, root-relative or origin) is the only extra env var; the website API shares `apiBaseUrl`. Dev uses a Vite `/themes` proxy, so `.env` holds `/themes`.
- Repo test convention in the dashboard is pure-logic suites under vitest — no fetch mocks, no hook/page smoke tests. Keep that in T7–T12.

**Verification evidence at handover:**
- Backend: `npm run lint` 0 errors, `npm run build` clean, `npm test` 549/549, `npm run test:e2e` 26/29 (the 3 failures are pre-existing, unrelated `test/payments.e2e-spec.ts` stale-schema cases), website e2e 12/12.
- Theme Agency: `npm test` 144/144, `astro check` 0/0/0, eslint clean, build ✓, `theme:check` ✓, `theme:test` 33/33, full-stack Playwright integration 10/10 against real Neon + backend + storefront.
- Dashboard (`frontend/agency-dashboard-mantine`): `npm test` green (typecheck + format + lint + vitest 39 files/31 tests + build), opt-in live client spec 6/6, plus a real-browser smoke of login → edit → save → reload → publish → anonymous public read.
- That browser smoke exposed a real production defect, now fixed: a brand-new empty draft failed the editor's own Zod schema, so **Save was a silent no-op for any untouched agency** (`hero.title` / `branding.name` `min(1)`). Schema now allows empty values (the composer already falls back to the agency name) and a rejected submit reveals the offending tab with `notifications.invalidFields` (en + ar). Regression tests added. **A full dashboard `npm test` has not been re-run since these schema/view/i18n edits** — T1 does that.

## T5 — Customers + bookings + travelers (through `/v1`) — DONE

`/tmp/opencode/t3-seed/seed-bookings.mjs` (login as `hichem@mail.com`, runtime `SEED_PASSWORD` only), verified by `verify-t5.mjs` (API + direct Neon read). **PASS.**

- **Contract facts learned:** customer archive is `PATCH /v1/agencies/:code/customers/:customerCode/archive` (a `POST` returns 404); the **active** customer listing excludes `ARCHIVED` rows by design while the row stays readable by code. `BookingResponse` nests `customer.code` / `departure.code` / `tour.{code,name}` — there are no flat `customerCode`/`departureCode` fields. `GET /bookings/:code/travelers` is the manifest.
- **Seeded:** 5 customers — Yacine Haddad, Sofia Benali, Karim Merzouk, Lina Cherif, Ahmed Ziani (the last **archived**). No phone numbers were invented; nothing fake was written.
- **4 bookings** (totals = server-computed `Σ unit_amount × quantity`, all 5 price lines re-checked against the DB):
  - `BKG-44BC5C30AA18` Yacine · `DEP-47676C0D0FC3` (Ghardaïa) · 6 seats · Adult ×6 → **144 000** · 6 travelers · **CONFIRMED**.
  - `BKG-B6C8F5D00F35` Karim · `DEP-42C6C0DBA7B4` (Chegaga) · 4 seats · Adult ×4 + Private departure ×1 → **116 000** · 4 travelers · **CONFIRMED**.
  - `BKG-491421518EFF` Lina · `DEP-B8092129CBA3` (Constantine–Tlemcen) · 3 seats · Adult ×3 → **96 000** · 0 travelers · **PENDING** (open manifest).
  - `BKG-76B4EF54EDF1` Sofia · `DEP-B7845DD512C4` (Ghardaïa) · 2 seats · Adult ×2 → **49 000** · 2 travelers · **CANCELLED** with a real reason + `cancelledAt`.
- **Verified:** 5 customers (4 active + 1 archived), 4 bookings (2/1/1), 12 travelers, 7 status-history rows, 0 over-capacity, 0 inconsistent totals, all 5 tours still `PUBLISHED`, no duplicate email, no placeholder name/email left.

## T6 — Website content + publish — DONE

`/tmp/opencode/t3-seed/seed-website.mjs` (owns the DB invariant + public DTO + storefront checks). **PASS.**

- **Order matters (root cause of the earlier `theme_id: null` publish):** `PATCH /website/draft/theme` `{themeId:"starter"}` **first**, then content, then publish. The published row now carries `theme_id = starter`; a second `POST /website/publish` is idempotent (still 1 published row, 1 draft row).
- **Content separation held:** one `PATCH /website/draft/content` wrote `content` + `branding` + `navigation` + `footer`; a follow-up body smuggling `themeId` into that endpoint was rejected **400** (verified).
- **Stored shape ≠ theme shape (learned, worth keeping):** the agency-authored keys are `trustPoints[].text`, `promotion.text`, `testimonials[].location`, `finalCta.subtitle`; `website-compose.ts` maps them to the storefront's `description`/`role`/`primaryCta`. Hero CTAs are **not** part of the stored contract (`composeHero` drops them) — so no hero CTA keys were invented. Content icon strings must be real `Icon.astro` keys (`shield|star|lock|compass|headset|sun|flag|check|clock|arrow`); an unknown key renders nothing.
- **Seeded:** hero “Algeria, from the Sahara to the sea” + subtitle + Chegaga dune image; 4 trust points; a winter-Chegaga promotion whose CTA targets `/trips/TUR-B550CBF1D071`; 2 testimonials; final CTA; `featuredTourCodes` = Ghardaïa → Istanbul → Chegaga (3 of the 5 T3 codes); navigation Home/Trips/About; footer with 2 columns + legal links; branding name/tagline/about/logo/contact (email = the real owner address, no invented phone).
- **Anonymous public read:** `GET /v1/public/website/agy-0c937b377b89` → 200, hero title, 4 trust points, 2 testimonials, `config.themeId = starter`, 3 nav links, 2 footer columns, **5 tours** with the 3 featured first and flagged, promotion + final CTA CTAs, no internal fields. The 2 on-request tours return `price: null` (by design) and the storefront renders “Request a price”.
- **Storefront renders against real data** (dev server restarted with `LOCALHOST_TENANT_SLUG=agy-0c937b377b89 WEBSITE_API_URL=http://localhost:3000`; without them the dev build serves the `demo` fixtures, which is what made the first storefront run 404): `/` 200 with the hero `h1`, trust points, promotion, testimonials, final CTA, footer columns + legal, `robots: index, follow`; `/trips` 200 listing all 5; all 5 `/trips/<TUR-…>` detail pages 200.

## T7 — Public URL resolution + "View website" action — DONE

**Code (dashboard, `frontend/agency-dashboard-mantine`):**
- `src/config/env.ts`: added optional `storefrontBaseUrl` (`VITE_STOREFRONT_BASE_URL`, validated as an http(s) origin like `VITE_API_BASE_URL`) and `storefrontTenantSlug` (`VITE_STOREFRONT_TENANT_SLUG`). Both documented in `.env` + `.env.example`. Env config only — no dependency change.
- New pure `src/features/website/lib/website-url.ts`: `websitePublicUrl({slug, platformDomain, storefrontBaseUrl, customDomain})` with precedence **customDomain → storefrontBaseUrl (dev single-tenant) → `https://<slug>.<platformDomain>/`**, returning `null` for a missing/malformed slug or domain (never an invented address). `storefrontServesAnotherTenant()` drives the dev hint.
- New `hooks/use-view-website.ts` + `components/view-website-button.tsx`, wired into the **Website** page header (with the slug + status) and the **Overview** page header (new `actions`, gated by `AGENCY_WEBSITE_VIEW` via the new `canView.website`). Published → opens the live URL; unpublished → mints the **signed draft preview** (never a dead link).
- i18n: `viewWebsite`, `previewDraft`, `tooltips.{live,preview,devOtherTenant}`, `notifications.{previewFailed,noWebsiteUrl}` in **en + ar**; the button/tooltip use `dir="auto"` so the interpolated LTR tenant slug stays readable inside the Arabic sentence.
- Tests: `website-url.test.ts` (13 vitest cases: platform form, custom-domain precedence, dev origin, case/trailing-slash, slug-less, 8 malformed slugs, malformed domains, dev-tenant hint) + 3 new `env.test.ts` cases. `npm test` green (typecheck → format → lint → vitest **42 files / 50 tests** + 1 skipped file → build).
- **Pre-existing red test found and fixed** (no script ran it: `vite.config.ts` excludes `env.test.ts` from vitest): `parseEnv: normalizes a trailing slash in themesBaseUrl` asserted normalization while the shipped `parseThemesBaseUrl` **rejects** a trailing slash (same strictness as `VITE_API_BASE_URL`). Fixed the stale test, not the parser; root-relative `/themes//` normalization is now asserted instead. `node --test` on all three excluded files: 29/29.

**Dev environment (no repo code):** `PREVIEW_TOKEN_SECRET`/`STOREFRONT_BASE_URL` were missing from `backend/.env`, so the backend signed preview links with `''` while the storefront fails closed on an empty secret → **every Theme Lab preview 404'd**. Added both to `backend/.env` with the value documented in `docs/website-api-contract.md` (`theme-test-secret`) and restarted backend + Astro with the matching secret; preview now 200 with `noindex, nofollow` + `x-robots-tag` + `cache-control: no-store`.

**Browser check** (real UI, real backend, real storefront): published → popup `http://localhost:4321/` rendering this agency's hero `h1`; Overview action → same, no preview banner; unpublished (published read mocked to `WEBSITE_NOT_PUBLISHED`) → label switches to "Preview draft" and opens `/_lab/starter/home?t=<signed token>`, `robots: noindex, nofollow`. Re-ran with `VITE_STOREFRONT_TENANT_SLUG=agy-other-agency`: the tooltip appends "In development the local storefront serves “agy-other-agency”, so the tab will show that site." (en + ar verified, `dir=rtl`). Env restored afterwards.

## T8 — Raw i18n keys (Themes catalog, settings labels, pricing basis) — CODE DONE, BROWSER CHECK PENDING

**Root cause (one bug, three symptoms):** the data already carries fully-qualified keys
(`themes.starter.name`, `settings.starter.homepage.showFeaturedTours`, `pricing.basis.per_person`), but
each render site handed them to a **namespace-bound** `t()`. i18next then looked for
`pricing.json → "pricing" → "basis" → "per_person"`, missed, and rendered the key as page text.

**Fix (dashboard, `frontend/agency-dashboard-mantine`):**
- New pure `src/i18n/lib/qualified-keys.ts`: `splitQualifiedKey` (namespace + path, strict shape
  validation — rejects `Themes.x`, `the-mes.x`, `themes..x`, `https://…`, `themes.{{name}}`) and
  `translateQualifiedKey(key, translate)` which **falls back to the raw key** for an unloaded
  namespace, a missing string, a malformed key, an empty translation, a path echo, or a throwing
  translator. Interpolated values are passed through untouched (no mangling of RTL text).
- New `src/i18n/hooks/use-qualified-key.ts` binds the resolver to i18next via `i18n.t(path, {ns})`
  (never the namespace-bound `t`), skipping namespaces that are not loaded.
- `src/features/themes/pages/themes.page.tsx`: name, description **and the preview image `alt`** now
  resolve through it; `schema-settings-renderer.tsx` resolves every field/option `labelKey` (the
  "shows them verbatim until themes ship localized label maps" interim note is gone);
  `src/features/pricing/components/pricing-manager.tsx` resolves `pricingBasisLabelKey(option.basis)`
  (audit A2 — the Basis column showed `pricing.basis.per_person` on Departures).
- Catalog strings: `themes.json` gains `starter.{name,description}` (en/ar); **new** `settings.json`
  namespace (en/ar) with the starter schema's `group` + `starter.homepage.*` labels, registered in
  `src/i18n/index.ts` resources + the loaded-namespace list (theme-declared, like `themes`).
- Tests: `qualified-keys.test.ts` — 13 vitest cases (known key, unknown path, unloaded namespace,
  malformed keys, empty/echo/throw fallbacks, Arabic pass-through, placeholder pass-through).
  `npm test` green: typecheck → format → lint → **43 files / 63 tests** + 1 skipped file → build.
  (Two of my own new tests were wrong first — the "unloaded namespace" catalog actually had `settings`
  and the placeholder test hit a defined key; fixed the tests, not the resolver.)

**Browser check (EN + AR screenshots) is still pending** — it needs a dashboard login and the
`SEED_PASSWORD` used for the T5–T7 API seeding is no longer in this context (the saved
`cookies.txt` access token expired 2026-09-30 06:59). Script ready: `/tmp/opencode/t8-themes-check.mjs`
(output dir `/tmp/opencode/audit-t8`); it asserts no `themes.|settings.|pricing.|common.|website.`
raw key in the Themes page, the Customize drawer or the trip pricing table, checks the preview image
loads, and logs the localized samples for both locales.

**Browser check — PASS (real UI, real backend, en + ar).** `/tmp/opencode/pw/t8-themes-check.mjs` +
`t8-pricing-check.mjs` (playwright 1.63 from the npx cache, chromium 1243), screenshots in
`/tmp/opencode/audit-t8/` (`themes-en/ar`, `customize-en/ar`, `departures-pricing-en/ar`):
- Themes page EN: `Starter` + "The default theme: a single-column layout with a hero, featured
  tours, trust points and a promotion block." + preview `alt="Starter"`. AR: `الأساسية` +
  "القالب الافتراضي: تخطيط بعمود واحد مع قسم رئيسي ورحلات مميزة ونقاط ثقة وكتلة عروض." +
  `alt="الأساسية"`.
- Customize drawer EN: "Show the featured tours section" / "Show the featured destinations
  section" / "Show the "Why us" section". AR: "إظهار قسم الرحلات المميزة" / "إظهار قسم الوجهات
  المميزة" / "إظهار قسم «لماذا نحن»".
- Departures → pricing **Basis column (A2)**: EN `Per booking` / `Per person` (was
  `pricing.basis.per_booking` / `pricing.basis.per_person`), AR `لكل حجز` / `لكل شخص`, table headers
  Arabic, `html[lang=ar][dir=rtl]`.
- **Zero** `themes.|settings.|pricing.|common.|website.|trips.|departures.|bookings.` raw keys in any
  of the six captures; no pageerror, no 4xx/5xx.
- Confirmed out of T8 scope → **T9**: `manifest.previewImage` `/demo/themes/starter-preview.jpg`
  does not exist; the Vite dev server answers the unknown path with `index.html` (HTTP 200,
  `text/html`, 694 B), so the img is broken (`naturalWidth === 0`) while the fixed `alt` renders.

## T9 — Real theme preview images — DONE

**Root cause of the "broken" preview:** `manifest.previewImage` is a *root-relative* path
(`/demo/themes/starter-preview.jpg`) but the dashboard has **no `public/` directory at all** — so the
browser resolved it against the dashboard origin, got nothing, and the Vite dev server answered the
unknown path with `index.html` (HTTP 200, `text/html`, 694 B) → an `<img>` that decodes to nothing.
The old file did not exist anywhere; `theme-agency/public/demo/` only had `hero.jpg` + 3 tour photos.

**Fix (data on the theme app, one pure resolver on the dashboard):**
- Captured real `starter` screenshots with the already-installed Playwright (no new dependency, no
  generated art) into `frontend/theme-agency/public/demo/themes/` — the origin that serves
  `/themes.json`:
  `starter-home.jpg` (1440×900, 80 KB), `starter-trips.jpg` (180 KB),
  `starter-trip-detail.jpg` (151 KB), `starter-home-narrow.jpg` (390×844, 38 KB).
  Every `<img>` on each page was asserted decoded before capture; the captures show the **T6 real
  data** (hero “Algeria, from the Sahara to the sea”, “Ghardaïa M’zab: three days in the UNESCO
  ksour”).
- `themes/starter/manifest.ts`: `previewImage` → `/demo/themes/starter-home.jpg` (was a path that
  resolved to nothing). Still theme-owned data.
- New dashboard `src/features/themes/lib/theme-preview-url.ts`: `themePreviewUrl(previewImage,
  themesBaseUrl)` — absolute URLs pass through, relative + root-relative paths join onto the themes
  base URL, blank input or no base URL → `null` (render nothing rather than a broken image). It never
  guesses the dashboard origin. Wired into `themes.page.tsx` (which now hides the `<Image>` when the
  resolver returns `null`).
- 6 unit tests in `theme-preview-url.test.ts`; dashboard `npm test` green: **44 files / 69 tests** +
  1 skipped file (typecheck → format → lint → vitest → build).

**Verified:**
- `GET /themes.json` → `previewImage: "/demo/themes/starter-home.jpg"`; all 4 captures **200
  `image/jpeg`** from the theme app.
- Browser (real login, en + ar): the Themes page `<img>` now decodes **1440×900** (was
  `naturalWidth === 0`), `alt` = `Starter` / `الأساسية`, resolved as
  `http://localhost:5175/themes/demo/themes/starter-home.jpg` — i.e. against the configured
  `VITE_THEMES_BASE_URL=/themes`, which the dev Vite proxy forwards to the theme app on :4321. The
  registry fetch (`/themes/themes.json`) and the preview now use **the same base**, so production
  (`https://themes.example.com`) needs no extra work.
- `theme-agency`: `npm run theme:check` ok (20 files), `npm run theme:test` 33 passed, `npm test`
  144 passed / 0 failed.
- Note: the Astro dev server had to be restarted mid-task (it exited earlier); it now runs with
  `WEBSITE_API_URL=http://localhost:3000 LOCALHOST_TENANT_SLUG=agy-0c937b377b89
  PREVIEW_TOKEN_SECRET=theme-test-secret` and serves 200 on `/`.

## T10 — Themes page redesign (draft vs live made explicit) — DONE

Used the `ui-ux-pro-max` skill for the two focused concerns that applied (confirmation dialogs /
active-state affordance) rather than generating a competing design system: the app already owns
Mantine tokens and the repo forbids a parallel visual language.

**The defect it fixes:** the old card had a single `current` badge driven by `draft.themeId`, and
the header showed a `published/draft` status. So a user who activated a theme saw **"Current"** and
had no way to know the **live site still served the old theme** until they published. The draft and
the live site are two different truths and the page conflated them.

**Code (dashboard, `frontend/agency-dashboard-mantine`):**
- New pure `src/features/themes/lib/theme-card-state.ts`: `themeCardState(themeId, draftThemeId,
  publishedThemeId)` → `{isCurrent, isLive, isPendingPublish}`, `themePublishState(...)` →
  `unpublished | in-sync | pending-publish` (first publish is *not* a "pending diff" nobody can
  see), `liveThemeId(...)`. 10 unit tests cover the whole state machine.
- New presentational `src/components/theme-card.tsx` (feature-local `components/`): real preview
  image or a "no preview" placeholder (never a broken img), name/description/version, the three
  badges, per-card **Preview / Customize / Activate**, read-only hint. Selection is carried by a
  2px teal border **and** a badge, so it is not colour-only.
- `use-themes-page.ts` now exposes `liveTheme`, `publishState` and `cardState(themeId)` — the page
  stopped re-deriving state in JSX. The published read was already fetched; only its `themeId` was
  being ignored.
- `themes.page.tsx` is now composition only: header (status + Publish), the two `Alert` notices
  (`role="status"`, one atomic message — not competing live regions), the `SimpleGrid` of
  `ThemeCard`, and the existing Customize drawer.
- The page-level "Preview" button moved onto each card (one action next to what it previews);
  page-level Publish stays, since publishing is site-wide, not per theme.
- i18n en + ar: `badgeCurrent` / `badgeLive` / `badgePending` / `noPreview` / `unknownTheme` /
  `noticeUnpublished*` / `noticePending*`. Arabic badges deliberately avoid the site-status wording:
  `الحالي` (current) · `على الموقع` (on the site) · `بانتظار النشر` (awaiting publish) — the first
  draft used "منشور"/"غير منشور" for the Live/pending badges, which collided with the site's own
  "منشور" (published) status badge.
- The pending notice names the live theme **from the manifest entry**, never by building an i18n
  key out of a theme id (that was the T8 bug class).

**Verified:** `npm test` green — typecheck → format → lint → **45 files / 79 tests** + 1 skipped
file → build. Browser (real login, en + ar): EN shows `Published · Publish · Current · Live ·
Preview · Customize`, AR shows `منشور · نشر · الحالي · على الموقع · معاينة · تخصيص`; all three card
actions are real focusable controls (`tabIndex 0`); **Preview** opens
`http://localhost:4321/_lab/starter/home?t=<signed token>` with `robots: noindex, nofollow`; no raw
i18n keys, no 4xx, no pageerror. Screenshots `/tmp/opencode/audit-t10/themes-{en,ar}.png`.

**Documented deviation from the DoD:** the registry contains **one** theme (`starter`), so
"Activate on a non-current theme" is **unreachable in the browser** — a non-current card is what
renders the Activate button, and there is no second theme to activate. Registering a second theme
would be new theme code outside this task's scope, so instead the draft→live transition is proven
by the 10 unit tests (`themeCardState('atlas','atlas','starter')` → current + not live + pending
publish; `themeCardState('starter','atlas','starter')` → live, not current) and the browser proves
the reachable half (badges, notices, preview, en/ar). If a second theme is added later, the browser
check should assert the Activate → badge flip end to end.

## T11 — Foundations: tokens, primitives, app shell (2026-09-30)

Applied the T1 audit to the shared layer only. No feature business logic touched: the diff is
confined to `src/theme/*`, `src/components/*`, `src/app/layouts/*` and the two `common` catalogs.

**Measured first, then fixed once.** The T1 audit reported ratios, but not causes, so every defect
below was re-measured on the live DOM before and after.

### A1 — primary buttons failed WCAG AA (2.28:1) → fixed in the token layer

Root cause was not the palette but the shade: `AppProviders` sets `forceColorScheme="dark"`, and
`primaryShade: { light: 6, dark: 5 }` made every filled primary button render `brand[5]` `#22C55E`
with white text — 2.28:1. `autoContrast: true` did not save it (measured white on every CTA).
Contrast for white text on each brand step: 4 → 1.74, 5 → 2.28, 6 → 3.30, **7 → 5.02**, 8 → 7.13.
`primaryShade` is now `{ light: 7, dark: 7 }`: shade 7 is the lightest step that clears 4.5:1 at the
13px button size, and hover lands on shade 8. `light` is kept in step so dropping the forced dark
scheme cannot silently reintroduce the failure. One line, every button on every page.

### A5 — no `h1` on any page → `PageHeader` renders the page heading

`PageHeader` defaulted to `Title order={2}`, so all 7 prioritized pages started at `h2`. It now
renders `h1` by default, with the existing `h` prop kept for genuine in-page section reuse. Verified
**exactly one** `h1` per page on 14/14 loads; the departures empty-state early return and the main
render are mutually exclusive, so no route gains a second one.

### A6 — mobile nav Burger had no accessible name → localized `aria-label`

`shell.openNav` = "Open navigation" / "فتح قائمة التنقل". It is `hiddenFrom="sm"`, so this only ever
affected small screens, but it was the single unnamed control on every page.

### A7 — "tables are not horizontally scrollable" was a **false positive**, no code change

The T1 probe measured `overflow-x: visible` on the wrong element. Walking the ancestor chain shows
`DataTable` already wraps every table in `Table.ScrollContainer` (min-width 640px) whose scroll
container is `overflow-x: auto` with an inner `ScrollArea-viewport` at `overflow-x: scroll`
(`clientWidth 606 / scrollWidth 1245` on trips at 900px). Tables already scroll; recorded as
already-sufficient rather than "fixed".

### A9 — the query devtools launcher was not dev-only → gated

`ReactQueryDevtools` rendered unconditionally, so the launcher shipped in production. Now behind
`import.meta.env.DEV`.

### Primitive inventory: upgraded vs already-sufficient (T1 DoD)

| Primitive | Verdict |
|---|---|
| `page-header.tsx` | **upgraded** — page `h1` (A5) |
| `status-badge.tsx` | **upgraded** — the component carried its own second colour map (`active→green`, `published→cyan`, `open→blue`, `confirmed→teal`, `suspended→red`…), i.e. five hues for states the audit requires to be consistent, drawn from Mantine's stock palettes instead of the app's. It now resolves through `getStatusColor()` in `theme/colors.ts`, where `STATUS_COLORS` already lived but was consumed only by the StyleGuide. The map is normalized to lowercase (the API sends uppercase enums), covers exactly the 15 statuses the catalogs translate, and is documented as green/amber/red/neutral. Measured light-variant contrast of the app palettes: 8.5–10.6:1. |
| `data-table.tsx` | **upgraded** — no caller passed `emptyState`, so all 7 tables fell back to a hardcoded English `"Nothing here yet."` (English in the Arabic UI). Falls back to the shared translated `EmptyState` now; a caller-provided node still wins. |
| `empty-state.tsx` | **upgraded** — `ErrorState` now `role="alert"` (a coloured border is not perceivable) and its retry button reuses the existing `actions.retry` key instead of a hardcoded "Try again". |
| `form/field-error.tsx` | **upgraded** — `role="alert"`, and the icon/colour moved from Mantine's stock `red` to the app's `danger` palette. |
| `search-input.tsx` | **upgraded** — the clear affordance was a bare `<IconX onClick>`: unfocusable and unnamed. Replaced with Mantine 9's `InputClearButton` + `actions.clearSearch`. Note: the v8 `clearable`/`clearButtonProps` pair no longer exists in 9.6.2 — `tsc` rejected it and it leaked `clearbuttonprops="[object Object]"` to the DOM, so the API was verified against the installed types instead of docs. |
| `entity-code.tsx` | **upgraded** — hardcoded English `aria-label="Copy code"` → `actions.copyCode`; copied-state colour `teal` → `success`. |
| `dashboard-header.tsx` | **upgraded** — Burger `aria-label` (A6); sign-out item `red` → `danger`. |
| `dashboard-sidebar.tsx` | **upgraded** — `active` used `pathname === item.to`, so on `/bookings/BKG-…` or `/trips/TUR-…` **no** nav item read as active. Now a prefix match; verified exactly one active item on a booking detail route in both locales. |
| `theme/provider.tsx` | **upgraded** — devtools gated (A9). |
| `form-actions.tsx`, `form/form-section.tsx`, `form/drawer-form-shell.tsx`, `form/modal-form-shell.tsx` | **already sufficient** — `FormActions` is `justify="flex-end"`, which resolves against the writing direction and is already correct in RTL; both form shells delegate to Mantine's `Modal`/`Drawer` defaults from `component-defaults.ts` (centered, `radius: md`, `padding: lg`). No change. |
| `money-text.tsx` | **already sufficient** — single `formatMoney` + `tabular-nums` path, locale from `useAppLocale`. |
| `confirm-dialog.tsx` | **already sufficient** — `openConfirmDialog`'s English `'Confirm'`/`'Cancel'` defaults are unreachable: no caller uses that export, only `useConfirmDialog`, which translates both labels. |
| `permission-gate.tsx`, `form/use-zod-form.ts`, `entity-picker/**` | **already sufficient** — untouched by the audit; `useZodForm` stays the single form-state path. |
| `full-page-loader.tsx`, `agency-failure-screen.tsx` | **already sufficient** — both render a translated fallback (`shell.loading`); `ErrorState` covers the announceable failure case. |
| `theme/spacing.ts`, `radius.ts`, `typography.ts`, `shadows.ts` | **already sufficient, deliberately unchanged** — the guidance itself says to extend rather than invent, and the measured page rhythm (root `Stack` gaps of 12/16px, inner 4/8px, `AppShell` padding 12px) all sits inside the documented 8–32px band; `fontSizes` 12/13/14/16/20px and the `clamp()` headings were already a clean modular scale. The one real inconsistency is *page composition* (root gap 12px on overview/departures vs 16px elsewhere), which is T12's per-page spacing work, not a token change. |

### Deliberately not done in T11

- The form-level **focusable error summary** (`role="alert"`, `tabIndex={-1}`, links to fields) is
  recorded in T1 as T12 work; adding it here would mean touching validation-adjacent components.
- `AgencyAccessFailureScreen` / `FeaturePlaceholder` keep `h4`/`h2`; they are whole-page states, not
  the 7 prioritized pages, and no audit finding was raised for them.

**Verified:** `npm test` green — typecheck → format → lint → **47 files / 92 tests** (13 new:
`theme/colors.test.ts` for the status map, `components/primitives.test.tsx` for the primitives in
both locales) → build. Browser (real login, en + ar, 7 pages, script
`/tmp/opencode/pw/t11-verify.mjs`): exactly 1 `h1` per page on 14/14 loads; **zero** controls below
4.5:1 (worst solid control 14.79:1); zero unnamed controls; no horizontal overflow; no 4xx; no
pageerror; booking detail route keeps exactly one active nav item (`Bookings` / `الحجوزات`).

**DoD screenshots** (shell, both required widths, both locales):
`/tmp/opencode/audit-t11/{en,ar}-{overview,trips}-{1440,1024}.png`
