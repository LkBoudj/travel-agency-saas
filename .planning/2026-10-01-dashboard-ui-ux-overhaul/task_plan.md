# Task Plan — Agency Dashboard UI/UX overhaul (Shopify-level clarity, Mantine-native)

Target app: `frontend/agency-dashboard-mantine`. The previous plan
(`2026-09-30-dashboard-demo-data-themes-ux`) is **complete** and is not superseded — it produced
the seeded tenant `AGY-0C937B377B89` and the website/themes pipeline this plan now polishes.

## Goal

Raise the dashboard from a functional dark Mantine admin panel to a production-grade Travel SaaS
dashboard: clean app shell, clear content surfaces, strong hierarchy, consistent spacing,
professional empty states, compact readable tables, clear primary actions, reusable UI patterns,
RTL/LTR parity. Shopify is the **minimum quality benchmark**, never a visual copy.

## Decisions locked with the user (2026-10-01)

| # | Decision | Consequence |
|---|---|---|
| D1 | **Switch to light surfaces.** Remove `forceColorScheme="dark"` (`src/theme/provider.tsx:49`), the hardcoded `body { background: dark-7 }` (`src/index.css:37`) and the three `--app-glass-*` vars (`src/index.css:16-18`). | Highest-impact change. Every `c="dimmed"` string and every `Badge variant="light"` status chip must be re-audited for WCAG 4.5:1. The `theme.ts:19-24` `primaryShade` comment becomes stale and must be rewritten for the now-real light scheme. |
| D2 | **Keep the green `brand` accent.** | `brand` ramp, `primaryShade: 7` (5.02:1, audited and test-guarded in `src/theme/colors.test.ts`) and `STATUS_COLORS` are untouched. Only neutral surfaces/borders change. |
| D3 | **Remove banned effects**: `glassStyle` (`dashboard-layout.tsx:7-12`), `defaultGradient` (`theme.ts:39`). | Glassmorphism is both banned by the constraints and meaningless on light surfaces. Replaced by solid surfaces + a single hairline border. |
| D4 | **T9 uses live Playwright screenshots** (en + ar, 1440/1024/375) driving `:5175` against the real backend and the seeded tenant. Driver borrowed from `frontend/theme-agency` (Playwright already installed there — **no install in the dashboard**). Throwaway scripts + PNGs in `/tmp/opencode/audit-ux/`, deleted after. | Reverses the earlier "Playwright work stopped" note, per the explicit T9 requirement. |
| D5 | **Keep Overview's second band** (recent bookings + site-status card) reusing the existing `useWebsiteDraft` + `usePublishedWebsite` queries. | Resolves the T4 open question from approval. Two existing queries added to Overview; no new endpoint. |

## Hard constraints (repo policy)

- **No dependency installs**, no `package.json`/lockfile edits, no commits/branches/PRs.
- No backend/endpoint/schema/RBAC change. UI + composition only.
- Do not change business logic, API contracts, hooks or services unless a UI requirement truly needs it.
- Reuse existing shared components before creating new ones.
- Keep the page-thin separation: `page → hooks → components → services/types`.
- `ar` is a product language: every UI change ships en **and** ar with correct RTL.
- No arbitrary gradients, glassmorphism, decorative effects or template-like visuals.
- Do not overuse cards; do not redesign pages independently; do not duplicate patterns.
- **Gate for every task:** `npm test` in `frontend/agency-dashboard-mantine`
  (`typecheck → format:test → oxlint+stylelint → vitest → build`).

## T1 audit summary (full detail in `findings.md`)

- **Shell:** `navbar width 260`, `header 56`, `padding="md"`, glass header/navbar, **no max-width
  anywhere**, `AppShell.Main` is a bare `<Outlet/>`. Sidebar is one flat list of 8 items under a
  section label literally named `t('brand')`; active state is 3 ad-hoc CSS vars.
