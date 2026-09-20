/**
 * Backend departure contracts, mirrored from `backend/src/departures`.
 *
 * A departure is one scheduled occurrence of a tour. It never carries an
 * agency or a database id on the wire: it is scoped by the route's
 * `:agencyCode` + `:tourCode`, and its only stable external key is the
 * backend-generated `code` (`DEP-...`).
 *
 * Statuses are the backend's uppercase vocabulary, used directly by the UI
 * (like `CustomerStatus`) — no lowercase read model for a two-state enum.
 * `CANCELLED` is terminal: it moves only through the cancel action and can
 * never be edited back.
 */
export type DepartureStatus = "OPEN" | "CLOSED" | "CANCELLED"

/** One scheduled occurrence, from `GET .../tours/:tourCode/departures`. */
export type AgencyDeparture = {
  code: string
  status: DepartureStatus
  startAt: string
  endAt: string
  capacity: number
  bookingDeadline: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/** The writable operational fields, shared by create and update. */
export type DeparturePayload = {
  startAt: string
  endAt: string
  capacity: number
  bookingDeadline: string | null
  notes: string | null
}

/** Update also carries the departure status; create always lands OPEN. */
export type DepartureUpdatePayload = DeparturePayload & {
  status: DepartureStatus
}

/** Presentation keys for departure statuses, resolved through i18next. */
export const DEPARTURE_STATUS_LABELS: Record<DepartureStatus, string> = {
  OPEN: "trips:departureStatus.open",
  CLOSED: "trips:departureStatus.closed",
  CANCELLED: "trips:departureStatus.cancelled",
}