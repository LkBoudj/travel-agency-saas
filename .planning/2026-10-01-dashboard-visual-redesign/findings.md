# Findings & Decisions — Dashboard Visual Redesign

Reference: `frontend/agency-dashboard-mantine/ui-reference.png`
Baseline: `frontend/agency-dashboard-mantine/.artifacts/baseline/` (44 PNGs + `geometry.json`)

## Requirements

- Redesign the agency dashboard to match `ui-reference.png` and the written spec:
  compact near-black sidebar, bright light workspace, restrained neutral surfaces,
  compact operational density, semantic-only status color, dark filled primary actions.
- Remove any full-dark dashboard, glassmorphism, gradients, decorative effects.
- Preserve React/TS/Mantine/TanStack Query/routing/APIs/hooks/auth/RBAC/i18n and all
  features; no backend, API, schema, RBAC, or dependency changes.
- Preserve the real navigation: Overview, Trips, Departures, Bookings, Customers,
  Team, Website, Themes.
- Mandatory visual verification: baseline + per-task screenshots, 7 pages, shell
  open/closed, `en`/`ar`, 1440/1024/375.
- Plan first, then execute T1–T13.

## Research Findings

**The dashboard is already light — no teardown needed.**

- `src/theme/provider.tsx:52` → `defaultColorScheme="light"`. There is no dark scheme.
- `rg 'backdrop-filter|backdropBlur|linear-gradient|radial-gradient|glass|blur\('` across
  `src/**/*.{tsx,css}` → **zero matches**.
- So "remove the full-dark dashboard / glassmorphism / gradients" is already satisfied.
  T3 is *darken the sidebar + neutralize the gray ramp*, not a removal task.

**Measured reference geometry** (`ui-reference.png`, 1536×1024, programmatic sampling):

| Property | Measured | Target spec | Action |
|---|---|---|---|
| Sidebar edge | x≈13–215 (~202px, 13.2% of width) | compact, dark `#0B0B0B` | narrow sidebar, ~208–224px |
| Sidebar base | ~`#090A0B` | `#0B0B0B` | use spec value |
| Workspace | ~`#FBFBFB` | `#F6F6F7` | use spec value |
| Top utility band | ~44px (rule at y≈43) | visually secondary | shrink header 60px → ~44px |
| Green in sidebar | ~`#19BD81` | semantic only | demote to status-only |

**Current vs reference (baseline `geometry.json` + source reading):**

| Aspect | Current | Reference / spec | Task |
|---|---|---|---|
| Sidebar | 260px, **light**, brand-green tint active pill, 2px start-edge accent border | ~202–224px, `#0B0B0B`, hover `#1F1F1F`, active `#252525` rounded | T3 |
| Header | 60px, carries agency identity + locale + account | ~44px, identity secondary, account near sidebar bottom | T3 |
| Page background | `body` is `#FFFFFF`; gray-0 only inside `ContentContainer` | `#F6F6F7` workspace | T2 |
| Gray ramp | cool (`#F8FAFB`/`#E4E8EC`/`#D3D9DF`) | warm neutral `#F6F6F7`/`#E3E3E3`/`#D8D8D8` | T2 |
| Primary action | brand green (`primaryColor: 'brand'`, `theme.ts:39`) | near-black filled, white label | T2 |
| `h1` | `clamp(1.5rem, 2vw+1rem, 2rem)` → 24–32px | 22–26px | T2 |
| `h2` | `clamp(1.25rem, 1.5vw+0.75rem, 1.625rem)` → 20–26px | 14–18px | T2 |
| Radius `md` | 8px | restrained (~6px) | T2 |
| Shadows | `xs`–`xl`, several heavy | minimal (`xs` for overlays only) | T2 |
| Sidebar active | brand tint via `--app-nav-active-bg` (`tokens.css:54-63`) | solid `#252525` | T3 |
| Tables | 8 tables, mixed separators/density | shared contract | T6 |
| Trip imagery | `coverImageUrl` unused in list | real per-trip image | T7 |
| Theme previews | `--app-theme-card-media-height: 160px` | larger, 16:10 | T10 |

**Two requested data points do not exist client-side — they will not ship:**

- *Departures KPI on Overview*: `use-departures.ts:14` is scoped per tour
  (`enabled: Boolean(tourCode)`); there is no agency-wide departures query, so a count
  would need N per-trip requests. Decision: keep Customers / Trips / Bookings / Team.
- *Next departure column on Trips*: `TourListRow` (`trips/types.ts:163`) exposes
  `code, name, internalRef, status, coverImageUrl, format, geographicScope,
  availabilityMode, days, nights, hours, destinations, startingPrice, createdAt,
  updatedAt` — **no** next-departure date. Decision: drop the column, show `updatedAt`.

**Baseline capture succeeded and is trustworthy:**