- **Foundations:** a real token base exists and is reused, not replaced (`brand`/`gray`/`dark`,
  4 semantic ramps, `STATUS_COLORS` + `getStatusColor`, `spacing`/`radius`/`shadows`, Fira Sans /
  Fira Code, `--app-heading-h1..h6`, `cursorType`, `focusRing: 'auto'`, `autoContrast`).
  **Missing:** any surface/border token layer. **`Card` has no defaults** → `p="xs"`/`"md"`/`"lg"`
  drift across pages.
- **Duplication to consolidate:** row-actions `Menu` shell ×4; list toolbar ×3; section header ×2;
  loading ×3 patterns (none Mantine `Skeleton`); `EmptyState` bypassed ×2; truncation
  `Stack style={{minWidth:0}}` ×5+; status chip: shared `StatusBadge` vs raw `Badge` ×2; stat tile
  `KpiCard` vs pricing strip; website repeating rows ×6 with `style={{flex:1}}`.
- **Page-specific hacks to delete:** glass vars + `glassStyle`, `defaultGradient`, forced dark +
  `body{dark-7}`, `styles={{root:{maxWidth:420}}}` on the departures Select,
  `style={{borderRadius:'var(--mantine-radius-md)'}}` in `quick-create-drawer.tsx:154`,
  `Box py="xl"` loader placeholder, `Text fw={600}` used as a heading
  (`departures-view.tsx` AvailabilityInfo), `capitalize` on schema group names,
  raw `div[data-skeleton]`, hardcoded teal/danger palette vars, direction-locked icons.
- **Real defects:** (1) `DataTable` rows are mouse-only (`data-table.tsx:67-71`) — bookings detail
  is keyboard-unreachable (WCAG 2.1.1); (2) hardcoded `minWidth={640}` for every table
  (`data-table.tsx:34`); (3) no skip link on a nav-heavy shell; (4) `Select` in a
  `wrap="nowrap"` Group at 375px; (5) Overview KPI cards indistinct from generic cards + bare
  spinner while other lists skeletonize + dead lower viewport with the seeded dataset.

## ui-ux-pro-max decisions applied

- `--design-system` (density 8, variance 3, motion 3) → **Minimalism & Swiss style**, which matches
  "clarity, not decoration". Its Aurora/glass and gradient suggestions were **rejected** as
  constraint violations.
- Guidance retrieved and adapted: Font Size Scale (no arbitrary sizes), Table Handling (horizontal
  scroll on mobile), Empty States (message **+ action**), Nav Active State, Heading Hierarchy
  (sequential h1→h2→h3), Keyboard Navigation, Skip Links, Color Contrast (4.5:1),
  Contrast Readability (no gray-on-gray), Focus Appearance (≥2px, 3:1), reduced motion.
- **No database match** for RTL mirroring (the query returned fixed-positioning/stacking-context
  rows). RTL rules therefore come from the codebase's own `useIsRtl`/`applyDocumentLocale` and are
  verified by screenshot, not by the skill.

## Tasks

Tasks execute strictly in order; each ends with the gate green and a `progress.md` entry. Each task
that changes layout also captures its own before/after screenshots.

### Phase 1 — T1: UI audit + reusable component inventory
**Status:** complete
**Depends on:** nothing. **No source change.**
- **DoD:** audit tables recorded in `findings.md`; zero source files touched.

### Phase 2 — T2: Design tokens and foundations
**Status:** complete
**Files:** `src/theme/provider.tsx`, `src/theme/theme.ts`, `src/theme/component-defaults.ts`,
`src/theme/typography.ts`, `src/theme/radius.ts`, `src/index.css`,
`src/components/page-header.tsx` (minor), `src/components/empty-state.tsx` (minor).
**Reuse:** all existing ramps/scales/`--app-heading-*`/`STATUS_COLORS`. `colors.ts` not touched.
- **Do:** drop `forceColorScheme`, `defaultGradient`, the three `--app-glass-*` vars and
  `body{dark-7}` (→ `var(--mantine-color-body)`); add a surface layer in the existing `:root`
  block (`--app-surface-page/raised/sunken`, `--app-border-subtle/strong`, `--app-row-hover`,
  `--app-skeleton`, `--app-focus-ring`, `--app-accent-border`); `Card` defaultProps
  `{ withBorder, radius:'md', padding:'md' }`; `Table` defaults gain `fz:'sm'`,
  `withColumnBorders:false` and a subtle header (`Table.Thead` compound key **if Mantine 9
  supports it, verified against installed source — otherwise in `DataTable`**); retune scrollbar +
  `:focus-visible` for light; rewrite the stale `primaryShade` comment;
  `EmptyState`/`ErrorState` swap hardcoded danger/teal vars for semantic tokens.
