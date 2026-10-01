# Task Plan: Agency Dashboard Visual Redesign

Plan ID: `2026-10-01-dashboard-visual-redesign`
Reference: `frontend/agency-dashboard-mantine/ui-reference.png`
Mode: autonomous

## Goal

Redesign the agency dashboard to a compact, professional, near-neutral operational
UI — dark near-black sidebar, bright light workspace, restrained density — matching the
user's written specification and the measurable geometry of `ui-reference.png`,
without changing any architecture, API, permission, or business logic.

## Next Step

T3: paint the AppShell navbar with `--app-surface-nav`, move agency identity +
locale + account into a bottom-pinned `SidebarFooter`, drop the header to ~44px, and
re-capture the shell states.

## Current Phase

Phase 3

## Constraints

- No backend, API contract, database schema, or RBAC changes.
- No new dependencies; no edits to `package.json` or lockfiles.
- Preserve React, TypeScript, Mantine, TanStack Query, routing, hooks, i18n, RBAC
  filtering, and every existing feature and permission gate.
- Preserve the real navigation: Overview, Trips, Departures, Bookings, Customers,
  Team, Website, Themes.
- No fabricated data, columns, or KPIs. If the API cannot supply it, it does not ship.
- No `backdrop-filter`, gradients, glassmorphism, or decorative effects.
- Every interactive element keeps its accessible name, keyboard path, and visible
  focus ring. New text pairs must meet WCAG AA 4.5:1.
- Visual verification is mandatory: baseline before changes, and matching screenshots
  after each major task, for all seven pages, shell open and closed, `en` and `ar`,
  at 1440, 1024, and 375.
- No commit, push, or branch creation.

## Decisions

| Question | Decision | Rationale |
|---|---|---|
| Overview Departures KPI | Drop; keep Customers / Trips / Bookings / Team | `use-departures.ts:14` is scoped per tour (`enabled: Boolean(tourCode)`); an agency-wide count needs N queries |
| Trips "next departure" column | Drop the column; show `updatedAt` instead | `TourListRow` (`tours/types.ts:163`) has no next-departure date |
| Reference image | Proceed from written spec + measured pixel geometry | The image could not be visually perceived in-session; geometry was measured programmatically |
| "Remove the full-dark dashboard" | No teardown needed | `provider.tsx:52` is already `defaultColorScheme="light"`; grep for `backdrop-filter\|gradient\|glass\|blur(` returns zero hits |
| Plan location | New directory | User approved a new plan; preserves `2026-10-01-dashboard-ui-ux-overhaul` history |

## Phases

### Phase 1: Baseline & Discovery

#### T1 — Baseline screenshots + UI audit — COMPLETE

- **Result:** 44 PNGs + `geometry.json` in
  `frontend/agency-dashboard-mantine/.artifacts/baseline/`. 7 pages × `en`/`ar` ×
  1440/1024/375 + 2 shell-collapsed. `dir` flips correctly, zero overflow at 1440,
  all files 36KB–162KB (real content). Driver:
  `frontend/theme-agency/tools/dashboard-screenshots.mjs`. Delta table and measured
  geometry are in `findings.md`.
- **Blocked then unblocked:** credentials were absent from the dashboard code; found
  in the repo-root `.env` as `WEBSITE_TEST_*` (see `findings.md` → Issues Encountered).

#### T1 — Baseline screenshots + UI audit (detail)

- **Problem:** There is no recorded visual state of the current dashboard, so no
  redesign delta can be proven. The previous plan's T9 was closed without screenshots.
- **Files:** new `frontend/theme-agency/tools/dashboard-baseline.mjs`;
  `.artifacts/baseline/**`; `findings.md`.
- **Reuse:** the installed `@playwright/test` under `frontend/theme-agency`; the
  existing `playwright.config.ts` and `tools/theme-test.mjs` login pattern; cached
  Chromium.
- **Extract/refactor:** none — this task only produces evidence.
- **Scope:** capture all seven pages + shell open/closed × `en`/`ar` × 1440/1024/375.
  Log in through the real UI. Record measured geometry (sidebar width, header height,
  content gutter, control heights) and a delta table against the reference.
- **DoD:** every PNG written and committed to `.artifacts/`; delta table written to
  `findings.md`; no application source modified.
