# Manual End-to-End QA — Agency Dashboard (Mantine)

## Goal
Conduct a real, page-by-page manual end-to-end test of the Agency Dashboard starting from scratch: create a new agency + owner, sign in, and verify every screen, form, action, and guard. Capture exact steps, observed vs. expected, status (PASS/WARN/FAIL/BLOCKED), and bugs.

## Scope
- Apps: `frontend/agency-dashboard-mantine` (dashboard), `backend` (API), optional `frontend/admin`.
- Environment: backend `http://localhost:3000`, dashboard `http://localhost:5175`.
- Start condition: throwaway agency + fresh owner. No production data.
- Coverage: auth, agency chooser, overview, members/invitations, customers, trips, departures+pricing, bookings+travelers, website/themes, settings. Guards and permissions across all.

## How to run
1. Run environment check (`env-check.md`).
2. Start services (per `runbook.md`).
3. Create fresh agency + owner via chosen path; record in `test-log.md`.
4. Work page-by-page using `checklist-template.md` for each page (artifacts under `pages/`).
5. Log every action in `test-log.md`. File deviations in `bugs.md`.
6. Do not change code. Artifacts only.

## Artifacts
- `README.md` — this file
- `runbook.md` — setup, agency creation path, route map, assumptions
- `checklist-template.md` — reusable page checklist template
- `env-check.md` — services health, ports, CORS, cookies
- `test-log.md` — timestamped test entries
- `bugs.md` — bug tracker
- `pages/*.md` — per-page filled checklists (auth, agency-chooser, overview, members, customers, trips, departures-pricing, bookings-travelers, website-themes, settings)

## Constraints
- No code changes, no schema/migrations, no dependency installs.
- No pushing/merging; local artifacts only.
- Backend guards are authoritative (UI allow vs backend reject must be logged).
- Factual notes: observed vs expected. No fabricated data.