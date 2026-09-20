import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog } from "@base-ui/react/dialog"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { appToastManager } from "@/components/ui/toast"
import {
  useCreateDeparture,
  useUpdateDeparture,
} from "../hooks/use-departures"
import { getTourErrorMessage } from "../lib/tour-error-adapter"
import {
  buildDeparturePayload,
  buildDepartureUpdatePayload,
  emptyDepartureForm,
  toDepartureFormValues,
} from "../lib/departure-payloads"
import {
  createDepartureFormSchema,
  type DepartureFormValues,
} from "../schemas/departure-form.schema"
import type { AgencyDeparture } from "../types/departure.types"

type DepartureFormDialogProps = {
  agencyCode: string
  tourCode: string
  /** `null` opens the create form; a departure opens the edit form for it. */
  departure: AgencyDeparture | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Create/Edit one departure. Create always lands OPEN (the backend fixes the
 * status — pass-through for pride of place only); edit also exposes the
 * OPEN/CLOSED status select. CANCELLED is terminal and never offered here: it
 * happens through the cancel action only.
 *
 * The backend's `AGENCY_DEPARTURE_CREATE` / `_UPDATE` guards are authoritative;
 * rendering this dialog is only UX courtesy.
 */
export function DepartureFormDialog({
  agencyCode,
  tourCode,
  departure,
  open,
  onOpenChange,
}: DepartureFormDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[min(90svh,42rem)] max-w-lg -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg outline-none sm:inset-x-auto sm:left-1/2 sm:right-auto sm:w-full sm:-translate-x-1/2 rtl:sm:left-auto rtl:sm:right-1/2 rtl:sm:translate-x-1/2">
          {open ? (
            <DepartureFormBody
              agencyCode={agencyCode}
              tourCode={tourCode}
              departure={departure}
              onOpenChange={onOpenChange}
            />
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DepartureFormBody({
  agencyCode,
  tourCode,
  departure,
  onOpenChange,
}: {
  agencyCode: string
  tourCode: string
  departure: AgencyDeparture | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()

  const create = useCreateDeparture(agencyCode, tourCode)
  const update = useUpdateDeparture(agencyCode, tourCode)
  const pending = create.isPending || update.isPending

  // Mounted per open, so the starting values are set once and never need an
  // effect to resync after the fact. The status field is always part of the
  // schema; in create mode it just does not render and the payload builder
  // drops it, so the backend fixes the new departure to OPEN.
  const resolver = useMemo(
    () => zodResolver(createDepartureFormSchema({ t })),
    [t]
  )
  const defaultValues = useMemo<DepartureFormValues>(() => {
    if (departure) return toDepartureFormValues(departure)
    return emptyDepartureForm("OPEN")
  }, [departure])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DepartureFormValues>({ resolver, defaultValues })

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const done = () => {
    appToastManager.add({
      title: t(
        departure ? "trips:departures.updateSuccess" : "trips:departures.createSuccess"
      ),
    })
    onOpenChange(false)
  }

  const fail = (error: unknown) =>
    setErrorMessage(getTourErrorMessage(error))

  const onSubmit = handleSubmit((values) => {
    setErrorMessage(null)
    const operational = {
      startAt: values.startAt,
      endAt: values.endAt,
      capacity: values.capacity,
      bookingDeadline: values.bookingDeadline,
      notes: values.notes,
    }

    if (departure) {
      update.mutate(
        {
          departureCode: departure.code,
          payload: buildDepartureUpdatePayload({
            ...operational,
            status: values.status,
          }),
        },
        { onSuccess: done, onError: fail }
      )
    } else {
      create.mutate(buildDeparturePayload(operational), {
        onSuccess: done,
        onError: fail,
      })
    }
  })

  const includeStatus = Boolean(departure)

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-5 py-4">
        <Dialog.Title className="text-sm font-semibold">
          {t(
            departure
              ? "trips:departures.form.editTitle"
              : "trips:departures.form.createTitle"
          )}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-xs text-muted-foreground">
          {t("trips:departures.form.description")}
        </Dialog.Description>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4 text-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={t("trips:departures.form.startLabel")}
            htmlFor="departure-form-start"
            helper={t("trips:departures.form.startHelper")}
            error={errors.startAt?.message}
          >
            <Input
              id="departure-form-start"
              type="datetime-local"
              dir="ltr"
              aria-invalid={errors.startAt ? true : undefined}
              {...register("startAt")}
            />
          </Field>

          <Field
            label={t("trips:departures.form.endLabel")}
            htmlFor="departure-form-end"
            error={errors.endAt?.message}
          >
            <Input
              id="departure-form-end"
              type="datetime-local"
              dir="ltr"
              aria-invalid={errors.endAt ? true : undefined}
              {...register("endAt")}
            />
          </Field>

          <Field
            label={t("trips:departures.form.capacityLabel")}
            htmlFor="departure-form-capacity"
            error={errors.capacity?.message}
          >
            <Input
              id="departure-form-capacity"
              type="number"
              min={1}
              dir="ltr"
              aria-invalid={errors.capacity ? true : undefined}
              {...register("capacity")}
            />
          </Field>

          <Field
            label={t("trips:departures.form.deadlineLabel")}
            htmlFor="departure-form-deadline"
            helper={t("trips:departures.form.deadlineHelper")}
            error={errors.bookingDeadline?.message}
          >
            <Input
              id="departure-form-deadline"
              type="date"
              dir="ltr"
              aria-invalid={errors.bookingDeadline ? true : undefined}
              {...register("bookingDeadline")}
            />
          </Field>
        </div>

        {includeStatus ? (
          <Field
            label={t("trips:departures.form.statusLabel")}
            htmlFor="departure-form-status"
          >
            <NativeSelect id="departure-form-status" {...register("status")}>
              <option value="OPEN">{t("trips:departureStatus.open")}</option>
              <option value="CLOSED">{t("trips:departureStatus.closed")}</option>
            </NativeSelect>
          </Field>
        ) : null}

        <Field
          label={t("trips:departures.form.notesLabel")}
          htmlFor="departure-form-notes"
          helper={t("trips:departures.form.notesHelper")}
        >
          <Textarea
            id="departure-form-notes"
            rows={3}
            dir="auto"
            aria-invalid={errors.notes ? true : undefined}
            placeholder={t("trips:departures.form.notesPlaceholder")}
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
          {t("trips:departures.form.cancel")}
        </Dialog.Close>
        <Button type="submit" disabled={pending}>
          {pending
            ? t("trips:departures.form.saving")
            : departure
              ? t("trips:departures.form.submitEdit")
              : t("trips:departures.form.submitCreate")}
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  helper,
  error,
  children,
}: {
  label: string
  htmlFor: string
  helper?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {helper && !error ? (
        <p className="text-xs text-muted-foreground">{helper}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}