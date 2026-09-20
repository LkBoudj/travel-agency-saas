import { useTranslation } from "react-i18next"
import type { BookingStatus } from "../types/bookings.types"
import { BOOKING_STATUS_LABELS } from "../types/bookings.types"

const BADGE_CLASSES: Record<BookingStatus, string> = {
  PENDING: "border-border bg-muted/40 text-muted-foreground",
  CONFIRMED: "border-primary/30 bg-primary/10 text-primary",
  CANCELLED: "border-destructive/30 bg-destructive/10 text-destructive",
}

/**
 * Booking lifecycle badge. Colors come from the design tokens only: pending is
 * muted, confirmed is primary, cancelled is destructive — color is reinforced
 * by the label text, never the sole signal.
 */
export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${BADGE_CLASSES[status]}`}
    >
      {t(BOOKING_STATUS_LABELS[status])}
    </span>
  )
}