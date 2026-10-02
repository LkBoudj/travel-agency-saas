# Progress Log

Use this file as the chronological record of work performed, files changed, validation results, and errors.

## Session: [DATE]

Replace `[DATE]` with the date of this work session.

### Phase 1: [Title]

- **Status:** in_progress
- **Started:** [timestamp]
- Actions taken:
  -
- Files created/modified:
  -

Use the same status values as `task_plan.md`: `pending`, `in_progress`, or `complete`. Add concrete actions and paths as the phase advances.

### Phase 2: [Title]

- **Status:** pending
- Actions taken:
  -
- Files created/modified:
  -

## Test Results

Record each validation command or scenario, its expected result, and the observed outcome.

| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
|      |       |          |        |        |

## Error Log

Record errors promptly, including the attempt number and resolution. Change the approach before retrying a failed action.

| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
|           |       | 1       |            |

## 5-Question Reboot Check

Use this table when resuming to confirm the current phase, destination, goal, findings, and completed work.

| Question | Answer |
|----------|--------|
| Where am I? | Phase X |
| Where am I going? | Remaining phases |
| What's the goal? | [goal statement] |
| What have I learned? | See findings.md |
| What have I done? | See above |

---

*Update this file after completing a phase, running validation, or encountering an error.*

## T2 — Semantic tokens + light workspace (complete)

Wrote the assertions first (RED: 19 failing in `contrast.test.ts`), then implemented
(GREEN: 58/58 in `src/theme/`).

| Change | File |
|---|---|
| Warm neutral gray ramp, ≤2/255 channel spread asserted | `theme/colors.ts` |
| New `ink` palette; `primaryColor: 'ink'`, shade 8 | `theme/theme.ts` |
| Radius `md` 8px→6px, whole ramp ≤8px | `theme/radius.ts` |
| Shadows neutral (`rgba(0,0,0,…)`), ≤12% alpha | `theme/shadows.ts` |
| Nav rail tokens, neutral focus ring, `h1`≤26px / `h2`≤18px | `theme/tokens.css` |
| Document body paints `--app-surface-page` | `index.css` |
| Sidebar consumes the new nav tokens, drops the brand-tint pill and accent border | `app/layouts/dashboard-sidebar.tsx` |
| `tokens.css` added to the hex allowlist (the rail has no Mantine palette behind it) | `theme/tokens.test.ts` |

In-browser verification (Playwright, live dev server):

| Probe | Before | After |
|---|---|---|
| document body | `rgb(255,255,255)` | `rgb(246,246,247)` |
| filled button bg / label | green `#15803D` / white | `rgb(26,26,26)` / white |
| button radius | 8px | 6px |
| card border | `#E4E8EC` | `rgb(227,227,227)` |
| `h1` | 32px | 26px |

Gate: `npm test` — 80 files passed / 1 skipped, 335 tests passed / 6 skipped
(+18 new), build clean. Screenshots: `.artifacts/t2-tokens/` (44).

Conflict resolved: spec tertiary text `#8A8A8A` measures 3.45:1 on white and fails
AA, so it is confined to the dark rail (5.7:1 there) and to non-text graphics.
Light-surface tertiary text uses `gray-7`, with size and weight carrying hierarchy.

Deferred to T3: the rail is still light; the nav tokens exist but nothing paints
`--app-surface-nav` until the shell is restructured.


## T3 — AppShell / sidebar / top utilities (complete)

Tests first: 11 of the new `dashboard-layout.test.tsx` cases failed, then passed.

| Change | File |
|---|---|
| Rail 260px → `--app-rail-width` 220px, `[data-shell-nav]` paint, flex column | `app/layouts/dashboard-layout.tsx`, `index.css` |
| Active item = `#252525` fill + white label; accent border removed | `app/layouts/dashboard-sidebar.tsx` |
| New `SidebarFooter`: agency identity, locale, account, roles, switch/sign out | `app/layouts/sidebar-footer.tsx` |
| `use-dashboard-header.ts` → `use-sidebar-footer.ts` (controller renamed to match its only consumer) | `app/layouts/hooks/` |
| Header = 44px, route-derived breadcrumb + burger only | `app/layouts/dashboard-header.tsx` |
| `useActiveNavLocation()` — longest-prefix nav match, `null` off-nav | `app/layouts/hooks/use-nav-items.ts` |
| `shell.breadcrumb`, `shell.openAccount` | `i18n/locales/{en,ar}/common.json` |