- **DoD:** `npm test` green · every text/background pair used measured ≥4.5:1 (numbers in
  `progress.md`) · no `#hex` and no `var(--mantine-color-*)` outside `src/theme/` · no glass or
  gradient left.

### Phase 3 — T3: App shell and navigation
**Status:** complete
**Files:** `src/app/layouts/dashboard-layout.tsx`, `dashboard-header.tsx`,
`dashboard-sidebar.tsx`, `hooks/use-nav-items.ts`; **new** `src/components/content-container.tsx`.
**Reuse:** `AppShell`, existing header/sidebar split, `useAgencyContext`, `useIsRtl`,
`applyDocumentLocale`.
- **Do:** solid header/navbar with a single logical hairline (`borderBottom` / `borderInlineEnd`),
  header 56→60, `AppShell padding="0"` so pages own their padding; nav grouped into 4 labelled
  sections (Workspace · Operations · Team · Online presence) with the existing permission filter
  untouched; active item = subtle surface + medium weight + `borderInlineStart` indicator, gap 4→2;
  delete the `t('brand')` label; skip link ("skip to content") targeting `AppShell.Main#main`;
  tighten header `px`; replace the 3 ad-hoc `--nl-*` vars with tokens.
- **DoD:** `npm test` green · nav grouping renders en+ar with correct permission filtering
  (new unit test) · skip link is the first tab stop and focuses `<main>` · no glass vars remain.

### Phase 4 — T4: Overview redesign
**Status:** complete
**Files:** `features/overview/components/overview-view.tsx`; `kpi-card.tsx` **promoted to**
`src/components/stat-card.tsx` and deleted from the feature; `hooks/use-overview-page.ts`
(composition only); `components/overview-view.test.tsx`.
**Reuse:** `PageHeader`, `DataTable`/`BookingsTable`, `EmptyState`, `ViewWebsiteButton`,
`useOverviewPage`'s existing `kpis` + `recentBookings` lib.
- **Do:** `StatCard` hierarchy (12px uppercase label → 30px tabular value → 12px sub, muted icon
  tile, hairline, no shadow, `compact` variant for T5); permission-gated **navigation-only** quick
  actions in the header; recent bookings → skeleton rows, 8 rows, result link; **second band**
  recent bookings (2/3) + a compact site-status card reusing the existing `useWebsiteDraft` +
  `usePublishedWebsite` + `ViewWebsiteButton` (D5).
- **DoD:** `npm test` green (`overview-view.test.tsx` updated, not deleted: one `h1`, ≥2 `h2`,
  action labels asserted) · no vertical gap > ~120px below the last section at 1440×900 with the
  seeded data.