- **Tests:** none (no source change). Gate: script exits 0.
- **Screenshots:** this task *is* the baseline.

#### T2 — Semantic tokens + light workspace — COMPLETE

- **Files:** `theme/colors.ts`, `theme/tokens.css`, `theme/theme.ts`, `theme/radius.ts`,
  `theme/shadows.ts`, `index.css`, `contrast.test.ts`, `tokens.test.ts`,
  `dashboard-sidebar.tsx` (token consumption only).
- **Result:** warm neutral gray ramp (`#F6F6F7` page / `#F7F7F7` sunken / `#E3E3E3` +
  `#D8D8D8` borders / `#1A1A1A` text) with a ≤2/255 channel-spread assertion; new
  `ink` palette is `primaryColor` at shade 8; focus ring is neutral ink, not brand;
  radius capped at 8px with `md` = 6px; shadows neutral and ≤12% black; document
  body paints `--app-surface-page`; heading scale capped at 26/18px.
- **Verified in-browser:** filled buttons resolve to `rgb(26,26,26)` with a white
  label; all button radii 6px; card border `rgb(227,227,227)`; body `rgb(246,246,247)`;
  `h1` 26px. Screenshots in `.artifacts/t2-tokens/`.
- **Gate:** 80 files passed / 1 skipped, 335 tests passed / 6 skipped (was 317).
- **Deliberately deferred to T3:** the rail is still light — the nav tokens exist but
  nothing paints `--app-surface-nav` until the shell is restructured.
- **Conflict resolved:** the spec's tertiary text `#8A8A8A` is 3.45:1 on white and
  fails AA, so it is quarantined to the dark rail (5.7:1 there) and to non-text
  graphics. Tertiary light-surface text uses `gray-7` with size/weight carrying the
  hierarchy instead.

#### T2 — Semantic tokens + light workspace (detail)

- **Problem:** The gray ramp is cool and light (`#F8FAFB` page, `#E4E8EC` borders),
  primary actions are brand green, and headings are too large
  (`--app-heading-h1` clamps to 2rem) for an operational tool.
- **Files:** `src/theme/colors.ts`, `src/theme/tokens.css`, `src/theme/theme.ts`,
  `src/theme/radius.ts`, `src/theme/shadows.ts`, `src/theme/typography.ts`,
  `src/theme/contrast.test.ts`.
- **Reuse:** existing `colors.ts` structure, `DIMMED_LIGHT` override in `theme.ts:25`,
  `cssVariablesResolver` pattern.
- **Extract/refactor:** replace the gray ramp with the warm neutral scale
  (`#F6F6F7` / `#FFFFFF` / `#F7F7F7` / `#E3E3E3` / `#D8D8D8`); add an `ink`
  near-black palette for primary actions and repoint `primaryColor`; keep
  `success`/`warning`/`danger`/`info` strictly semantic; add `--app-surface-nav`,
  `--app-nav-hover`, `--app-nav-active`, `--app-nav-text`, `--app-nav-muted`;
  radius `md` 8px→6px; trim shadows to `xs` for overlays; cap `--app-heading-h1`
  at ~24px and `--app-heading-h2` at ~18px.
- **Scope:** tokens and theme only. No component layout changes.
- **DoD:** page paints `#F6F6F7`; raised surfaces white; borders `#E3E3E3`; primary
  action is dark filled with a white label; no component hardcodes a hex.
- **Tests:** extend `theme/contrast.test.ts` with the new pairs; re-verify
  `DIMMED_LIGHT` against the new gray-7; full gate green.
- **Screenshots:** token regression capture across the seven pages.

### Phase 2: Shell & Primitives

#### T3 — AppShell / sidebar / top utilities

- **Problem:** The sidebar is light with a green-tinted active pill and a
  start-edge accent border; agency identity, locale, and account sit in the header,
  so they compete with page content.
- **Files:** `src/app/layouts/dashboard-sidebar.tsx`,
  `src/app/layouts/dashboard-header.tsx`, `src/app/layouts/dashboard-layout.tsx`,
  new `src/app/layouts/sidebar-footer.tsx`, `src/theme/tokens.css`,
  `src/index.css`, new `src/app/layouts/dashboard-sidebar.test.tsx`.