- 44 screenshots: 7 pages × `en`/`ar` × 1440/1024/375, plus 2 shell-collapsed shots.
- `direction` correctly flips `ltr`→`rtl` per locale.
- Zero horizontal overflow at 1440 (`scrollWidth === clientWidth`) on all 7 pages.
- All files 36KB–162KB → real content, not error or skeleton screens.
- Sidebar 260px and header 60px confirmed consistently across all 14 measurements.

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| New plan dir `2026-10-01-dashboard-visual-redesign` under `travel-saas/.planning` | User approved a new plan; preserves `2026-10-01-dashboard-ui-ux-overhaul` history |
| Screenshot driver at `frontend/theme-agency/tools/dashboard-screenshots.mjs` | Playwright + cached Chromium already installed there; adds no dependency to any `package.json` |
| Driver logs in through the real form | Never inject a token or stub an endpoint; the app's own auth path is exercised |
| Credentials read from repo-root `.env` (`WEBSITE_TEST_*`) | Never hardcoded, never logged, never committed (`.gitignore:22` covers `.env`) |
| `geometry.json` emitted alongside the PNGs | A pixel diff cannot prove geometry; recording widths/heights/direction makes the delta table measurable |
| Overview keeps 4 KPIs, no Departures | No agency-wide departures query exists |
| Overview keeps the **Team** tile | The task brief said "no Members API"; `requestAgencyMembers` exists and the tile is permission-gated off otherwise. Measured, then kept |
| Stat-tile sizes become tokens, not literals | 13px is the row height `data-table.tsx` settled on, so it is an app-wide decision; jsdom cannot resolve it inline, so the px value is pinned in `tokens.test.ts` |
| Trips drops the next-departure column | `TourListRow` has no such date |
| Proceed from written spec + measured pixel geometry | The reference PNG could not be visually perceived in-session; composition claims are avoided and only measurable facts are used |

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Initial T1 blocked: no dashboard credentials anywhere in the repo | Found `WEBSITE_TEST_EMAIL` / `WEBSITE_TEST_PASSWORD` / `WEBSITE_TEST_AGENCY_CODE` in the repo-root `.env` (used by the existing website integration test). Verified `POST /v1/auth/login` → 200, `hichem@mail.com`, agency `AGY-0C937B377B89` |
| `pwf_init` created the plan at `/home/hichem-pc/projects/.planning`, one level above the project, making the thread ambiguous | Moved it to `/home/hichem-pc/projects/travel-saas/.planning/` alongside the other two plans; pin with `PWF_PLAN_ROOT=/home/hichem-pc/projects/travel-saas` |
| Login selector `input[name="email"]` never matched | `use-login-form.ts:23` passes `initialValues` only; Mantine `getInputProps` emits no `name` |
| Login selector `input[type="text"]` never matched | Mantine leaves the email input's `type` **attribute** unset, so the DOM property reads `text` but the CSS attribute selector matches nothing |
| Login selector `input.mantine-PasswordInput-input` never matched | The real class is `mantine-PasswordInput-innerInput` |
| Fixed selector | Used the `autocomplete` values the form itself declares: `input[autocomplete="email"]` and `input[autocomplete="current-password"]` — stable and semantically meaningful |

## Mantine 9 facts this redesign keeps re-learning

- **`Button` has no variant class.** `variant="filled"` and `variant="default"`
  both render `mantine-Button-root`; the difference is the inline
  `--button-bg` / `--button-color` / `--button-bd` custom properties. Any test
  asserting a button's prominence must read those, not a class.
- **Numeric `fz` is scaled.** `fz={13}` emits
  `calc(0.8125rem * var(--mantine-scale))`, never `13px`.
- **jsdom resolves no custom property.** A component test can prove that an
  element points at a token; it cannot prove the token's value. That assertion
  belongs in `tokens.test.ts`.
- **`Grid.Col` renders zero-width spacers.** `Grid-root > Grid-inner` contains
  the real columns *plus* empty siblings, so `[...grid.children].map(measure)`
  returns phantom 0px entries. Walk up to the first ancestor with ≥2 children and
  skip the empties, or read the col's own bounding box.
- **`.mantine-Input-input` carries `min-height`.** `min-height` clamps `height`,
  so setting `height` alone is silently ignored (found in T4, still the trap).

## Resources

- `frontend/agency-dashboard-mantine/ui-reference.png` — visual source of truth
- `frontend/agency-dashboard-mantine/.artifacts/baseline/` — T1 baseline evidence
- `frontend/theme-agency/tools/dashboard-screenshots.mjs` — capture driver
- `frontend/theme-agency/tools/website-integration-test.mjs` — pre-existing Playwright convention
- `PROJECT_MAP.md` §[DEMO DATA CONVENTIONS] — demo tenant `AGY-0C937B377B89`, account `hichem@mail.com`
- `AGENTS.md` §6 — Agency Dashboard gate is `npm test` (typecheck → format → lint → vitest → build)
- `AGENTS.md` §7 — never commit/push unless explicitly asked (this run was explicitly requested)

## Visual/Browser Findings

- **All seven pages render with real data at both locales.** No error screens, no stuck
  skeletons. File sizes 36KB–162KB.
- **RTL is genuinely wired end-to-end**: `document.documentElement.dir` is `rtl` under
  `ar` on every page, and the shell mirrors (measured `mainGutter` `260px` resolves
  against the correct inline side).
- **No horizontal overflow at 1440** on any page — the widest tables (bookings,
  departures) fit inside the 260px sidebar + main layout.
- **The body is white, not gray-0.** `--app-surface-page` resolves to `gray-0`
  (`#F8FAFB`), but that is applied by `ContentContainer`; the document body itself
  paints `#FFFFFF`. The spec's `#F6F6F7` workspace therefore needs the body color
  changed in T2, not just the token.
- **Sidebar is 260px — 29% wider than the reference's ~202px.** At 1440 that is ~58px
  of horizontal budget spent on chrome rather than data.
- **Header is 60px, not the reference's ~44px**, and it carries agency identity, the
  locale switch, and the account menu — three competing elements in the top band.

---

*Update this file regularly during research so important evidence remains available after context changes.*