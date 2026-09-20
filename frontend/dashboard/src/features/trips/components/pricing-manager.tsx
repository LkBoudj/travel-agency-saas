import { Pencil, Plus, Power, Tag } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { appToastManager } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useAgencyPermission } from "@/features/agency-context/hooks/use-agency-permission"
import type { AppLocale } from "@/i18n"
import { useDeactivatePricingOption, usePricingOverview } from "../hooks/use-pricing"
import { getTourErrorMessage } from "../lib/tour-error-adapter"
import { formatTripPrice } from "../utils/format-trip-price"
import { PRICING_BASIS_LABELS } from "../types/trip.types"
import type { PricingOption, PricingOptionStatus } from "../types/pricing.types"
import { SectionHeading } from "./section-heading"
import { PricingOptionFormDialog } from "./pricing-option-form-dialog"

type PricingManagerProps = {
  agencyCode: string
  tourCode: string
}

const PRICING_PERMISSIONS = {
  view: "AGENCY_PRICING_VIEW",
  manage: "AGENCY_PRICING_MANAGE",
} as const

const optionStatusTones: Record<PricingOptionStatus, string> = {
  ACTIVE: "border-primary/15 bg-primary/10 text-primary",
  INACTIVE:
    "border-border bg-muted text-muted-foreground line-through decoration-muted-foreground/50",
}

const optionStatusDots: Record<PricingOptionStatus, string> = {
  ACTIVE: "bg-primary",
  INACTIVE: "bg-muted-foreground",
}