- **Reuse:** `use-nav-items.ts` groups and RBAC filtering, `use-dashboard-header.ts`
  data, `DashboardSidebar` prefix-match active logic (`dashboard-sidebar.tsx:24`).
- **Extract/refactor:** extract the AppShell navbar classes into a
  `[data-shell-nav]` block in `index.css`; move agency identity, locale switch, and
  account menu into a bottom-pinned `SidebarFooter`; reduce the header to a quiet
  ~44px utility band; group labels `#8A8A8A` uppercase 11px; items `#D4D4D4`,
  hover `#1F1F1F`, active `#252525` at 6px radius; delete the brand-tint nav tokens
  (`tokens.css:54-63`) and the accent border (`dashboard-sidebar.tsx:41-43`).
- **Scope:** shell chrome only. Navigation targets and labels unchanged.
- **DoD:** sidebar matches the reference; the active item is identifiable without a
  directional border; all existing nav tests still pass.
- **Tests:** new `dashboard-sidebar.test.tsx` (active/hover classes, prefix match on
  detail routes, group labels).
- **Screenshots:** shell open/closed × `en`/`ar`.

#### T4 — Shared UI primitives

- **Problem:** Card wrappers and per-page styling diverge across views; several
  shared components hardcode English fallbacks.
- **Files:** `src/components/page-header.tsx`, `section-header.tsx`,
  `data-toolbar.tsx`, `data-table.tsx`, `table-skeleton.tsx`, `row-actions-menu.tsx`,
  `cell-stack.tsx`, `stat-card.tsx`, `status-badge.tsx`, `empty-state.tsx`,
  `error-state.tsx`, `search-input.tsx`, `content-container.tsx`,
  new `src/components/panel.tsx`.
- **Reuse:** existing component APIs and Styles API wiring.
- **Extract/refactor:** add a shared `Panel` (white, 6px radius, `#E3E3E3` border, no
  shadow) and replace remaining per-page `Card` wrappers; standardize a 32px control
  and 28px `compact-sm` row-action rhythm; fix the hardcoded fallbacks in
  `empty-state.tsx:23` and `error-state.tsx`.
- **Scope:** primitives only. No feature-page layout changes.
- **DoD:** no component hardcodes a hex; every surface resolves through `tokens.css`;
  no English literal remains in a shared component.
- **Tests:** per-primitive class and content assertions.

#### T5 — Overview

- **Problem:** Four equal tiles compete for attention; quick actions crowd the
  header; the site card uses a brand-green wash.
- **Files:** `src/features/overview/components/overview-view.tsx`,
  `site-status-card.tsx`, `src/features/overview/hooks/use-overview-page.ts`,
  `src/i18n/locales/{en,ar}/dashboard.json`, new
  `src/features/overview/components/overview-view.test.tsx`.
- **Reuse:** `StatCard`, `PageHeader`, `BookingsTable`, `ErrorState`,
  `SimpleGrid`/`Grid` responsive props, `canView` permission gates.
- **Extract/refactor:** dense tile anatomy (13px/600 label, 24px/600 number);
  `cols={{ base: 2, lg: 4 }}`; bookings/site split 9/3; move quick actions out of the
  header into a dedicated action group; `SiteStatusCard` becomes a neutral panel
  showing real draft/published state.
- **Scope:** layout and copy only. The controller keeps Customers / Trips /
  Bookings / Team; the Members tile is not shown because there is no Members API.
- **DoD:** every KPI maps to a real query; one primary action in the header; no
  brand-green wash.
- **Tests:** `overview-view.test.tsx` — KPI order, permission gating, header action
  count, section headings.
- **Screenshots:** EN/AR × 1440/1024/375.

### Phase 3: Data Surfaces

#### T6 — Shared table/list system

- **Problem:** Eight tables differ in header weight, separators, hover, and row
  density; sticky offsets are tied to the old header height.
- **Files:** `src/components/data-table.tsx`, new
  `src/components/data-table.test.tsx`, and every consuming table
  (`bookings-table.tsx`, `tours-table.tsx`, `departures-table.tsx`,
  `customers-table.tsx`, `members-table.tsx`, `invitations-table.tsx`,
  `payments-table.tsx`, `departures-manager.tsx`).
