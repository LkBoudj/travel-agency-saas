import { useTranslation } from "react-i18next"
import {
  DEPARTURE_STATUS_LABELS,
  TRIP_STATUS_LABELS,
  type DepartureStatus,
  type TripStatus,
} from "../types/trip.types"

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
  open: "border-primary/15 bg-primary/10 text-primary",
  closed: "border-border bg-muted text-muted-foreground",
  sold_out: "border-destructive/15 bg-destructive/10 text-destructive",
  cancelled:
    "border-border bg-muted text-muted-foreground line-through decoration-muted-foreground/50",
}

const departureStatusDots: Record<DepartureStatus, string> = {
  open: "bg-primary",
  closed: "bg-muted-foreground",
  sold_out: "bg-destructive",
  cancelled: "bg-muted-foreground",
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