Live-browser verification:

| Probe | Before | After |
|---|---|---|
| rail width | 260px | 220px |
| rail background | `rgb(255,255,255)` | `rgb(11,11,11)` |
| rail border-inline-end | `#E4E8EC` | `rgb(31,31,31)` |
| header height | 60px | 44px |
| header contents | icon + agency + code + locale + account | breadcrumb only |
| active item fill / label | brand tint / brand-9 | `rgb(37,37,37)` / white |
| `h1` count per page | 1 | 1 |

Gate: `npm test` — 80 files passed / 1 skipped, 345 tests passed / 6 skipped
(+10), build clean. Screenshots: `.artifacts/t3-shell/` (44), rail 220 / header 44
on all 14 page-locale pairs, no overflow.

Decision: Mantine's `NavLink` active colour is derived from the primary palette,
which is now near-black, so it would be invisible on the dark rail. Active and
hover states are therefore set explicitly from `--app-nav-*`.


## T4 — Shared primitives (complete)

Tests first: 5 of the new `panel.test.tsx` cases failed, then passed.

| Change | File |
|---|---|
| New `Panel`: white, 1px gray-3 hairline, 6px radius, no shadow | `components/panel.tsx`, `index.css` |
| Shared empty/error copy translated instead of hardcoded English | `components/empty-state.tsx`, both `common.json` |
| One control height: 32px controls, 26px row triggers | `theme/component-defaults.ts`, `theme/tokens.css` |
| 9 generic `Card withBorder` containers → `Panel` | 4 feature components |

Three findings worth keeping, all caught by measuring rather than reading:

1. **`theme.components.X.sizes` no longer exists in Mantine 9.** `createVarsResolver`
   is now the identity function and `MantineThemeComponent` is only
   `classNames`/`styles`/`vars`/`defaultProps`, so a named size cannot be declared
   in the theme at all. The height is pinned through `styles` instead.
2. **The height is not on the same slot everywhere.** On `Button`/`ActionIcon` the
   root *is* the control; on a text input the root is a wrapper around a separate
   `input` element (`Input` declares `rootSelector: "wrapper"`). Pinning the
   wrapper alone produced a 32px box around a 36px input.
3. **`.mantine-Input-input` carries `min-height: var(--input-height)`.**
   `min-height` clamps `height`, so the inline `height` was silently ignored and
   the field stayed 36px until `minHeight` was set alongside it. jsdom would not
   have caught this — it computes no styles.

