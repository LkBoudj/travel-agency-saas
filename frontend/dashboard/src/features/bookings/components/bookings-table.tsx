import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { BookingStatusBadge } from "./booking-status-badge"
import {
  bookingCustomerName,
  formatBookingAmount,
  formatBookingDate,
} from "../lib/booking-display"
import type { AgencyBooking } from "../types/bookings.types"

type BookingsTableProps = {
  bookings: AgencyBooking[]
  onViewDetails: (booking: AgencyBooking) => void
}

/**
 * One row per booking in the listing.
 *
 * The customer's code and the tour name are shown as quiet secondary lines —
 * the booking code is the record's stable key and the total is rendered in the
 * booking's own currency. Rows stay simple: the details page owns the heavier
 * actions (cancel with a reason) and this table just opens it.
 */
export function BookingsTable({ bookings, onViewDetails }: BookingsTableProps) {
  const { t } = useTranslation()

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[780px] text-[13px]">
        <thead>
          <tr className="border-b text-start text-xs whitespace-nowrap text-muted-foreground">
            <th className="px-3 py-2.5 text-start font-medium">
              {t("bookings:table.booking")}
            </th>
            <th className="px-3 py-2.5 text-start font-medium">
              {t("bookings:table.customer")}
            </th>
            <th className="px-3 py-2.5 text-start font-medium">
              {t("bookings:table.departure")}
            </th>
            <th className="px-3 py-2.5 text-start font-medium">
              {t("bookings:table.seats")}
            </th>
            <th className="px-3 py-2.5 text-start font-medium">
              {t("bookings:table.total")}
            </th>
            <th className="px-3 py-2.5 text-start font-medium">
              {t("bookings:table.status")}
            </th>
            <th className="px-3 py-2.5 text-end font-medium">
              {t("bookings:table.actions")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {bookings.map((booking) => (
            <tr key={booking.code} className="hover:bg-muted/40">
              <td className="px-3 py-2.5">
                <span className="block truncate font-medium">{booking.code}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {booking.tour.name}
                </span>
              </td>

              <td className="px-3 py-2.5">
                <span className="block truncate">
                  {bookingCustomerName(booking.customer)}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {booking.customer.code}
                </span>
              </td>

              <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                <span className="block">
                  {formatBookingDate(booking.departure.startAt)}
                </span>
                <span className="block text-xs">{booking.departure.code}</span>
              </td>

              <td className="px-3 py-2.5 whitespace-nowrap">
                {booking.reservedSeats}
              </td>

              <td className="px-3 py-2.5 whitespace-nowrap">
                {formatBookingAmount(booking.totalAmount, booking.currency)}
              </td>

              <td className="px-3 py-2.5">
                <BookingStatusBadge status={booking.status} />
              </td>

              <td className="px-3 py-2.5">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onViewDetails(booking)}
                  >
                    {t("bookings:table.viewDetails")}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}