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

