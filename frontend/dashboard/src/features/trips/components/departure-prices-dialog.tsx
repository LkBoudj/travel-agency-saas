import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog } from "@base-ui/react/dialog"
import { useEffect, useMemo, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { appToastManager } from "@/components/ui/toast"
import { PRICING_BASIS_LABELS } from "../types/trip.types"
import type { AgencyDeparture } from "../types/departure.types"
import {
  useDeparturePrices,
  usePricingOverview,
  useSetDeparturePrices,
} from "../hooks/use-pricing"
import { getTourErrorMessage } from "../lib/tour-error-adapter"
import {
  buildDeparturePricesPayload,
  toDeparturePriceRows,
} from "../lib/pricing-payloads"
import {
  createDeparturePricesFormSchema,
  type DeparturePricesFormValues,
} from "../schemas/pricing-form.schema"

type DeparturePricesDialogProps = {
  agencyCode: string
  tourCode: string
  /** The departure whose whole price set is being edited. */
  departure: AgencyDeparture | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Edit one departure's whole price set.
 *
 * One editable amount per ACTIVE pricing option; clearing an option's field
 * removes its price as part of the whole-set replacement (the backend PUT
 * deletes and recreates the set in one transaction). INACTIVE options are not
 * shown — their stored prices are history and cannot re-enter a new set.
 *
 * Saving here also moves the trip's derived `startingPrice`, so the tours
 * queries are invalidated alongside the pricing slice.
 */
export function DeparturePricesDialog({
  agencyCode,
  tourCode,
  departure,
  open,
  onOpenChange,
}: DeparturePricesDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[min(90svh,42rem)] max-w-lg -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg outline-none sm:inset-x-auto sm:left-1/2 sm:right-auto sm:w-full sm:-translate-x-1/2 rtl:sm:left-auto rtl:sm:right-1/2 rtl:sm:translate-x-1/2">
          {open ? (
            <DeparturePricesBody
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

function DeparturePricesBody({
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

  const overviewQuery = usePricingOverview(agencyCode, tourCode)
  const pricesQuery = useDeparturePrices(agencyCode, tourCode, departure?.code)
  const save = useSetDeparturePrices(agencyCode, tourCode)

  const options = overviewQuery.data?.options ?? []
  const activeOptions = options.filter((option) => option.status === "ACTIVE")
  const currency = pricesQuery.data?.currency ?? options[0]?.currency
  const loading =
    overviewQuery.isPending || pricesQuery.isPending || !departure

  // Mounted per open, so values are initialized once both queries settle and
  // never need a dirty-trapped resync afterwards.
  const resolver = useMemo(
    () => zodResolver(createDeparturePricesFormSchema(t)),
    [t]
  )
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DeparturePricesFormValues>({
    resolver,
    defaultValues: { prices: [] },
  })
  const { fields } = useFieldArray({ control, name: "prices" })

  useEffect(() => {
    if (!overviewQuery.data || !pricesQuery.data) return
    reset({
      prices: toDeparturePriceRows(
        overviewQuery.data.options,
        pricesQuery.data
      ),
    })
  }, [overviewQuery.data, pricesQuery.data, reset])

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const done = (cleared: boolean) => {
    appToastManager.add({
      title: t(
        cleared
          ? "trips:departurePrices.clearSuccess"
          : "trips:departurePrices.success"
      ),
    })
    onOpenChange(false)
  }

  const fail = (error: unknown) =>
    setErrorMessage(getTourErrorMessage(error))

  const onSubmit = handleSubmit((values) => {
    if (!departure) return
    setErrorMessage(null)
    const payload = buildDeparturePricesPayload(values.prices)
    save.mutate(
      { departureCode: departure.code, payload },
      {
        onSuccess: () => done(payload.prices.length === 0),
        onError: fail,
      }
    )
  })

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="border-b px-5 py-4">
        <Dialog.Title className="text-sm font-semibold">
          {t("trips:departurePrices.title", {
            departure: departure?.code ?? "",
          })}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-xs text-muted-foreground">
          {t("trips:departurePrices.description")}
        </Dialog.Description>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-4 text-sm">
        {loading ? (
          <p className="py-4 text-sm text-muted-foreground">
            {t("trips:departurePrices.loading")}
          </p>
        ) : (overviewQuery.isError || pricesQuery.isError) &&
          !overviewQuery.data &&
          !pricesQuery.data ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">
              {getTourErrorMessage(overviewQuery.error ?? pricesQuery.error)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void overviewQuery.refetch()
                void pricesQuery.refetch()
              }}
            >
              {t("trips:departurePrices.retry")}
            </Button>
          </div>
        ) : activeOptions.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {t("trips:departurePrices.noOptions")}
          </p>
        ) : (
          <div className="grid gap-1.5">
            {fields.map((field, index) => {
              const option = activeOptions.find(
                (candidate) =>
                  candidate.pricingOptionCode === field.pricingOptionCode
              )
              const error = errors.prices?.[index]?.amount?.message
              return (
                <div
                  key={field.id}
                  className="grid grid-cols-1 gap-1.5 rounded-lg border px-3 py-2.5 sm:grid-cols-[1fr_180px] sm:items-center sm:gap-4"
                >
                  <div className="grid gap-0.5 min-w-0">
                    <p className="font-medium">{option?.name ?? ""}</p>
                    {option ? (
                      <p className="text-xs text-muted-foreground">
                        {t(PRICING_BASIS_LABELS[option.basis])}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      dir="ltr"
                      placeholder={t("trips:departurePrices.amountPlaceholder")}
                      aria-label={t("trips:departurePrices.amountAria", {
                        name: option?.name ?? "",
                        currency: currency ?? "",
                      })}
                      aria-invalid={error ? true : undefined}
                      {...register(`prices.${index}.amount`)}
                    />
                    {error ? (
                      <p role="alert" className="text-xs text-destructive">
                        {error}
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {errorMessage ? (
          <p role="alert" className="text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
        <Dialog.Close render={<Button variant="ghost" disabled={save.isPending} />}>
          {t("trips:departurePrices.cancel")}
        </Dialog.Close>
        <Button type="submit" disabled={loading || activeOptions.length === 0}>
          {save.isPending
            ? t("trips:departurePrices.saving")
            : t("trips:departurePrices.submit")}
        </Button>
      </div>
    </form>
  )
}