### Phase 5 — T5: Shared data-list/table pattern (Tours · Departures · Bookings · Customers)
**Status:** complete — gate green (66 files passed/1 skipped, 247 tests passed/6 skipped); carried to
T8: the Team page's `members-table`/`invitations-table` still hand-roll the `Menu`/`ActionIcon` row
shell and `members-view` still wraps its lists in `Card p="xs"`. Outside T5's declared file list, so
left alone rather than refactored silently; the T8 page pass should fold them into `RowActionsMenu`,
`DataToolbar` and `ContentContainer`.
**New (all `src/components/`):** `data-toolbar.tsx`, `row-actions-menu.tsx`,
`section-header.tsx`, `table-skeleton.tsx`, `cell-stack.tsx`.
**Changed:** `data-table.tsx`, `empty-state.tsx`, `status-badge.tsx`, `search-input.tsx` (minor);
`features/trips/components/{trips-view,tours-table}.tsx`,
`features/departures/components/{departures-view,departures-manager}.tsx`,
`features/pricing/components/pricing-manager.tsx`,
`features/bookings/components/{bookings-view,bookings-table}.tsx`,
`features/customers/components/{customers-table,customers-view}.tsx`.
- **Do:** `DataTable` gains `minWidth` (per table, not 640), `stickyHeader`, keyboard row
  activation (`tabIndex={0}`, `onKeyDown` Enter/Space, `aria-label`), `skeletonRows`,
  `caption`/`aria-label`, and Mantine `Skeleton` via `TableSkeleton`; `EmptyState` gains `compact`
  and the 2 bypassing pages adopt it; `DataToolbar` = search + filters + optional actions on one
  spacing contract that stacks at `sm`; `RowActionsMenu` = shared Menu/ActionIcon shell;
  `SectionHeader` = `h2` + description + actions; `StatusBadge` absorbs the availability mode;
  pricing's 3-block strip uses `StatCard compact`; every list shows a translated result count from
  the already-fetched array length; Customers gains the status filter its siblings have (no query
  change).
- **DoD:** `npm test` green · `grep` proves zero page-level `Menu`/`ActionIcon` action shells and
  zero page-level skeleton divs · all four lists share `DataToolbar` + `DataTable` + `EmptyState` ·
  clickable rows keyboard-reachable (new `data-table` test) · all 4 existing view/table tests
  updated, none deleted.

### Phase 6 — T6: Website page UX
**Status:** complete
**Files:** `features/website/components/website-view.tsx`,
`sections/{home,tours,navigation,footer,branding}-section.tsx`; **new**
`features/website/components/repeating-rows.tsx`.
**Reuse:** `SectionHeader`, `ContentContainer`, `StatusBadge`, `FormActions`, `FormSection`,
`FormErrorSummary`, `DrawerFormShell`, `ViewWebsiteButton`, and the zod schema + `useWebsiteForm`
+ `buildWebsiteContentPatch` (all untouched).
- **Do:** sticky save bar (`position: sticky`, precedent `trip-editor.tsx:115`) with a dirty
  indicator from a new pure `lib/` comparison of form values vs `websiteToFormValues(draft)`;
  `RepeatingRow` components (trust point / testimonial / nav link / footer column header / footer
  link / footer legal) with typed field paths, killing all 9 `flex:1` hacks; `SectionHeader` per
  tab; header cluster ordered primary → secondary → tertiary: **Publish** (filled) · **View**
  (light) · status badge + slug as tertiary metadata beneath the title; `EmptyState compact` for
  empty lists.
- **DoD:** `npm test` green · zero `style={{flex:1}}` and zero inline style objects left in
  `features/website/components` · every field path, schema rule, max length and endpoint
  **byte-identical** (diff review) · Save visible at scroll 0 and scroll end.

### Phase 7 — T7: Themes page UX
**Status:** complete
**Files:** `features/themes/pages/themes.page.tsx`, `components/theme-card.tsx`,
`components/schema-form/schema-settings-renderer.tsx`.
**Reuse:** `lib/theme-card-state.ts` + `lib/theme-preview-url.ts` + `lib/settings-map.ts` (pure,
unit-tested — unchanged), `useQualifiedKey` (translation with raw-key fallback already correct),
`SectionHeader`, `StatusBadge`, `EmptyState`, `LoadingState`.
- **Do:** `ThemeStateBadge` maps `ThemeCardState` → one Badge variant/color set reusing
  `STATUS_COLORS` semantics (replaces 3 ad-hoc badges); current-state border → `--app-accent-border`
  token + `data-current` (kills hardcoded teal); action hierarchy: **Activate** = `filled` (primary,
  only when not current), **Customize** = `light` (secondary, only when current), **Preview** =
  `subtle` (tertiary, always); card footer `Group justify="space-between"` so name/version/state
  align across cards; grid `spacing="lg"`→`"md"`, image height token; `EmptyState` + skeleton
  loading; real group labels instead of `capitalize`.
