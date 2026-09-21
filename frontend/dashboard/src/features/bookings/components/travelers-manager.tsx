import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { appToastManager } from "@/components/ui/toast"
import { useAddTraveler, useUpdateTraveler } from "../hooks/use-booking-mutations"
import { useTravelers } from "../hooks/use-travelers"
import { type BookingTravelerCapabilities } from "../lib/booking-actions"
import { getBookingErrorMessage } from "../lib/booking-error-adapter"
import {
  buildTravelerWritePayload,
  type TravelerFormInput,
} from "../lib/traveler-payloads"
import {
  travelerFormSchema,
  type TravelerFormValues,
} from "../schemas/booking.schema"
import type { BookingDetail } from "../types/bookings.types"

type TravelersManagerProps = {
  agencyCode: string
  booking: BookingDetail
  capabilities: BookingTravelerCapabilities
}

/**
 * The booking's traveler manifest (Module J).
 *
 * A traveler is one named seat. Adding is offered to members who may create
 * traveler records while the booking is still PENDING; each row can be edited
 * (not deleted — there is no delete endpoint) while PENDING. Once the booking
 * leaves PENDING the manifest is frozen: the card becomes read-only and the
 * backend rejects any write regardless of this UI.
 *
 * `AGENCY_TRAVELER_VIEW` gates the whole card, exactly like the backend gates
 * the list endpoint; the write controls are courtesy, and the backend's
 * permissions and triggers stay authoritative.
 */
