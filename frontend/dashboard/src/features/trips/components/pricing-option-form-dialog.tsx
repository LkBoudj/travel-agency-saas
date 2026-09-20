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
import { PRICING_BASIS_LABELS } from "../types/trip.types"
import type { PricingOption } from "../types/pricing.types"
import {
  useCreatePricingOption,
  useUpdatePricingOption,
} from "../hooks/use-pricing"
import { getTourErrorMessage } from "../lib/tour-error-adapter"
import {
  buildPricingOptionPayload,
  emptyPricingOptionForm,
  toPricingOptionFormValues,
} from "../lib/pricing-payloads"
import {
  createPricingOptionFormSchema,
  type PricingOptionFormValues,
} from "../schemas/pricing-form.schema"

type PricingOptionFormDialogProps = {
  agencyCode: string
  tourCode: string
  /** `null` opens the create form; an option opens the edit form for it. */
  option: PricingOption | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Create/Edit one pricing option.
 *
 * Create always lands ACTIVE (the backend fixes the status) and in the tour's
 * currency (default DZD, single currency per tour — the field is deliberately
 * not offered). Edit replaces the editable definition only; the currency and
 * status move through their own dedicated actions.
 *
 * The backend's `AGENCY_PRICING_MANAGE` guard is authoritative; rendering
 * this dialog is only UX courtesy.
 */
export function PricingOptionFormDialog({
  agencyCode,
  tourCode,
  option,
  open,
  onOpenChange,
}: PricingOptionFormDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[min(90svh,42rem)] max-w-lg -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg outline-none sm:inset-x-auto sm:left-1/2 sm:right-auto sm:w-full sm:-translate-x-1/2 rtl:sm:left-auto rtl:sm:right-1/2 rtl:sm:translate-x-1/2">
          {open ? (
            <PricingOptionFormBody
              agencyCode={agencyCode}
              tourCode={tourCode}
              option={option}
              onOpenChange={onOpenChange}
            />
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function PricingOptionFormBody({
  agencyCode,
  tourCode,
  option,
  onOpenChange,
}: {
  agencyCode: string
  tourCode: string
  option: PricingOption | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()

  const create = useCreatePricingOption(agencyCode, tourCode)
  const update = useUpdatePricingOption(agencyCode, tourCode)
  const pending = create.isPending || update.isPending

  // Mounted per open, so the starting values are set once and never need an
  // effect to resync after the fact.
  const resolver = useMemo(
    () => zodResolver(createPricingOptionFormSchema(t)),
    [t]
  )
  const defaultValues = useMemo<PricingOptionFormValues>(() => {
    if (option) return toPricingOptionFormValues(option)
    return emptyPricingOptionForm()
  }, [option])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PricingOptionFormValues>({ resolver, defaultValues })

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const basisOptions = Object.entries(PRICING_BASIS_LABELS)

  const done = () => {
    appToastManager.add({
      title: t(
        option
          ? "trips:pricing.updateSuccess"
          : "trips:pricing.createSuccess"
      ),
    })
    onOpenChange(false)
  }

  const fail = (error: unknown) =>
    setErrorMessage(getTourErrorMessage(error))

  const onSubmit = handleSubmit((values) => {
    setErrorMessage(null)
    const payload = buildPricingOptionPayload(values)

    if (option) {
      update.mutate(
        { pricingOptionCode: option.pricingOptionCode, payload },
        { onSuccess: done, onError: fail }
      )
    } else {
      create.mutate(payload, { onSuccess: done, onError: fail })
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-5 py-4">
        <Dialog.Title className="text-sm font-semibold">
          {t(
            option
              ? "trips:pricing.form.editTitle"
              : "trips:pricing.form.createTitle"
          )}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-xs text-muted-foreground">
          {t("trips:pricing.form.description")}
        </Dialog.Description>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4 text-sm">
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="pricing-option-form-name">
              {t("trips:pricing.form.nameLabel")}
            </Label>
            <Input
              id="pricing-option-form-name"
              placeholder={t("trips:pricing.form.namePlaceholder")}
              dir="auto"
              aria-invalid={errors.name ? true : undefined}
              {...register("name")}
            />
            <p className="text-xs text-muted-foreground">
              {t("trips:pricing.form.nameHelper")}
            </p>
            {errors.name?.message ? (
              <p role="alert" className="text-xs text-destructive">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="pricing-option-form-description">
              {t("trips:pricing.form.descriptionLabel")}
            </Label>
            <Textarea
              id="pricing-option-form-description"
              rows={2}
              dir="auto"
              placeholder={t("trips:pricing.form.descriptionPlaceholder")}
              aria-invalid={errors.description ? true : undefined}
              {...register("description")}
            />
            {errors.description?.message ? (
              <p role="alert" className="text-xs text-destructive">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="pricing-option-form-basis">
              {t("trips:pricing.form.basisLabel")}
            </Label>
            <NativeSelect
              id="pricing-option-form-basis"
              className="w-48"
              {...register("basis")}
            >
              {basisOptions.map(([value, labelKey]) => (
                <option key={value} value={value}>
                  {t(labelKey)}
                </option>
              ))}
            </NativeSelect>
            {!option ? (
              <p className="text-xs text-muted-foreground">
                {t("trips:pricing.form.currencyHelper")}
              </p>
            ) : null}
          </div>
        </div>

        {errorMessage ? (
          <p role="alert" className="text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
        <Dialog.Close render={<Button variant="ghost" disabled={pending} />}>
          {t("trips:pricing.form.cancel")}
        </Dialog.Close>
        <Button type="submit" disabled={pending}>
          {pending
            ? t("trips:pricing.form.saving")
            : option
              ? t("trips:pricing.form.submitEdit")
              : t("trips:pricing.form.submitCreate")}
        </Button>
      </div>
    </form>
  )
}