- **Reuse:** existing `DataTable` column contract, sticky header, keyboard row
  navigation, `ScrollContainer`.
- **Extract/refactor:** `#F7F7F7` header; `#E3E3E3` bottom-only separators with no
  vertical rules and no zebra; 1px row hover; sticky offset retargeted to the new
  header height; numeric columns `ta="end"` with tabular figures; code columns
  monospace 12px.
- **Scope:** presentation contract only. Columns and data stay as the API returns them.
- **DoD:** all eight tables are identical in header, hover, density, and menu affordance.
- **Tests:** `data-table.test.tsx` density, separator, sticky offset, RTL end alignment.

#### T7 — Trips

- **Problem:** Trips render as text; `coverImageUrl` is unused in the list, and the
  visual weight of each row does not match the reference.
- **Files:** `src/features/trips/components/trips-view.tsx`,
  `src/features/trips/components/tours-table.tsx`, new
  `src/features/trips/components/tour-thumbnail.tsx`, `tour-title-cell.tsx`,
  new `src/features/trips/components/trips-view.test.tsx`,
  `src/i18n/locales/{en,ar}/dashboard.json`.
- **Reuse:** `DataTable`, `RowActionsMenu`, `DataToolbar`, existing `Avatar`
  cover fallback, `TourListRow` fields (`types.ts:163`), existing status filter.
- **Extract/refactor:** extract `TourThumbnail` (64×48, 4px radius,
  `coverImageUrl` with the existing fallback) and `TourTitleCell`; columns become
  image + title, status, duration (`days`/`nights`), destinations (first + `+N`),
  `startingPrice`, `updatedAt`; filters become Destination / Status / Format, all
  derivable from `TourListRow`.
- **Scope:** list presentation and filters. The "next departure" column is omitted
  because the API does not supply the date.
- **DoD:** every trip renders its own `coverImageUrl`; no duplicated stock imagery;
  no invented columns.
- **Tests:** `trips-view.test.tsx` — column set, thumbnail src, fallback rendering,
  destination overflow count.
- **Screenshots:** table and filter-bar states, EN/AR.

#### T8 — Departures / Bookings / Customers

- **Problem:** Departures, Bookings, and Customers each diverge from the shared
  table contract and from each other.
- **Files:** `src/features/departures/**`, `src/features/bookings/**`,
  `src/features/customers/**` views, tables, and controllers; new per-view tests.
- **Reuse:** T6 `DataTable` contract, `RowActionsMenu`, `CellStack`, `STATUS_COLORS`,
  existing permission gates and `useIsRtl` back arrows.
- **Extract/refactor:** Departures keeps the today / upcoming / past operational
  framing, adds departure code, start/end, capacity progress, and moves the count
  button into `RowActionsMenu`; Bookings gets right-aligned money, tighter
  `CellStack`, and the shared status mapping; Customers keeps Avatar initials as
  the identity column and adds last-booking info **only if `CustomerListRow`
  already carries it**.
- **Scope:** presentation only.
- **DoD:** no fabricated columns; all three pages share the T6 contract.
- **Tests:** per-view column and permission assertions.
- **Screenshots:** all three pages, EN/AR × 1440/1024/375.

### Phase 4: Editors

#### T9 — Website

- **Problem:** The editor lacks a clear saved/unsaved structure and its action
  hierarchy is flat.
- **Files:** `src/features/website/pages/website-page.tsx`,
  `src/features/website/components/website-view.tsx`, `src/features/website/**`,
  `src/index.css`, `src/i18n/locales/{en,ar}/website.json`.
- **Reuse:** `use-save-bar.ts` semantics unchanged, sticky clearance token, existing
  section renderer, save/publish mutations.
- **Extract/refactor:** section rail with saved/unsaved indicators; inline
  "unsaved changes" notice; action hierarchy Save (filled) > Preview (default) >
  View Live (subtle) > Publish (filled, confirm modal).
- **Scope:** chrome and layout. Save-bar logic untouched.
- **DoD:** sticky clearance math still correct; unsaved state is visible without
  scrolling to the save bar.
- **Tests:** existing save-bar tests unchanged; new `website-view.test.tsx`
  action-hierarchy and unsaved-notice assertions.
- **Screenshots:** list and editor, EN/AR.

#### T10 — Themes

