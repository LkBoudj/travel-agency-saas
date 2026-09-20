import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { AGENCY_SECTIONS, agencyPath } from "@/features/agency-context/lib/agency-paths"
import { useAgencyContext } from "@/features/agency-context/hooks/use-agency-context"
import { BookingCancelDialog } from "../components/booking-cancel-dialog"
import { BookingStatusBadge } from "../components/booking-status-badge"
import { useBooking } from "../hooks/use-booking"
import { useBookingCapabilities } from "../hooks/use-booking-capabilities"
import { bookingRowActions } from "../lib/booking-actions"
import {
  bookingCustomerName,
  formatBookingAmount,
  formatBookingDate,
} from "../lib/booking-display"
import {
  BOOKING_STATUS_LABELS,
  type BookingDetail,
} from "../types/bookings.types"

/**
 * One booking, read by its `BKG-...` code from the URL.
 *
 * The backend resolves the code inside the agency that owns the route, so a
 * stale or foreign code is a truthful 404. Cancelled bookings stay readable
 * here — the price snapshot and status history are exactly what a stored link
 * to a cancelled record still leads to.
 */
export function BookingDetailsPage() {
  const { agency } = useAgencyContext()
  const { bookingCode } = useParams<{ bookingCode: string }>()
  const capabilities = useBookingCapabilities()
  const { t } = useTranslation()

  const [cancelOpen, setCancelOpen] = useState(false)

  const bookingQuery = useBooking(agency.code, bookingCode)
  const booking = bookingQuery.data ?? null
  const backTo = agencyPath(agency.code, AGENCY_SECTIONS.bookings)

  if (!capabilities.canView) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl border p-6 text-sm text-muted-foreground">
          {t("bookings:error.loadFailed")}
        </p>
      </div>
    )
  }

  const actions = booking ? bookingRowActions(booking, capabilities) : null

  return (
    <div className="flex flex-col gap-4">
      <Link
        to={backTo}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5 rtl:rotate-180" aria-hidden />
        {t("bookings:details.back")}
      </Link>

      {bookingQuery.isPending ? (
        <p className="rounded-xl border p-6 text-sm text-muted-foreground">
          {t("bookings:page.loading")}
        </p>
      ) : bookingQuery.isError ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">
            {t("bookings:details.notFound")}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void bookingQuery.refetch()}
          >
            {t("bookings:error.retry")}
          </Button>
        </div>
      ) : booking ? (
        <>
          <PageHeader
            title={booking.code}
            description={booking.tour.name}
            actions={
              actions?.canCancel ? (
                <Button
                  variant="destructive"
                  onClick={() => setCancelOpen(true)}
                >
                  {t("bookings:details.cancel")}
                </Button>
              ) : undefined
            }
          />

          <div className="max-w-xl rounded-xl border">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {booking.code}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {booking.tour.name}
                </span>
              </span>
              <BookingStatusBadge status={booking.status} />
            </div>

            <dl className="flex flex-col gap-3 px-5 py-4 text-sm">
              <DetailRow
                label={t("bookings:details.customer")}
                value={`${bookingCustomerName(booking.customer)} · ${booking.customer.code}`}
              />
              <DetailRow
                label={t("bookings:details.tour")}
                value={`${booking.tour.name} · ${booking.tour.code}`}
              />
              <DetailRow
                label={t("bookings:details.departure")}
                value={`${booking.departure.code} · ${t("bookings:details.starts")} ${formatBookingDate(booking.departure.startAt)}`}
              />
              <DetailRow
                label={t("bookings:details.seats")}
                value={String(booking.reservedSeats)}
              />
              <DetailRow
                label={t("bookings:details.total")}
                value={formatBookingAmount(booking.totalAmount, booking.currency)}
              />
              <DetailRow
                label={t("bookings:details.currency")}
                value={booking.currency}
              />
              <DetailRow
                label={t("bookings:details.notes")}
                value={booking.notes?.trim() || t("bookings:details.noNotes")}
              />
              {booking.confirmedAt ? (
                <DetailRow
                  label={t("bookings:details.confirmedAt")}
                  value={formatBookingDate(booking.confirmedAt)}
                />
              ) : null}
              {booking.cancelledAt ? (
                <DetailRow
                  label={t("bookings:details.cancelledAt")}
                  value={formatBookingDate(booking.cancelledAt)}
                />
              ) : null}
              {booking.cancellationReason ? (
                <DetailRow
                  label={t("bookings:details.cancellationReason")}
                  value={booking.cancellationReason}
                />
              ) : null}
              <DetailRow
                label={t("bookings:details.createdAt")}
                value={formatBookingDate(booking.createdAt)}
              />
              <DetailRow
                label={t("bookings:details.updatedAt")}
                value={formatBookingDate(booking.updatedAt)}
              />
            </dl>
          </div>

          {booking.status === "PENDING" ? (
            <p className="max-w-xl text-xs text-muted-foreground">
              {t("bookings:details.pendingHint")}
            </p>
          ) : null}

          <PriceBreakdown booking={booking} />
          <StatusHistory booking={booking} />
        </>
      ) : null}

      <BookingCancelDialog
        agencyCode={agency.code}
        booking={booking}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
      />
    </div>
  )
}