Also: pinning `sm` on `ActionIcon`'s root flattens *every* size to the control
height, including `compact-sm`. The row trigger therefore keeps
`size="compact-sm"` for Mantine's padding and font scale and sets its box from
`--app-control-height-compact` (26px, equal to Mantine's own `1.625rem`).

Verified live on Trips, Departures, Customers, Bookings, Overview:

| Probe | Value |
|---|---|
| input / wrapper / select / button height | 32 / 32 / 32 / 32 |
| row trigger box | 26 × 26 |
| inputs overflowing their wrapper | 0 |
| panel | white, `1px solid rgb(227,227,227)`, 6px, `box-shadow: none` |
| page errors | none |

Gate: `npm test` — 81 files passed / 1 skipped, 358 tests passed / 6 skipped
(+13). Screenshots: `.artifacts/t4-primitives/` (44); rail 220 / header 44 / no
overflow on all 14 page-locale pairs.


## T5 — Overview (complete)

Tests first: all six new `overview-view.test.tsx` cases failed for the right
reason, then passed. Two earlier drafts of two of them failed for *test* reasons
(a regex that also matched "Open Bookings", and an ambiguous `getByText('5')`
that matched a value and its sub-line) — fixed before counting the RED.

| Change | File |
|---|---|
| Tiles switched to `compact` (dense anatomy); grid `cols={{ base: 2, lg: 4 }}` + `data-testid="kpi-tiles"` | `features/overview/components/overview-view.tsx` |
| Header keeps one action — the first shortcut, `variant="filled"`; the rest in a `quick-actions` row below | `features/overview/components/overview-view.tsx` |
| Header `ViewWebsiteButton` removed — the site panel already offered it | `features/overview/components/overview-view.tsx` |
| Bookings/site split 8/4 → 9/3 | `features/overview/components/overview-view.tsx` |
| `--app-tile-label-size: 0.8125rem` / `--app-tile-value-size: 1.5rem` | `theme/tokens.css` |
| `StatCard` label 12px → token; compact value 24px literal → token | `components/stat-card.tsx` |
| `data-page-actions=""` → `data-testid="page-actions"` (uncommitted scaffold from the previous session) | `components/page-header.tsx` |
| `data-testid="site-status"` | `features/overview/components/site-status-card.tsx` |
| New token-anatomy pin | `theme/tokens.test.ts` |

Live-browser verification (`.artifacts/t5-overview/`, 6 PNGs +
`t5-measurements.json`; en + ar at 1440 and 375):

| Probe | Value |
|---|---|
| tile label / value | `13px`/`600` over `24px`/`600` |
| tile columns | 4 at 1440, **2** at 375 |
| header action count | 1 — `rgb(26,26,26)` fill, `rgb(255,255,255)` label |
| shortcut row | 3 buttons, all `rgb(255,255,255)` |
| bookings / site widths | `888` / `288` of `1188` = **9/3** |
| tile + site panel background | `rgb(255,255,255)`, hairline `rgb(227,227,227)` |
| horizontal overflow | 0 at 1440 and 375, both locales |

Gate: `npm test` — 81 files passed / 1 skipped, 365 tests passed / 6 skipped
(+7), build clean.

### Three findings worth keeping

1. **Mantine 9 has no `Button` variant class.** A `variant="filled"` button
   carries `mantine-Button-root` and nothing else; the variant lives entirely in
   the inline custom property `--button-bg`. `toHaveClass('mantine-Button-filled')`
   therefore fails against a correct implementation. The primary-action test
   asserts `--mantine-color-ink-filled` instead — the property that actually
   paints it.
2. **`fz={13}` does not produce `font-size: 13px`.** Mantine scales numeric font
   sizes, so it emits `calc(0.8125rem * var(--mantine-scale))`. jsdom cannot
   resolve a custom property either, so a component test can only assert that
   the tile *points at* a token; `tokens.test.ts` is where 13px and 24px are
   actually enforced. Two pins, one number.
3. **Two of this task's premises were false** (see `task_plan.md` → T5): a
   Members API does exist, and no brand-green wash ever existed on the site
   card. Measured rather than assumed, in both directions.

## Follow-up: retired apps removed from root docs

`e7f8bef` deleted `frontend/dashboard/` (shadcn SPA) and `frontend/storefront/`
(Next.js prototype). Both were confirmed retired by the user — a superseded
approach, not an accident. That left the repo's own agent instructions pointing
at directories that no longer exist, which breaks the "never invent files or
paths" invariant for every future session.

Fixed in a forward commit (no history rewrite):
- `AGENTS.md` — dropped the two apps from the topology tree and from §2, removed
  their verification-script lines, retargeted the `workdir` example to
  `frontend/agency-dashboard-mantine`, and marked the removals as "do not
  recreate".
- `PROJECT_MAP.md` — removed the app entries and their tech-stack lines,
  corrected `scripts/dev-all.mjs` ports (dashboard :5173 and storefront :3001
  no longer start), and repointed the Customers / Tours / Bookings feature
  sections from `frontend/dashboard` to `frontend/agency-dashboard-mantine/src/features/*`,
  which is where those features actually live.

Every surviving mention of the two paths is now explicitly a REMOVED/historical
note rather than an existence claim.

Two things left deliberately: the `explorer` theme id and the
`scripts/dev-all.mjs` commented-out blocks for the deleted apps are retained as
historical record, not as instructions to rebuild.
