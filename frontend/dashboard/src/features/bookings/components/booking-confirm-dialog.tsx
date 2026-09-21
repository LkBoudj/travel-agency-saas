import { Dialog } from "@base-ui/react/dialog"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { appToastManager } from "@/components/ui/toast"
import { useConfirmBooking } from "../hooks/use-booking-mutations"
import { useTravelers } from "../hooks/use-travelers"
import { getBookingErrorMessage } from "../lib/booking-error-adapter"
import { travelerManifestComplete } from "../lib/traveler-payloads"
import type { AgencyBooking } from "../types/bookings.types"

type BookingConfirmDialogProps = {
  agencyCode: string
  /** The booking being confirmed; `null` renders nothing inside the dialog. */
  booking: AgencyBooking | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * One-way PENDING → CONFIRMED.
 *
 * There is no body to fill — the only thing an operator needs to know is
 * whether the traveler manifest matches the reserved seats. The backend
 * re-checks that equal count under a booking row lock and refuses a partial
 * manifest with `BOOKING_TRAVELER_COUNT_MISMATCH`; the readiness line here is
 * the same arithmetic, shown before the fact.
 */
export function BookingConfirmDialog({
  agencyCode,
  booking,
  open,
  onOpenChange,
}: BookingConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[min(90svh,36rem)] max-w-md -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg outline-none sm:inset-x-auto sm:left-1/2 sm:right-auto sm:w-full sm:-translate-x-1/2 rtl:sm:left-auto rtl:sm:right-1/2 rtl:sm:translate-x-1/2">
          {open ? (
            <ConfirmBody
              agencyCode={agencyCode}
              booking={booking}
              onOpenChange={onOpenChange}
            />
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ConfirmBody({
  agencyCode,
  booking,
  onOpenChange,
}: {
  agencyCode: string
  booking: AgencyBooking | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const confirm = useConfirmBooking(agencyCode)
  const pending = confirm.isPending

  const travelersQuery = useTravelers(agencyCode, booking?.code)
  const travelerCount = travelersQuery.data?.length ?? 0
  const reservedSeats = booking?.reservedSeats ?? 0
  const complete =
    Boolean(booking) && travelerManifestComplete(travelerCount, reservedSeats)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onSubmit = () => {
    if (!booking) return
    setErrorMessage(null)
    confirm.mutate(booking.code, {
      onSuccess: () => {
        appToastManager.add({ title: t("bookings:confirm.success") })
        onOpenChange(false)
      },
      onError: (error) => setErrorMessage(getBookingErrorMessage(error)),
    })
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="border-b px-5 py-4">
        <Dialog.Title className="text-sm font-semibold">
          {t("bookings:confirm.title")}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-xs text-muted-foreground">
          {t("bookings:confirm.description")}
        </Dialog.Description>
      </div>

      <div className="grid gap-3 px-5 py-4 text-sm">
        <p className="text-xs text-muted-foreground">
          {t("bookings:confirm.count", {
            count: travelerCount,
            seats: reservedSeats,
          })}
        </p>
        <p className="text-xs">
          {complete
            ? t("bookings:confirm.ready")
            : t("bookings:confirm.notReady")}
        </p>

        {errorMessage ? (
          <p role="alert" className="text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
        <Dialog.Close render={<Button variant="ghost" disabled={pending} />}>
          {t("bookings:confirm.cancelAction")}
        </Dialog.Close>
        <Button type="submit" disabled={pending || !complete}>
          {pending
            ? t("bookings:confirm.confirming")
            : t("bookings:confirm.submit")}
        </Button>
      </div>
    </form>
  )
}