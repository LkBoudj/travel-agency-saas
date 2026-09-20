import { useTranslation } from "react-i18next"
import { TRIP_STATUS_LABELS, type TripStatus } from "../types/trip.types"
import {
  DEPARTURE_STATUS_LABELS,
  type DepartureStatus,
} from "../types/departure.types"

type TripStatusBadgeProps = { status: TripStatus }

const tripStatusTones: Record<TripStatus, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  published: "border-primary/15 bg-primary/10 text-primary",
  archived:
    "border-border bg-muted text-muted-foreground line-through decoration-muted-foreground/50",
}

const tripStatusDots: Record<TripStatus, string> = {
  draft: "bg-muted-foreground",
  published: "bg-primary",
  archived: "bg-muted-foreground",
}

/** Compact pill badge for trip lifecycle status. */
export function TripStatusBadge({ status }: TripStatusBadgeProps) {
  const { t } = useTranslation()

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs leading-none font-medium ${tripStatusTones[status]}`}
    >
      <span
        className={`size-1.5 shrink-0 rounded-full ${tripStatusDots[status]}`}
        aria-hidden
      />
      {t(TRIP_STATUS_LABELS[status])}
    </span>
  )
}

type DepartureStatusBadgeProps = { status: DepartureStatus }

const departureStatusTones: Record<DepartureStatus, string> = {
  OPEN: "border-primary/15 bg-primary/10 text-primary",
  CLOSED: "border-border bg-muted text-muted-foreground",
  CANCELLED:
    "border-border bg-muted text-muted-foreground line-through decoration-muted-foreground/50",
}

const departureStatusDots: Record<DepartureStatus, string> = {
  OPEN: "bg-primary",
  CLOSED: "bg-muted-foreground",
  CANCELLED: "bg-muted-foreground",
}

/** Compact pill badge for a single departure's scheduling state. */
export function DepartureStatusBadge({ status }: DepartureStatusBadgeProps) {
  const { t } = useTranslation()

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs leading-none font-medium ${departureStatusTones[status]}`}
    >
      <span
        className={`size-1.5 shrink-0 rounded-full ${departureStatusDots[status]}`}
        aria-hidden
      />
      {t(DEPARTURE_STATUS_LABELS[status])}
    </span>
  )
}