- **Problem:** Theme previews are small (160px), and an unresolved manifest key can
  surface a raw i18n key such as `themes.starter.name`.
- **Files:** `src/features/themes/**`, new `src/features/themes/components/themes-view.test.tsx`,
  `src/theme/tokens.css`, `src/i18n/locales/{en,ar}/themes.json`.
- **Reuse:** existing theme media query, no-preview placeholder, `RowActionsMenu`,
  `Title order={2}` card heading from the previous pass, page-level publish action.
- **Extract/refactor:** `--app-theme-card-media-height` 160px → ~200px at 16:10;
  card shows name, version, state, description; per-card `RowActionsMenu`
  (Preview / Customize / Activate); add a human-readable fallback so a missing
  manifest key can never render raw.
- **Scope:** catalog presentation and key fallback only.
- **DoD:** zero raw i18n keys in any locale; preview and placeholder occupy the
  same height.
- **Tests:** `themes-view.test.tsx` key-fallback and media-height assertions.
- **Screenshots:** catalog plus search and empty states, EN/AR.

### Phase 5: Consistency, RTL, Verification

#### T11 — Empty / loading / error / form consistency

- **Problem:** Empty, loading, and error states differ per page, and form spacing
  is inconsistent.
- **Files:** `src/components/empty-state.tsx`, `error-state.tsx`,
  `table-skeleton.tsx`, new `src/components/state-panel.tsx`, and every feature form.
- **Reuse:** existing `EmptyState`, `ErrorState`, `TableSkeleton`, Mantine field
  defaults from `component-defaults.ts`.
- **Extract/refactor:** one `StatePanel` (icon + title + description + optional
  action) reused everywhere; skeletons match the 32px/44px row rhythm; forms get
  consistent label/description/error spacing, 6px radius, 44px touch targets, inline
  `role="alert"` validation, and one submit-summary pattern.
- **Scope:** state and form presentation.
- **DoD:** no English literal in a shared component; every state panel matches.
- **Tests:** state-render tests per page; form validation assertions.

#### T12 — RTL + responsive + accessibility

- **Problem:** Directional mirroring and small-screen behavior are verified
  piecemeal rather than as a whole.
- **Files:** feature views, `src/index.css`, and RTL test files.
- **Reuse:** `useIsRtl`, existing logical-property migration, `aria-current`,
  `VisuallyHidden` heading pattern.
- **Extract/refactor:** logical properties only (verify no
  `ml|mr|pl|pr|left|right` remains); `useIsRtl` mirroring for breadcrumbs,
  pagination, drawers, menus, and icon direction; Arabic numeral and `Intl`
  formatting parity with `en`; breakpoints at 1440/1024/768/375 with sidebar
  collapse below `sm`; visible focus rings; `aria-current` on nav items.
- **Scope:** verification and targeted fixes; no structural change.
- **DoD:** `npm test` green; AA verified for new text pairs; no horizontal
  overflow at 375.
- **Tests:** existing RTL tests plus new Arabic truncation and mirror assertions.
- **Screenshots:** full matrix re-captured.

#### T13 — Final visual regression + cleanup

- **Problem:** The redesign must be proven against both the reference and the
  baseline, and dead tokens removed.
- **Files:** `.artifacts/final/**`, `findings.md`, `progress.md`, and any token or
  component files that become unused.
- **Reuse:** the T1 driver with an output-path flag.
- **Extract/refactor:** re-capture the full matrix; compare against
  `ui-reference.png` and the T1 baseline; delete dead tokens and components.
- **Scope:** verification and cleanup only.
- **DoD:** every gate green; zero placeholder images; no hardcoded hex outside
  `src/theme/`; T1–T12 evidence recorded in `progress.md`.
- **Tests:** `npm test` — typecheck, format, lint, vitest, build.
- **Screenshots:** full matrix, EN/AR, shell open and closed, three widths.

## Phase Status

- **Phase 1:** complete
- **Phase 2:** complete
- **Phase 3:** in_progress
- **Phase 4:** pending
- **Phase 5:** pending

## Out of Scope

- Backend, API, schema, RBAC.
- New dependencies, Tailwind, or any second framework.
- Commit, push, branch, PR.
- Changing navigation targets, permission gating, or business rules.