export function TravelersManager({
  agencyCode,
  booking,
  capabilities,
}: TravelersManagerProps) {
  const { t } = useTranslation()
  const travelersQuery = useTravelers(agencyCode, booking.code)
  const travelers = travelersQuery.data ?? []

  const frozen = booking.status !== "PENDING"
  const canWrite = !frozen && capabilities.canCreate
  const canEdit = !frozen && capabilities.canUpdate

  const [adding, setAdding] = useState(false)
  const [editingCode, setEditingCode] = useState<string | null>(null)

  return (
    <div className="max-w-xl rounded-xl border">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
        <span className="text-sm font-semibold">
          {t("bookings:travelers.title")}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("bookings:travelers.count", {
            count: travelers.length,
            seats: booking.reservedSeats,
          })}
        </span>
      </div>

      {frozen ? (
        <p className="border-b px-5 py-3 text-xs text-muted-foreground">
          {t("bookings:travelers.frozenHint")}
        </p>
      ) : null}

      {travelersQuery.isPending ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          {t("bookings:page.loading")}
        </p>
      ) : travelersQuery.isError ? (
        <div className="flex flex-col items-start gap-2 px-5 py-4">
          <p className="text-sm text-muted-foreground">
            {getBookingErrorMessage(travelersQuery.error)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void travelersQuery.refetch()}
          >
            {t("bookings:error.retry")}
          </Button>
        </div>
      ) : travelers.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          {t("bookings:travelers.empty")}
        </p>
      ) : (
        <ul className="flex flex-col">
          {travelers.map((traveler) => (
            <li key={traveler.code} className="border-t px-5 py-3">
              {editingCode === traveler.code ? (
                <TravelerForm
                  agencyCode={agencyCode}
                  bookingCode={booking.code}
                  travelerCode={traveler.code}
                  defaultValue={{
                    firstName: traveler.firstName,
                    lastName: traveler.lastName,
                    email: traveler.email ?? "",
                    phone: traveler.phone ?? "",
                    notes: traveler.notes ?? "",
                  }}
                  submitLabel={t("bookings:travelers.form.save")}
                  onDone={() => setEditingCode(null)}
                  onCancel={() => setEditingCode(null)}
                />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="grid min-w-0 gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {traveler.firstName} {traveler.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {traveler.code}
                    </span>
                    {traveler.email ? (
                      <span
                        dir="ltr"
                        className="truncate text-xs text-muted-foreground"
                      >
                        {traveler.email}
                      </span>
                    ) : null}
                    {traveler.phone ? (
                      <span
                        dir="ltr"
                        className="truncate text-xs text-muted-foreground"
                      >
                        {traveler.phone}
                      </span>
                    ) : null}
                    {traveler.notes ? (
                      <span className="text-xs text-muted-foreground">
                        {traveler.notes}
                      </span>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCode(traveler.code)}
                    >
                      {t("bookings:travelers.edit")}
                    </Button>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite ? (
        <div className="border-t px-5 py-3">
          {adding ? (
            <TravelerForm
              agencyCode={agencyCode}
              bookingCode={booking.code}
              travelerCode={null}
              defaultValue={{ firstName: "", lastName: "", email: "", phone: "", notes: "" }}
              submitLabel={t("bookings:travelers.form.add")}
              onDone={() => setAdding(false)}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <PlusIcon className="size-3.5" aria-hidden />
              {t("bookings:travelers.add")}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}

type TravelerFormProps = {
  agencyCode: string
  bookingCode: string
  /** `null` adds a new traveler; a code edits that traveler's record. */
  travelerCode: string | null
  defaultValue: TravelerFormInput
  submitLabel: string
  onDone: () => void
  onCancel: () => void
}

/** One add/edit form; mounted only while active, so values are set per open. */
function TravelerForm({
  agencyCode,
  bookingCode,
  travelerCode,
  defaultValue,
  submitLabel,
  onDone,
  onCancel,
}: TravelerFormProps) {
  const { t } = useTranslation()
  const add = useAddTraveler(agencyCode, bookingCode)
  const update = useUpdateTraveler(agencyCode, bookingCode, travelerCode ?? "")
  const pending = add.isPending || update.isPending

  const resolver = useMemo(() => zodResolver(travelerFormSchema(t)), [t])
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TravelerFormValues>({
    resolver,
    defaultValues: defaultValue,
  })

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onSubmit = handleSubmit((values) => {
    setErrorMessage(null)
    const target = travelerCode ? update : add
    target.mutate(buildTravelerWritePayload(values), {
      onSuccess: () => {
        appToastManager.add({
          title: travelerCode
            ? t("bookings:travelers.form.saved")
            : t("bookings:travelers.form.added"),
        })
        onDone()
      },
      onError: (error) => setErrorMessage(getBookingErrorMessage(error)),
    })
  })

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-lg border bg-muted/30 p-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t("bookings:travelers.form.firstName")}
          htmlFor="traveler-first-name"
          error={errors.firstName?.message}
        >
          <Input
            id="traveler-first-name"
            dir="auto"
            aria-invalid={errors.firstName ? true : undefined}
            disabled={pending}
            {...register("firstName")}
          />
        </Field>
        <Field
          label={t("bookings:travelers.form.lastName")}
          htmlFor="traveler-last-name"
          error={errors.lastName?.message}
        >
          <Input
            id="traveler-last-name"
            dir="auto"
            aria-invalid={errors.lastName ? true : undefined}
            disabled={pending}
            {...register("lastName")}
          />
        </Field>
      </div>

      <Field
        label={t("bookings:travelers.form.email")}
        htmlFor="traveler-email"
        error={errors.email?.message}
      >
        <Input
          id="traveler-email"
          type="email"
          dir="ltr"
          autoComplete="off"
          aria-invalid={errors.email ? true : undefined}
          disabled={pending}
          {...register("email")}
        />
      </Field>

      <Field
        label={t("bookings:travelers.form.phone")}
        htmlFor="traveler-phone"
        error={errors.phone?.message}
      >
        <Input
          id="traveler-phone"
          dir="ltr"
          autoComplete="off"
          aria-invalid={errors.phone ? true : undefined}
          disabled={pending}
          {...register("phone")}
        />
      </Field>

      <Field
        label={t("bookings:travelers.form.notes")}
        htmlFor="traveler-notes"
        error={errors.notes?.message}
      >
        <Textarea
          id="traveler-notes"
          dir="auto"
          rows={2}
          aria-invalid={errors.notes ? true : undefined}
          disabled={pending}
          {...register("notes")}
        />
      </Field>

      {errorMessage ? (
        <p role="alert" className="text-xs text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onCancel}>
          {t("bookings:travelers.form.cancel")}
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t("bookings:page.updating") : submitLabel}
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