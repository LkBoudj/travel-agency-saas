import { Dialog } from "@base-ui/react/dialog"
import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { appToastManager } from "@/components/ui/toast"
import { useCancelBooking } from "../hooks/use-booking-mutations"
import { getBookingErrorMessage } from "../lib/booking-error-adapter"
import { buildCancelBookingPayload } from "../lib/booking-payloads"
import type { AgencyBooking } from "../types/bookings.types"

type BookingCancelDialogProps = {
  agencyCode: string
  /** The booking being cancelled; `null` renders nothing inside the dialog. */
  booking: AgencyBooking | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * One-way cancellation: PENDING/CONFIRMED → CANCELLED, releasing the reserved
 * seats back to the departure. The reason is optional and stored when given.
 * There is no restore — the guard is the destructive button, not marketing.
 */
export function BookingCancelDialog({
  agencyCode,
  booking,
  open,
  onOpenChange,
}: BookingCancelDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[min(90svh,36rem)] max-w-md -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg outline-none sm:inset-x-auto sm:left-1/2 sm:right-auto sm:w-full sm:-translate-x-1/2 rtl:sm:left-auto rtl:sm:right-1/2 rtl:sm:translate-x-1/2">
          {open ? (
            <CancelBody
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

function CancelBody({
  agencyCode,
  booking,
  onOpenChange,
}: {
  agencyCode: string
  booking: AgencyBooking | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const cancel = useCancelBooking(agencyCode)
  const pending = cancel.isPending

  const [reason, setReason] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!booking) return
    setErrorMessage(null)
    cancel.mutate(
      {
        bookingCode: booking.code,
        reason: buildCancelBookingPayload(reason).reason,
      },
      {
        onSuccess: () => {
          appToastManager.add({ title: t("bookings:cancel.success") })
          onOpenChange(false)
        },
        onError: (error) => setErrorMessage(getBookingErrorMessage(error)),
      }
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-5 py-4">
        <Dialog.Title className="text-sm font-semibold">
          {t("bookings:cancel.title")}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-xs text-muted-foreground">
          {t("bookings:cancel.description")}
        </Dialog.Description>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4 text-sm">
        <div className="grid gap-1.5">
          <Label htmlFor="booking-cancel-reason">
            {t("bookings:cancel.reasonLabel")}
          </Label>
          <Textarea
            id="booking-cancel-reason"
            dir="auto"
            rows={3}
            maxLength={500}
            placeholder={t("bookings:cancel.reasonPlaceholder")}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>

        {errorMessage ? (
          <p role="alert" className="text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
        <Dialog.Close render={<Button variant="ghost" disabled={pending} />}>
          {t("bookings:create.cancel")}
        </Dialog.Close>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending
            ? t("bookings:cancel.cancelling")
            : t("bookings:cancel.submit")}
        </Button>
      </div>
    </form>
  )
}