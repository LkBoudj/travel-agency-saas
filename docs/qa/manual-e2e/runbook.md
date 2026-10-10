# Manual E2E Runbook — Agency Dashboard

## Services
- Backend: `http://localhost:3000` (REST `/v1`, Swagger `/docs`)
- Dashboard: `http://localhost:5175`
- Admin (optional): `frontend/admin` (if used for agency creation)

## Prerequisites
- Services running (use existing running instances). Do not start unrelated apps unless necessary.
- Platform admin or existing account for agency creation (decide per env). Fresh browser context recommended per run (clear storage/cookies).

## Agency Creation Path Decision
- Inspect `frontend/admin` agencies UI and `frontend/agency-dashboard-mantine` auth/onboarding.
- Choose realistic path for creating throwaway agency + owner.
- Record chosen path + fallback in this section.

**Chosen path:** _TBD (document when performing run)_
**Fallback:** _TBD_

## Create Agency + Owner (Fresh Start)
1. Open chosen path.
2. Create throwaway agency with unique code/name; create owner (email+password). **Do not reuse real data.**
3. Sign in as owner at `/login` (dashboard).
4. Land on agency shell for that code. Confirm sidebar shows permitted items only.
5. Capture agency context: `GET /v1/agencies/:code/me` (via network/devtools if available) and permissions.
6. Log in `test-log.md`: Date/Time, Page (Auth/Chooser), Action, Status, Observed, Expected, Notes (include agency code, path used).

## Route Map (from routes.tsx)
- `/login` — GuestOnly, AuthLayout (LoginPage)
- `/modes` — Auth required, AgencyChooserPage
- `/:agencyCode` — RequireAuth + RequireAgency + DashboardLayout
  - `overview` (index -> redirect)
  - `members` — permission `AGENCY_MEMBER_VIEW`
  - `customers` — permission `AGENCY_CUSTOMER_VIEW`
  - `trips` — permission `AGENCY_TOUR_VIEW`
  - `trips/:tourCode` — permission `AGENCY_TOUR_VIEW`
  - `departures` — permission `AGENCY_DEPARTURE_VIEW`
  - `bookings` — permission `AGENCY_BOOKING_VIEW`
  - `bookings/:bookingCode` — permission `AGENCY_BOOKING_VIEW`
  - `website` — permission `AGENCY_WEBSITE_VIEW`
  - `themes` — permission `AGENCY_WEBSITE_VIEW`
  - Dev-only: `/styleguide`

## Testing Order
Auth → Agency Chooser → Overview → Members → Customers → Trips → Departures+Pricing → Bookings+Travelers → Website/Themes → Settings

## Known Assumptions
- Backend guards authoritative; UI guards may hide actions (UX only).
- Content vs theme settings separation enforced server-side.
- Publish/readiness, departure cancel (one-way), booking confirm gated by traveler manifest — verify against server behavior.
- Arabic/RTL spot-check at least one dense form/table.