- **DoD:** `npm test` green · no raw `themes.*` key visible in en or ar · no hardcoded palette var
  in `theme-card.tsx` · the Activate → `draft.themeId` → Current flip → Pending-publish notice flow
  still holds (`lib/theme-card-state.ts` tests unchanged and green).

### Phase 8 — T8: Responsive + RTL + accessibility pass
**Status:** complete — gate green (80 files passed/1 skipped, 317 tests passed/6 skipped); a11y+RTL checklist with per-item evidence in `progress.md`
**Files:** every file touched above plus `src/index.css`, `src/app/layouts/*`,
`src/components/data-table.tsx`.
- **Do:** **RTL** — physical → logical properties (`borderInlineStart`, `ta="start"/"end"`,
  `insetInlineStart`), flip directional icons via the existing `useIsRtl` precedent
  (`IconChevronRight`, `IconArrowLeft`, `IconArrowRight`), verify every Website form row and every
  T5 toolbar under `dir="rtl"`. **Responsive** — 375/768/1024/1440 for all 7 pages; toolbars wrap,
  tables scroll without breaking layout, no horizontal page scroll, KPI grids collapse. **A11y** —
  close the 5 real defects, audit `aria-label` on every `ActionIcon`, sequential h1→h2→h3 on every
  page (Tours/Bookings/Customers have no `h2` today), focus never hidden behind the sticky save bar
  or navbar, honour `prefers-reduced-motion` on the `Modal`/`Drawer` `transitionProps` in
  `component-defaults.ts`.
- **DoD:** `npm test` green · written a11y+RTL checklist in `progress.md` with per-item evidence ·
  zero physical-direction properties left in touched files.

### Phase 9 — T9: Visual regression, screenshots and final verification
**Status:** closed without the visual pass — the user closed the task after T8. Screenshots, contrast/density evidence and the live :5175 run were NOT produced; only `PROJECT_MAP.md` gained its `[DASHBOARD DESIGN SYSTEM]` section.
**Files:** no source. Throwaway Playwright driver + output in `/tmp/opencode/audit-ux/`, deleted.
- **Do:** dashboard dev server `:5175` against the real backend and tenant `AGY-0C937B377B89`.
  Playwright driven from `frontend/theme-agency`. Capture shell (open+closed) + all 7 pages in en
  and ar at 1440/1024/375, one focused-row shot, one form-error-summary shot.
- **DoD:** every page has an en+ar shot per task that touched it · contrast and density claims
  backed by a named screenshot · full `npm test` green · `frontend/theme-agency` and `backend` not
  re-run (this plan touches neither) unless a gate proves otherwise · temp dir removed ·
  `PROJECT_MAP.md` gains a `[DASHBOARD DESIGN SYSTEM]` section naming
  `ContentContainer`/`DataToolbar`/`DataTable`/`RowActionsMenu`/`SectionHeader`/`StatCard` and the
  surface tokens · `AGENTS.md` gains a line only if a durable rule emerged (candidate: "list pages
  compose `DataToolbar` + `DataTable`; no page-level `Menu` shells; no palette vars outside
  `src/theme/`").

## Dependency graph

```text
T1 ─▶ T2 ─┬─▶ T3 ─┬─▶ T4 ─┐
          │       ├─▶ T5 ─┤
          │       ├─▶ T6 ─┼─▶ T8 ─▶ T9
          │       └─▶ T7 ─┘
```

## Out of scope (explicitly)

- No dependency installs, no `package.json`/lockfile edits, no commits/branches/PRs.
- No backend endpoint, schema, migration or RBAC change.
- No dark/light toggle (D1 ships light only; dark scheme tokens remain available).
- No new themes, no theme-engine change, no website data-contract change.
- No business-logic rewrite: hooks, services, queries, schemas and payloads keep their behaviour.

## Errors encountered

| Error | Attempt | Resolution |
|---|---|---|
| (none yet) | | |
