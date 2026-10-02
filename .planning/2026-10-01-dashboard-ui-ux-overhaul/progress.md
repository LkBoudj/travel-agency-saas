# Progress Log — Agency Dashboard UI/UX overhaul

## Session: 2026-10-01

### Current Status
- **Plan:** 2026-10-01-dashboard-ui-ux-overhaul
- **Current task:** T2 complete → next T3 (app shell and navigation)
- **Mode:** build (approved by user; task list confirmed)

### Actions Taken

#### T2 — Design tokens and foundations (complete)

Baseline on entry: the tree already carried D1/D2/D3 (light scheme, surface tokens in
`index.css`, `Card`/`Table` defaults, rewritten `primaryShade` comment) but the gate had never been
run against it and several leftovers remained. Finished the phase:

- **Token layer extracted to `src/theme/tokens.css`** (imported by `theme/provider.tsx` after
  Mantine's stylesheets). `index.css` now styles the document element and the scrollbar only. New
  tokens: `--app-icon-danger/-brand/-success/-pending`, `--app-surface-danger`,
  `--app-border-danger`, `--app-text-danger`, `--app-nav-active-bg/-hover/-color`.
- **`glassStyle` deleted** from `dashboard-layout.tsx` (it referenced the three removed
  `--app-glass-*` vars, so the header and navbar had been rendering with undefined values).
- **Palette reach removed from 11 component files**: `teal-6` "good" markers →
  `--app-icon-success`, `gray-5` "pending" markers → `--app-icon-pending`, `red-6`/`danger-6` →
  `--app-icon-danger`, the failed-submit wash/border/label → `--app-surface-danger` /
  `--app-border-danger` / `--app-text-danger`, `gray-0` panel fill → `--app-surface-page`,
  `--nl-*` values → nav tokens, themes-card teal border → `--app-accent-border`.
- **`dimmed` re-pinned for the light scheme.** Measured, not eyeballed: Mantine's light `dimmed`
  is `gray-6` = **4.31:1** on the gray-0 page and **4.08:1** on the gray-1 sunken table header —
  both under AA. `--mantine-color-dimmed` now resolves to `gray-7` in light (7.15 / 6.77:1), via
  `cssVariablesResolver` on `MantineProvider`, added on top of Mantine's own resolver so no other
  variable changes. Dark keeps Mantine's default. This fixes all 103 existing `c="dimmed"` call
  sites without touching them.

**Measured contrast (all pairs the product renders; WCAG AA = 4.5:1)**

| pair | ratio | verdict |
|------|-------|---------|
| body text on page surface (gray-0) | 20.06:1 | pass |
| body text on raised card (white) | 21.00:1 | pass |
| `dimmed` gray-7 on white | 7.48:1 | pass |
| `dimmed` gray-7 on gray-0 page | 7.15:1 | pass |
| `dimmed` gray-7 on gray-1 sunken header | 6.77:1 | pass |
| *Mantine default `dimmed` gray-6 on gray-0* | *4.31:1* | *fail → overridden* |
| *Mantine default `dimmed` gray-6 on gray-1* | *4.08:1* | *fail → overridden* |
| primary button label white on brand-7 | 5.02:1 | pass |
| status badge success (ramp 9 on 0) | 8.49:1 | pass |
| status badge warning (ramp 9 on 0) | 7.98:1 | pass |
| status badge danger (ramp 9 on 0) | 10.43:1 | pass |
| status badge neutral (gray 9 on 0) | 15.29:1 | pass |
| failed-submit label danger-9 on danger-0 | 10.43:1 | pass |
| failed-submit icon danger-6 on danger-0 | 4.44:1 | pass as graphic (SC 1.4.11 needs 3:1) |
| focus ring brand-6 on white / gray-0 | 3.30 / 3.20:1 | pass as graphic |

**Two new guard suites**, both test-first (watched fail, then made pass):
- `src/theme/contrast.test.ts` (28 tests) — computes every ratio above from `theme/colors.ts`, so a
  palette edit that breaks AA fails the build. It also pins the resolver output (`light` dimmed =
  gray-7, `dark` untouched, Mantine's other variables intact).
- `src/theme/tokens.test.ts` (6 tests) — token discipline: every `--app-*` used in `src/` is
  declared, every foundation token exists, no component names a Mantine palette step, no raw hex
  outside the theme/user-colour allowlist, and no glass or CSS gradient survives. This is what makes
  the phase DoD mechanical instead of a grep someone has to remember to run.

**Rulings**
- The `:root` token block moved into `src/theme/` rather than staying in `index.css`, so "no palette
  variable outside `src/theme/`" is literally true for the layer itself. `index.css` keeps exactly
  two Mantine variables (`--mantine-color-body`, `--mantine-color-text`) because the plan pins the
  body colour to Mantine's own; it is the sole allowlist entry.
- The palette-discipline test bans palette *steps* (`gray-4`, `teal-6`) but not Mantine's semantic
  variables (`dimmed`, `default-hover`). Banning the semantics would have forced churn on 100+ call
  sites for no contrast gain. The hardcoded `teal-6` that the plan calls out is still caught.
- `settings-map.ts`, its test and the themes colour input keep `#000000`: that is a user-picked
  colour carried as a form value, not chrome. Allowlisted explicitly, with the reason in the test.
- `StyleGuide.page.tsx` keeps naming palettes — it is the page that documents them — but its borders
  moved to `--app-border-subtle`, and `gradientColor()` is a misleading name for a palette-step
  lookup (it returns one step, never a gradient).

### Test Results

T2 gate `npm test` (`typecheck → format:test → oxlint+stylelint → vitest → build`):
**55 test files passed | 1 skipped, 164 tests passed | 6 skipped, build ok** (exit 0).

#### T1 — UI audit + reusable component inventory (complete)

Audit performed read-only against `frontend/agency-dashboard-mantine`. No source file touched.

- **App shell** inventoried: `dashboard-layout.tsx` (AppShell header 56 / navbar 260 / padding md,
  `AppShell.Main` bare `<Outlet/>`, `glassStyle` on header+navbar); `dashboard-header.tsx`
  (agency identity + language + user menu); `dashboard-sidebar.tsx` (flat NavLink list under a
  mislabelled `t('brand')` heading, 3 ad-hoc `--nl-*` vars); `use-nav-items.ts` (8 flat
  permission-gated items).
- **Foundations** inventoried: `brand`/`gray`/`dark` + 4 semantic ramps, `STATUS_COLORS` +
  `getStatusColor`, `spacing`/`radius`/`shadows`, Fira Sans/Fira Code, `--app-heading-h1..h6`,
  `cursorType`, `focusRing`, `autoContrast`. **No surface/border layer; `Card` has no defaults.**
- **Primitives** inventoried: 20 shared exports across `src/components/**` (see `findings.md` §3).
- **Duplication** catalogued: row-actions Menu ×4, list toolbar ×3, section header ×2, loading ×3,
  `EmptyState` bypassed ×2, truncation Stack ×5+, status chip vs raw Badge ×2, stat tile ×2,
  website repeating rows ×6 (9× `style={{flex:1}}`).
- **Page-specific hacks** catalogued with exact refs (`findings.md` §5): glass vars,
  `defaultGradient`, forced dark, `body{dark-7}`, Select `styles` maxWidth hack, quick-create
  drawer `borderRadius` inline, `Box py="xl"` loader, `Text fw={600}`-as-heading, `capitalize`
  group names, raw skeleton div, hardcoded teal/danger palette vars, direction-locked icons.
- **Real defects** catalogued (`findings.md` §6): mouse-only table rows (keyboard-unreachable
  booking detail), hardcoded `minWidth={640}`, no skip link, 375px nowrap toolbar, Overview dead
  viewport + bare spinner.
- **ui-ux-pro-max** applied: `--design-system` (density 8, variance 3, motion 3) → Minimalism &
  Swiss style; its Aurora/glass + gradient suggestions rejected as constraint violations. Retrieved
  and adapted: Font Size Scale, Table Handling, Empty States, Nav Active State, Heading Hierarchy,
  Keyboard Navigation, Skip Links, Color Contrast 4.5:1, Contrast Readability, Focus Appearance,
  reduced motion. **No DB match** for RTL mirroring → codebase `useIsRtl`/`applyDocumentLocale` +
  screenshot verification instead.
- **Decisions locked with user** (D1 light surfaces, D2 keep green accent, D3 remove glass/gradient,
  D4 live Playwright screenshots) recorded in `task_plan.md`.
- **Test-risk inventory**: which existing tests assert UI structure and must be updated, not
  deleted (`primitives.test.tsx`, `overview-view.test.tsx`, `bookings-view.test.tsx`,
  `customers-table.test.tsx`, `tours-table.test.tsx`, `catalog-parity.test.ts`,
  `theme/colors.test.ts`).
- Deliverable: `findings.md` (7 sections, facts-only, every claim file:line-referenced).

### Test Results

T1 made no source change, so no gate was run. Baseline gate from the previous plan (dashboard):
`npm test` = 130 passed | 6 skipped; not re-run for T1 by design.

### Errors
| Error | Resolution |
|-------|------------|
| T2: `createTheme` rejects `cssVariablesResolver` (TS2353) | In Mantine 9 it is a `MantineProvider` prop, not a theme key. Moved it there and returned the override in the resolver's `light` bucket, which is what `convertCssVariables` selects by `data-mantine-color-scheme`. |
| T2: contrast test calling the resolver threw `Cannot read properties of undefined (reading 'toString')` | `defaultCssVariablesResolver` expects the merged theme (`theme.scale` et al.). The test now merges `DEFAULT_THEME` under the app theme the way `MantineProvider` does. |

## T3 — App shell and navigation (complete)

**Shipped**
- `AppShell padding="0"`; header 56→60; `borderBottom` on the header and `borderInlineEnd` on
  the navbar, both `var(--app-border-subtle)` — one logical hairline per edge, no glass.
- Navbar gutter moved to the navbar (`p="md"`); the sidebar stack no longer pads a second time,
  so section labels and link labels both start at 24px and the header logo lines up with them.
  Header `px` is `sm` on mobile, `lg` on desktop.
- `use-nav-items.ts` now returns `useNavGroups()`: the same 8 destinations and the same
  `can()` permission filter as before, grouped into Workspace · Operations · Team · Online
  presence. Empty groups are dropped rather than left as a bare label.
- Active item = `--app-nav-active-bg` surface + `fw={500}` + 2px `borderInlineStart` indicator,
  reserved as `transparent` when inactive so labels do not shift. Group gap 4→2.
- `<nav aria-label>` landmark around the sidebar; prefix-matched active state, so a detail route
  (`/bookings/BKG-…`) keeps its section highlighted — the old equality check meant *no* nav item
  was ever active on a detail page.
- Skip link is the first focusable element in the document, `href="#main"`, off-screen via
  `.skip-link` (`inset-inline-start: -9999px`, revealed on `:focus-visible`, RTL-correct).
  `AppShell.Main` gets `id="main" tabIndex={-1}` so the fragment target can take focus.
- New `src/components/content-container.tsx`: the single place a page's gutter and width cap
  (`maw="90rem"`, centred) live, with a `maw` opt-out for wide tables.
- Removed the dead `brand` product-name key from both catalogs — the plan's "misleading
  `t('brand')` label" was already gone from the markup; the leftover entry ("Travel Desk") is
  what kept suggesting a product name the app does not have.

**Ruling: the active nav label was invisible.** The old tokens painted the active label
`--mantine-color-brand-0` (#F0FDF4) on an 18% `brand-5` wash over white — **1.11:1**. Now the
label keeps Mantine's active colour (`brand-9`, **8.17:1** on `#e8f6ed`, 7.42:1 on the hover
tint) and only the surface is branded. The tints are solid `color-mix`es, not translucent, so
they read the same over any navbar background.

**Also dropped** `--app-nav-active-color` from `theme/tokens.css` rather than re-pointing it:
with the label no longer inverted, the token had no job.

**Tests** — `dashboard-sidebar.test.tsx` (9) and `dashboard-layout.test.tsx` (3), plus
`content-container.test.tsx` (3). All written before the implementation and RED for the right
reasons first: no `navigation` landmark, no group labels, no `data-active`, no `#main`.
Covered: section labels en+ar, every link under its owning section, whole-group drop on no
access, partial-access sections kept, active on index and detail routes, inactive siblings,
agency-scoped hrefs, skip link first/anchored/on-focus-revealed, `tabIndex={-1}` on `<main>`.

**Gate** — `npm test` EXIT 0: `58` files passed / `1` skipped, `179` tests passed / `6` skipped.

**Journey** — `src/app/layouts/dashboard-layout.tsx` · `dashboard-header.tsx` ·
`dashboard-sidebar.tsx` · `hooks/use-nav-items.ts` · `src/components/content-container.tsx` ·
`src/index.css` · `src/theme/tokens.css` · `src/i18n/locales/{en,ar}/common.json`

**Next** — T4 overview redesign.

## T4 — Overview redesign (complete, one DoD item carried to T9)

**Shipped**
- `KpiCard` promoted to `src/components/stat-card.tsx` and deleted from the feature: 12px
  uppercase label → 30px tabular value → 12px sub, muted icon tile, hairline, no shadow, plus the
  `compact` variant T5 needs. Shared now, so the pricing strip and the list views use the same
  number treatment instead of each inventing one.
- `useOverviewPage` is composition only and now owns the decisions: `quickActions`
  (permission-gated, navigation-only), `site` (draft slug + published state) and 8 recent
  bookings instead of 5. `useAgencyMembers` was called with a stray third argument; fixed to its
  real `(search, enabled)` signature.
- `OverviewView` is layout only, wrapped in `ContentContainer`: header (quick actions + View
  website), the KPI band, then a second band of recent bookings (8/12) beside a new
  `SiteStatusCard` (4/12).
- Loading draws skeleton rows rather than a centred `Loader`; a loading table with zero rows reads
  as "no data" when it means "not yet".
- `DataTable` gained `loadingRows` (default 5) so a table reserves as many placeholder rows as it
  will hold; `BookingsTable` forwards it.

**Ruling: the quick actions navigate, they do not create.** The plan says navigation-only and it
is the right call — an overview shortcut that opened a create dialog on a page with no form would
be a lie about what the button does. They take the member to the list where the work happens.

**Site status reads the same queries `useViewWebsite` already fires** (same query keys), so the
card adds no request of its own, and it stays read-only: publishing belongs on the Website page.

**Tests** — `overview-view.test.tsx` (11, rewritten not deleted) plus 6 `StatCard` cases in
`components/primitives.test.tsx`. RED first for: quick actions absent, spinner instead of
skeletons, no site card, no Arabic section label.

**Gate** — `npm test` EXIT 0: `58` files passed / `1` skipped, `193` tests passed / `6` skipped.

**Carried to T9** — the DoD item "no vertical gap > ~120px below the last section at 1440×900 with
the seeded data" needs a rendered page with real data, so it is verified in T9's screenshot pass
rather than claimed here.

**Journey** — `features/overview/components/{overview-view,site-status-card}.tsx` ·
`features/overview/hooks/use-overview-page.ts` · `components/{stat-card,data-table}.tsx` ·
`features/bookings/components/bookings-table.tsx` · `i18n/locales/{en,ar}/dashboard.json`

**Next** — T5 shared data-list/table pattern.

## T5 — Shared data-list/table pattern — complete

**Shared layer (new `src/components/`)** — `data-toolbar.tsx` (search start, filters/actions end, one
spacing contract), `row-actions-menu.tsx` (the `Menu`/`ActionIcon` shell every list rebuilt, with a
tooltip *and* `aria-label` so the ellipsis is never unnamed, plus an optional per-row label),
`section-header.tsx` (`h2` + description + actions + trailing count), `table-skeleton.tsx`,
`cell-stack.tsx` (now with `primaryProps`/`secondaryProps` for the cells that need a monospaced code
or a right-aligned figure).

**`DataTable`** — per-table `minWidth` (980 trips / 880 bookings / 820 customers / 900 departures /
760 pricing, down from a blanket 640), `stickyHeader` (offset by the new `--app-header-height` token
so a sticky cell cannot slide behind the shell header), `skeletonRows` (renamed from `loadingRows`,
which T4 had introduced and T5 immediately outgrew), `caption` + `aria-label`, and Enter/Space row
activation with a real Space-key test — the test that claimed to press Space was clicking.

**Migrations** — all five list tables on `CellStack` + `RowActionsMenu` + per-table caption/minWidth/
skeletonRows; trips/bookings/customers views on `ContentContainer` + `DataToolbar` +
`SectionHeader`; departures/pricing managers on `SectionHeader` with a count beside the title;
`EmptyState compact` in the two panels that bypassed it (departures, pricing); the departures view's
hand-written availability `<Badge>` folded into `StatusBadge mode`; Customers gained the status
filter its siblings have as a client-side predicate in `lib/customer-filter.ts` — the query has no
status parameter and still does not, so the filter cannot invent rows.

**Result counts** come from the array already in hand (`t('list.results', { count })`), never a
separate count query. Arabic needed the full plural family — `results_two`/`_few`/`_many` — or a count
of 2 fell through to `other` and read "2 نتائج".

**Found and fixed: `tabular-nums` was never applied.** Passed as a JSX attribute it is silently
dropped (verified in the DOM: computed `font-variant-numeric` stayed `normal`), so every "tabular"
figure — stat cards, money, seats, capacity, priced counts — reflowed as it changed, which is the
exact problem the attribute was added for. Now `style={{ fontVariantNumeric: 'tabular-nums' }}`, the
form the style guide already showed. Five files.

**Tests** — new `data-table.test.tsx` (14), `row-actions-menu.test.tsx` (5), `section-header.test.tsx`
(6), `data-toolbar.test.tsx` (5), `table-skeleton.test.tsx` (4); new
`departures-manager.test.tsx` (6) and `pricing-manager.test.tsx` (5) for two panels that had no tests
at all; `customer-filter.test.ts` (4); `primitives.test.tsx` grew `StatusBadge mode`, `EmptyState
compact` and `CellStack` cases. Nothing deleted.

**Gate** — `npm test` EXIT 0: `66` files passed / `1` skipped, `247` tests passed / `6` skipped; build
succeeded.

**Carried to T8** — `members-table`/`invitations-table` still hand-roll the row-action shell and
`members-view` still wraps its lists in `Card p="xs"`. Outside T5's declared file list, so recorded
rather than refactored under it.

**Next** — T6 Website page UX.

## 2026-10-01 — T6 Website page UX complete

**Shipped**
- `lib/website-dirty.ts` — pure recursive comparison of form values against
  `websiteToFormValues(draft)`: strings compare trimmed, object key order is
  irrelevant, array order is significant. 10 unit tests.
- `components/repeating-rows.tsx` — `RepeatingRow` (Mantine grid, remove control
  as its own column) plus `TrustPointRow`, `TestimonialRow`, `NavigationLinkRow`,
  `FooterColumnRow`, `FooterLinkRow`, `FooterLegalRow`. Replaces 9
  `style={{ flex: 1 }}` / percentage-width hand-tuned rows.
- `components/website-view.tsx` — sticky bottom save bar (`.app-sticky-save-bar`
  in `index.css`) with the dirty indicator, `SectionHeader` per tab,
  `FormErrorSummary`, header cluster: View (light) + Publish (filled) as actions,
  status badge + slug as tertiary metadata under the title via the new
  `PageHeader meta` slot.
- Sections migrated to the shared rows; `EmptyState compact` for every empty
  list (trust points, testimonials, navigation, footer columns, footer legal,
  featured tours).
- i18n: `empty.{trustPoints,footerColumns,footerLegal,noFeaturedToursTitle}`,
  `tabHints.*`, `saveBar.{unsaved,upToDate}` in en + ar.
- `vitest.setup.mjs`: `document.fonts` stub — jsdom has no `FontFaceSet`, so any
  test rendering Mantine's `autosize` Textarea threw on mount.

**Verification** — `npm test` green: 69 files passed / 1 skipped,
275 tests passed / 6 skipped; typecheck, format, lint, build clean.
Diff review: all 14 field paths, all insert/remove list paths, the zod schema,
`use-website-form`, `website-validation` and the website API are byte-identical;
zero inline style objects and zero `style={{ flex: 1 }}` left in
`features/website/components`.

## 2026-10-01 — T7 Themes page UX complete

**Shipped**
- New `components/theme-state-badge.tsx` — one renderer for `ThemeCardState`,
  replacing three hand-written `<Badge>`s that picked Mantine stock `teal`/
  `yellow`. Now `brand` (current, filled), `success` (live, light) and `warning`
  (not published, light), matching `STATUS_COLORS`; `tt="none"` so Arabic labels
  are not uppercased.
- `theme-card.tsx`: `data-current` hook, one `space-between` footer row holding
  version + state so cards align across the grid, action hierarchy
  Activate = `filled` (not current only) · Customize = `light` (current only) ·
  Preview = `subtle` (always), media height from `--app-theme-card-media-height`.
- `themes.page.tsx`: skeleton cards instead of a bare `Loader`, `EmptyState` for
  an empty catalog, grid `spacing="md"`, publish/pending notices unchanged.
- `schema-settings-renderer.tsx`: group headings resolve `settings.group.<group>`
  (settings namespace now requested so it resolves) with a humanized fallback
  instead of `tt="capitalize"`.
- i18n: `settings.group.{layout,brand,homepage}` (en + ar),
  `themes.emptyCatalogTitle` (en + ar).
- New tests: `theme-state-badge.test.tsx` (6), `theme-card.test.tsx` (7),
  `themes.page.test.tsx` (6) — all written RED first.

**Verification** — `npm test` green: 72 files passed / 1 skipped,
294 tests passed / 6 skipped; typecheck, format, lint, build clean.
DoD: no raw `themes.*`/`settings.*` key in en or ar (asserted), no hardcoded
palette in `theme-card.tsx` (asserted by grep), `lib/theme-card-state.ts` and its
tests untouched and green, so the Activate → Current → Pending-publish flow is
unchanged.


## 2026-10-01 — T8 responsive + RTL + accessibility complete

**a11y / RTL checklist (per-item evidence)**

| # | Item | Evidence |
|---|------|----------|
| 1 | Skip link is the first focusable thing and returns on focus | `app/layouts/dashboard-layout.test.tsx` — "offers a skip link as the first link a keyboard reaches", "hides off-screen and returns on focus, staying focusable" |
| 2 | Global focus ring on every focusable surface | `index.css` `:focus-visible { outline: 2px solid var(--app-focus-ring) }` (`trip-editor-layout.test.ts` reads the same file) |
| 3 | Focus never parks behind the sticky save bar | New `index.css`: `--app-sticky-save-bar-clearance: 76px` + `scroll-padding-block-end` on `html, .mantine-AppShell-main`; asserted by new `features/website/components/sticky-save-bar.test.ts` (3 tests) |
| 4 | Table rows are keyboard-operable, not mouse-only | `components/data-table.tsx` gives a clickable row `tabIndex={0}` + `onKeyDown` activation; carried from T5 |
| 5 | Every `ActionIcon` has an accessible name | Audit sweep over `src/**/*.tsx`: no unnamed `ActionIcon`; the member row shells now use `RowActionsMenu`, whose trigger is named by its tooltip in both locales |
| 6 | Sequential `h1 → h2` on every page | `MembersView` now two `SectionHeader` h2s (`membersTitle`/`invitationsTitle`, en+ar) and no `Card p="xs"` wrappers; booking detail's three uppercase card titles and the travelers title are real `Title order={2}`; each Themes catalog card name is an h2. Tours/Bookings/Customers/Departures/Pricing already had `SectionHeader` h2s from T5 |
| 7 | Reduced motion honoured on the overlays | `theme/component-defaults.ts` `overlayTransition()` zeroes `duration` for `Modal`/`Drawer` under `(prefers-reduced-motion: reduce)`; new `component-defaults.test.ts` re-imports the module behind a mocked `matchMedia` and asserts 150 vs 0 |
| 8 | Physical → logical properties | `ta="right"`→`ta="end"` (bookings, departures, booking detail), `ml`→`ms` (travelers), `pl`→`ps` (trip editor back, website footer). Grep for `\b(pl|pr|ml|mr)\b=|ta="left"|ta="right"|textAlign: '(left|right)'` over `src/**/*.tsx` returns nothing |
| 9 | Directional icons mirror in RTL | `StatCard` chevron, `DeparturesView` back button and `BookingDetailsView` back link all read `useIsRtl()` and swap `IconChevronRight`/`IconArrowLeft`; covered by `components/stat-card.test.tsx` and `features/departures/components/departures-view.test.tsx` |
| 10 | Mantine section props are already logical | Mantine maps `leftSection` → `--input-padding-inline-start` (`@mantine/core/styles.css`), so the many `leftSection` icons mirror without touching them — recorded rather than changed |
| 11 | 375px: no page-level horizontal scroll | Tables scroll inside `Table.ScrollContainer` (minWidth 640/760/880); the Trip editor's three columns now wrap below 62em via `.app-editor-columns` + responsive `w={{ base: '100%', md: 190/290 }}` — asserted by `features/trips/components/trip-editor-layout.test.ts` |
| 12 | Narrow-viewport stacking elsewhere | Remaining fixed widths are all inside scroll containers or capped by `w="100%"`/`maw` (login 440, agency chooser 560, failure screen 440, editor shell `maw={1240}`); no list toolbar pins a control on one line |

**Shipped**
- Members page: `RowActionsMenu` replaces the hand-rolled `Menu`/`ActionIcon`
  shell in `members-table.tsx` and the bare revoke `ActionIcon` in
  `invitations-table.tsx`; palettes are now `brand` / `warning` / `success` /
  `danger` instead of `blue` / `orange` / `teal` / `red`; the view composes
  `SectionHeader` + `DataToolbar` + `SearchInput` and drops both `Card p="xs"`
  wrappers.
- i18n: `members.membersTitle` (en + ar).
- New tests, all written RED first: `component-defaults.test.ts` (2),
  `stat-card.test.tsx` (2), `departures-view.test.tsx` (1),
  `members-table.test.tsx` (8), `members-view.test.tsx` (3),
  `booking-details-view.test.tsx` (1), `sticky-save-bar.test.ts` (3),
  `trip-editor-layout.test.ts` (2), plus a headings case in
  `themes.page.test.tsx`.

**Verification** — `npm test` green: 80 files passed / 1 skipped,
317 tests passed / 6 skipped; typecheck, format, lint, build clean.
No API, hook, schema or query change in this phase.

## 2026-10-01 — T9 closed without the visual pass

The user closed the task after T8. Not done, stated plainly:

- **No Playwright screenshots.** The dev server (`:5175`), backend (`:3000`) and
  theme-agency (`:4321`) were running and chromium was cached, but no driver was
  written and no PNG was captured — so **no page has a visual, contrast or
  density proof** at 1440/1024/375, in en + ar, with the shell open/closed, a
  focused row or a form-error summary. Every contrast and density claim made in
  T1–T8 rests on the token math and the jsdom tests, not on a screenshot.
- **Done instead:** `PROJECT_MAP.md` gained a `[DASHBOARD DESIGN SYSTEM]` section
  describing the tokens, palette vocabulary, shell and shared list primitives
  that actually exist, so the architecture map matches the code.
- Last full gate before closing: `npm test` green — 80 files passed / 1 skipped,
  317 tests passed / 6 skipped.