function OptionStatusBadge({ status }: { status: PricingOptionStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs leading-none font-medium ${optionStatusTones[status]}`}
    >
      <span
        className={`size-1.5 shrink-0 rounded-full ${optionStatusDots[status]}`}
        aria-hidden
      />
      {t(
        status === "ACTIVE"
          ? "trips:pricing.statusActive"
          : "trips:pricing.statusInactive"
      )}
    </span>
  )
}

/**
 * Live Pricing module surface: the tour's customer categories plus the
 * derived starting price and priced-departure count. Options are managed here
 * (create / edit / one-way deactivate) and priced per departure inside the
 * DeparturesManager.
 *
 * Permissions are a UX courtesy — the backend guards are authoritative.
 */
export function PricingManager({
  agencyCode,
  tourCode,
}: PricingManagerProps) {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language ?? "en") as AppLocale
  const canManage = useAgencyPermission(PRICING_PERMISSIONS.manage)

  const overviewQuery = usePricingOverview(agencyCode, tourCode)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PricingOption | null>(null)
  const [deactivating, setDeactivating] = useState<PricingOption | null>(null)

  const deactivate = useDeactivatePricingOption(agencyCode, tourCode)

  const options = overviewQuery.data?.options ?? []
  const startingPrice = overviewQuery.data?.startingPrice ?? null
  const pricedOpenDepartureCount =
    overviewQuery.data?.pricedOpenDepartureCount ?? 0

  const confirmDeactivate = () => {
    if (!deactivating) return
    deactivate.mutate(deactivating.pricingOptionCode, {
      onSuccess: () => {
        appToastManager.add({ title: t("trips:pricing.deactivateSuccess") })
        setDeactivating(null)
      },
      onError: (error) => {
        appToastManager.add({ title: getTourErrorMessage(error) })
        setDeactivating(null)
      },
    })
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (option: PricingOption) => {
    setEditing(option)
    setFormOpen(true)
  }

  return (
    <section className="grid gap-4">
      <div className="flex items-end justify-between gap-3">
        <SectionHeading helper={t("trips:pricing.helper")}>
          {t("trips:pricing.title")}
        </SectionHeading>
        {canManage ? (
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            {t("trips:pricing.create")}
          </Button>
        ) : null}
      </div>

      {overviewQuery.isPending ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          {t("trips:pricing.loading")}
        </p>
      ) : overviewQuery.isError ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">
            {getTourErrorMessage(overviewQuery.error)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void overviewQuery.refetch()}
          >
            {t("trips:pricing.retry")}
          </Button>
        </div>
      ) : options.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-10 text-center">
          <span aria-hidden className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Tag className="size-4" />
          </span>
          <p className="text-sm text-muted-foreground">
            {t("trips:pricing.empty")}
          </p>
          {canManage ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              {t("trips:pricing.create")}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <p className="text-muted-foreground">
              {t("trips:pricing.summary.optionsCount", { count: options.length })}
            </p>
            <p className="text-muted-foreground">
              {startingPrice !== null ? (
                <>
                  {t("trips:pricing.summary.startingPrice")}{" "}
                  <span className="font-medium tabular-nums text-foreground">
                    {formatTripPrice(startingPrice, locale)}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground/70">
                  {t("trips:pricing.summary.noPrice")}
                </span>
              )}
            </p>
            <p className="text-muted-foreground">
              {t("trips:pricing.summary.pricedDepartures", {
                count: pricedOpenDepartureCount,
              })}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="border-b text-start text-xs whitespace-nowrap text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">
                    {t("trips:pricing.columns.name")}
                  </th>
                  <th className="hidden px-3 py-2.5 font-medium sm:table-cell">
                    {t("trips:pricing.columns.basis")}
                  </th>
                  <th className="hidden px-3 py-2.5 font-medium lg:table-cell">
                    {t("trips:pricing.columns.currency")}
                  </th>
                  <th className="hidden px-3 py-2.5 font-medium md:table-cell">
                    {t("trips:pricing.columns.pricedDepartures")}
                  </th>
                  <th className="px-3 py-2.5 font-medium">
                    {t("trips:pricing.columns.status")}
                  </th>
                  <th className="px-3 py-2.5 text-end font-medium">
                    {t("trips:pricing.columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {options.map((option) => {
                  const inactive = option.status === "INACTIVE"
                  return (
                    <tr
                      key={option.pricingOptionCode}
                      className={inactive ? "opacity-60" : "hover:bg-muted/40"}
                    >
                      <td className="px-3 py-2 align-middle whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <p className="font-medium text-foreground">
                            {option.name}
                          </p>
                          {option.description ? (
                            <p className="text-xs text-muted-foreground">
                              {option.description}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="hidden px-3 py-2 align-middle whitespace-nowrap text-muted-foreground sm:table-cell">
                        {t(PRICING_BASIS_LABELS[option.basis])}
                      </td>
                      <td className="hidden px-3 py-2 align-middle whitespace-nowrap tabular-nums lg:table-cell">
                        <span dir="ltr">{option.currency}</span>
                      </td>
                      <td className="hidden px-3 py-2 text-end align-middle tabular-nums md:table-cell">
                        {option.pricedDepartureCount}
                      </td>
                      <td className="px-3 py-2 align-middle whitespace-nowrap">
                        <OptionStatusBadge status={option.status} />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          {canManage && !inactive ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("trips:pricing.editAria", {
                                name: option.name,
                              })}
                              onClick={() => openEdit(option)}
                            >
                              <Pencil className="size-4" aria-hidden />
                            </Button>
                          ) : null}
                          {canManage && !inactive ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("trips:pricing.deactivateAria", {
                                name: option.name,
                              })}
                              onClick={() => setDeactivating(option)}
                            >
                              <Power className="size-4" aria-hidden />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PricingOptionFormDialog
        agencyCode={agencyCode}
        tourCode={tourCode}
        option={editing}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => {
          if (!open) setDeactivating(null)
        }}
        title={t("trips:pricing.deactivateTitle")}
        description={t("trips:pricing.deactivateBody")}
        confirmLabel={t("trips:pricing.deactivateConfirm")}
        cancelLabel={t("trips:pricing.deactivateCancel")}
        destructive
        onConfirm={confirmDeactivate}
      />
    </section>
  )
}