/** The frozen price-line snapshot recorded when the booking was created. */
function PriceBreakdown({ booking }: { booking: BookingDetail }) {
  const { t } = useTranslation()

  if (booking.priceLines.length === 0) {
    return (
      <div className="max-w-xl rounded-xl border">
        <div className="border-b px-5 py-4 text-sm font-semibold">
          {t("bookings:details.priceLinesTitle")}
        </div>
        <p className="px-5 py-4 text-sm text-muted-foreground">
          {t("bookings:details.priceLinesEmpty")}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-xl overflow-x-auto rounded-xl border">
      <div className="border-b px-5 py-4 text-sm font-semibold">
        {t("bookings:details.priceLinesTitle")}
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b text-start text-xs whitespace-nowrap text-muted-foreground">
            <th className="px-3 py-2 text-start font-medium">
              {t("bookings:details.option")}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t("bookings:details.basis")}
            </th>
            <th className="hidden px-3 py-2 text-start font-medium md:table-cell">
              {t("bookings:details.unitAmount")}
            </th>
            <th className="px-3 py-2 text-start font-medium">
              {t("bookings:details.quantity")}
            </th>
            <th className="px-3 py-2 text-end font-medium">
              {t("bookings:details.lineTotal")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {booking.priceLines.map((line) => (
            <tr key={line.pricingOptionCode}>
              <td className="px-3 py-2">
                <span className="block font-medium">
                  {line.pricingOptionName}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {line.pricingOptionCode}
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {t(
                  line.basis === "per_person"
                    ? "bookings:details.basisPerson"
                    : "bookings:details.basisBooking"
                )}
              </td>
              <td className="hidden px-3 py-2 whitespace-nowrap md:table-cell">
                {formatBookingAmount(line.unitAmount, line.currency)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{line.quantity}</td>
              <td className="px-3 py-2 text-end whitespace-nowrap font-medium">
                {formatBookingAmount(line.lineTotal, line.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** The recorded lifecycle moves, oldest first. */
function StatusHistory({ booking }: { booking: BookingDetail }) {
  const { t } = useTranslation()

  if (booking.statusHistory.length === 0) {
    return (
      <div className="max-w-xl rounded-xl border">
        <div className="border-b px-5 py-4 text-sm font-semibold">
          {t("bookings:details.historyTitle")}
        </div>
        <p className="px-5 py-4 text-sm text-muted-foreground">
          {t("bookings:details.historyEmpty")}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-xl rounded-xl border">
      <div className="border-b px-5 py-4 text-sm font-semibold">
        {t("bookings:details.historyTitle")}
      </div>
      <ul className="flex flex-col">
        {booking.statusHistory.map((entry, index) => (
          <li
            key={index}
            className="grid gap-0.5 border-t px-5 py-3 text-sm first:border-t-0"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {entry.fromStatus
                  ? t(BOOKING_STATUS_LABELS[entry.fromStatus])
                  : "—"}
              </span>
              <ArrowRightIcon
                className="size-3 text-muted-foreground rtl:rotate-180"
                aria-hidden
              />
              <span className="font-medium">
                {t(BOOKING_STATUS_LABELS[entry.toStatus])}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatBookingDate(entry.createdAt)}
            </span>
            {entry.actorCode ? (
              <span className="text-xs text-muted-foreground">
                {entry.actorCode}
              </span>
            ) : null}
            {entry.reason ? (
              <span className="text-xs text-muted-foreground">
                {entry.reason}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}