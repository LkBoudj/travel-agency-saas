import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog } from "@base-ui/react/dialog"
import { useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { appToastManager } from "@/components/ui/toast"
import { AGENCY_SECTIONS, agencyPath } from "@/features/agency-context/lib/agency-paths"
import { useAgencyContext } from "@/features/agency-context/hooks/use-agency-context"
import { useCustomers } from "@/features/customers/hooks/use-customers"
import { customerDisplayName } from "@/features/customers/lib/customer-display"
import { useDepartures } from "@/features/trips/hooks/use-departures"
import { useDeparturePrices } from "@/features/trips/hooks/use-pricing"
import { useTours } from "@/features/trips/hooks/use-tours"
import { useCreateBooking } from "../hooks/use-booking-mutations"
import { getBookingErrorMessage } from "../lib/booking-error-adapter"
import {
  formatBookingAmount,
  formatBookingDate,
} from "../lib/booking-display"
import { buildCreateBookingPayload } from "../lib/booking-payloads"
import {
  createBookingFormSchema,
  type BookingFormValues,
} from "../schemas/booking.schema"

type CreateBookingDialogProps = {
  agencyCode: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Create a booking for the agency in the URL.
 *
 * The form walks a real cascade — customer → tour → departure → stored add-on
 * prices — and sends only public codes. Amounts are NEVER sent: the server
 * snapshots the price lines and the total from the departure's stored prices
 * under a row lock, so the estimate below is preview-only and the recorded
 * ledger is the server's word.
 *
 * The backend guards (`AGENCY_BOOKING_CREATE`, and the read endpoints behind
 * it) stay authoritative; rendering this dialog is only UX courtesy.
 */
export function CreateBookingDialog({
  agencyCode,
  open,
  onOpenChange,
}: CreateBookingDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[min(90svh,44rem)] max-w-xl -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg outline-none sm:inset-x-auto sm:left-1/2 sm:right-auto sm:w-full sm:-translate-x-1/2 rtl:sm:left-auto rtl:sm:right-1/2 rtl:sm:translate-x-1/2">
          {open ? (
            <CreateBookingBody
              agencyCode={agencyCode}
              onOpenChange={onOpenChange}
            />
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function CreateBookingBody({
  agencyCode,
  onOpenChange,
}: {
  agencyCode: string
  onOpenChange: (open: boolean) => void
}) {
  const { agency } = useAgencyContext()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const create = useCreateBooking(agencyCode)
  const pending = create.isPending

  // Mounted per open, so the starting values are set once and never need an
  // effect to resync after the fact.
  const resolver = useMemo(() => zodResolver(createBookingFormSchema(t)), [t])
  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver,
    defaultValues: {
      customerCode: "",
      tourCode: "",
      departureCode: "",
      reservedSeats: "",
      pricingSelections: [],
      notes: "",
    },
  })

  const customerCode = useWatch({ name: "customerCode", control }) ?? ""
  const tourCode = useWatch({ name: "tourCode", control }) ?? ""
  const departureCode = useWatch({ name: "departureCode", control }) ?? ""
  const reservedSeats = useWatch({ name: "reservedSeats", control }) ?? ""
  const pricingSelections =
    useWatch({ name: "pricingSelections", control }) ?? []

  const customersQuery = useCustomers(agencyCode, "", !pending)
  const toursQuery = useTours(agencyCode, "", undefined, !pending)
  const departuresQuery = useDepartures(agencyCode, tourCode || undefined)
  const pricesQuery = useDeparturePrices(
    agencyCode,
    tourCode || "",
    departureCode || undefined
  )

  const customers = customersQuery.data ?? []
  const tours = toursQuery.data ?? []
  const openDepartures = (departuresQuery.data ?? []).filter(
    (departure) => departure.status === "OPEN"
  )
  // Only options that still carry an ACTIVE stored price can be selected.
  const priceLines = (pricesQuery.data?.prices ?? []).filter(
    (line) => line.active
  )
  const currency = pricesQuery.data?.currency ?? "DZD"

  const seats = Number(reservedSeats)
  const estimatedTotal =
    Number.isFinite(seats) && seats > 0
      ? priceLines
          .filter((line) => pricingSelections.includes(line.pricingOptionCode))
          .reduce(
            (sum, line) =>
              sum +
              (line.basis === "per_person" ? line.amount * seats : line.amount),
            0
          )
      : null

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const done = (bookingCode: string) => {
    appToastManager.add({ title: t("bookings:create.success") })
    onOpenChange(false)
    navigate(
      `${agencyPath(agency.code, AGENCY_SECTIONS.bookings)}/${encodeURIComponent(bookingCode)}`
    )
  }

  const fail = (error: unknown) =>
    setErrorMessage(getBookingErrorMessage(error))

  const onSubmit = handleSubmit((values) => {
    setErrorMessage(null)
    create.mutate(buildCreateBookingPayload(values), {
      onSuccess: (booking) => done(booking.code),
      onError: fail,
    })
  })

  const togglePricing = (code: string, selected: boolean) => {
    setValue(
      "pricingSelections",
      selected
        ? [...pricingSelections, code]
        : pricingSelections.filter((candidate) => candidate !== code),
      { shouldValidate: true }
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-5 py-4">
        <Dialog.Title className="text-sm font-semibold">
          {t("bookings:create.title")}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-xs text-muted-foreground">
          {t("bookings:create.description")}
        </Dialog.Description>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4 text-sm">
        <Field
          label={t("bookings:create.customerLabel")}
          htmlFor="booking-form-customer"
          error={errors.customerCode?.message}
        >
          <NativeSelect
            id="booking-form-customer"
            value={customerCode}
            aria-invalid={errors.customerCode ? true : undefined}
            disabled={customersQuery.isPending || customers.length === 0}
            onChange={(event) =>
              setValue("customerCode", event.target.value, {
                shouldValidate: true,
              })
            }
          >
            <option value="">
              {customersQuery.isPending
                ? t("bookings:create.customerLoading")
                : t("bookings:create.customerPlaceholder")}
            </option>
            {customers.map((customer) => (
              <option key={customer.code} value={customer.code}>
                {customerDisplayName(customer)} — {customer.code}
              </option>
            ))}
          </NativeSelect>
          {!customersQuery.isPending &&
          customersQuery.isSuccess &&
          customers.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("bookings:create.customerEmpty")}
            </p>
          ) : null}
        </Field>

        <Field
          label={t("bookings:create.tourLabel")}
          htmlFor="booking-form-tour"
          error={errors.tourCode?.message}
        >
          <NativeSelect
            id="booking-form-tour"
            value={tourCode}
            aria-invalid={errors.tourCode ? true : undefined}
            disabled={toursQuery.isPending || tours.length === 0}
            onChange={(event) => {
              setValue("tourCode", event.target.value, {
                shouldValidate: true,
              })
              // A new tour invalidates every child selection.
              setValue("departureCode", "")
              setValue("pricingSelections", [])
            }}
          >
            <option value="">
              {toursQuery.isPending
                ? t("bookings:create.tourLoading")
                : t("bookings:create.tourPlaceholder")}
            </option>
            {tours.map((tour) => (
              <option key={tour.code} value={tour.code}>
                {tour.name} — {tour.code}
              </option>
            ))}
          </NativeSelect>
          {!toursQuery.isPending &&
          toursQuery.isSuccess &&
          tours.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("bookings:create.tourEmpty")}
            </p>
          ) : null}
        </Field>

        <Field
          label={t("bookings:create.departureLabel")}
          htmlFor="booking-form-departure"
          error={errors.departureCode?.message}
        >
          <NativeSelect
            id="booking-form-departure"
            value={departureCode}
            aria-invalid={errors.departureCode ? true : undefined}
            disabled={
              !tourCode ||
              departuresQuery.isPending ||
              openDepartures.length === 0
            }
            onChange={(event) => {
              setValue("departureCode", event.target.value, {
                shouldValidate: true,
              })
              setValue("pricingSelections", [])
            }}
          >
            <option value="">
              {!tourCode
                ? t("bookings:create.departurePlaceholder")
                : departuresQuery.isPending
                  ? t("bookings:create.departureLoading")
                  : t("bookings:create.departurePlaceholder")}
            </option>
            {openDepartures.map((departure) => (
              <option key={departure.code} value={departure.code}>
                {t("bookings:create.departureOption", {
                  date: formatBookingDate(departure.startAt),
                  capacity: departure.capacity,
                })}
              </option>
            ))}
          </NativeSelect>
          {tourCode &&
          !departuresQuery.isPending &&
          departuresQuery.isSuccess &&
          openDepartures.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("bookings:create.departureEmpty")}
            </p>
          ) : null}
        </Field>

        <Field
          label={t("bookings:create.seatsLabel")}
          htmlFor="booking-form-seats"
          error={errors.reservedSeats?.message}
        >
          <Input
            id="booking-form-seats"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            dir="ltr"
            placeholder={t("bookings:create.seatsPlaceholder")}
            aria-invalid={errors.reservedSeats ? true : undefined}
            {...register("reservedSeats")}
          />
        </Field>

        <Field
          label={t("bookings:create.pricingLabel")}
          htmlFor="booking-form-pricing"
          error={errors.pricingSelections?.message}
        >
          {!departureCode ? (
            <p className="text-xs text-muted-foreground">
              {t("bookings:create.pricingHint")}
            </p>
          ) : pricesQuery.isPending ? (
            <p className="text-xs text-muted-foreground">
              {t("bookings:create.pricingLoading")}
            </p>
          ) : pricesQuery.isError && !pricesQuery.data ? (
            <div className="flex flex-col items-start gap-2 rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">
                {getBookingErrorMessage(pricesQuery.error)}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void pricesQuery.refetch()}
              >
                {t("bookings:error.retry")}
              </Button>
            </div>
          ) : priceLines.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("bookings:create.pricingEmpty")}
            </p>
          ) : (
            <div className="grid gap-2">
              {priceLines.map((line) => (
                <label
                  key={line.pricingOptionCode}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5"
                >
                  <Checkbox
                    checked={pricingSelections.includes(
                      line.pricingOptionCode
                    )}
                    onCheckedChange={(checked) =>
                      togglePricing(line.pricingOptionCode, checked === true)
                    }
                    aria-label={line.pricingOptionName}
                    className="mt-0.5"
                  />
                  <span className="grid min-w-0 gap-0.5">
                    <span className="font-medium">{line.pricingOptionName}</span>
                    <span className="text-xs text-muted-foreground">
                      {t(
                        line.basis === "per_person"
                          ? "bookings:details.basisPerson"
                          : "bookings:details.basisBooking"
                      )}{" "}
                      · {formatBookingAmount(line.amount, line.currency)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </Field>

        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
          <span className="text-xs text-muted-foreground">
            {t("bookings:create.total")}
          </span>
          <span className="text-sm font-semibold">
            {estimatedTotal === null
              ? "—"
              : formatBookingAmount(estimatedTotal, currency)}
          </span>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          {t("bookings:create.totalNote")}
        </p>

        <Field
          label={t("bookings:create.notesLabel")}
          htmlFor="booking-form-notes"
          error={errors.notes?.message}
        >
          <Textarea
            id="booking-form-notes"
            dir="auto"
            placeholder={t("bookings:create.notesPlaceholder")}
            aria-invalid={errors.notes ? true : undefined}
            {...register("notes")}
          />
        </Field>

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
        <Button type="submit" disabled={pending}>
          {pending
            ? t("bookings:create.saving")
            : t("bookings:create.submit")}
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}