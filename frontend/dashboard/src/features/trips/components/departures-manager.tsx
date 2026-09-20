import { parseISO } from "date-fns"
import { Coins, Pencil, Plus, XCircle } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { appToastManager } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useAgencyPermission } from "@/features/agency-context/hooks/use-agency-permission"
import { getIntlLocale, type AppLocale } from "@/i18n"
import {
  openDepartureCount,
  useCancelDeparture,
  useDepartures,
} from "../hooks/use-departures"
import { getTourErrorMessage } from "../lib/tour-error-adapter"
import { DepartureStatusBadge } from "./trip-status-badge"
import { DepartureFormDialog } from "./departure-form-dialog"
import { DeparturePricesDialog } from "./departure-prices-dialog"
import type { AgencyDeparture, DepartureStatus } from "../types/departure.types"

type DeparturesManagerProps = {
  agencyCode: string
  tourCode: string
  tourStatus: string | undefined
}

const DEPARTURE_PERMISSIONS = {
  create: "AGENCY_DEPARTURE_CREATE",
  update: "AGENCY_DEPARTURE_UPDATE",
  cancel: "AGENCY_DEPARTURE_DELETE",
  managePrices: "AGENCY_PRICING_MANAGE",
} as const

function formatDateTime(value: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parseISO(value))
}

function formatDate(value: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
  }).format(parseISO(value))
}

/**
 * The real Departures module surface: one row per scheduled occurrence with
 * its own capacity, booking deadline and status, backed by the Departures API.
 *
 * Create always lands OPEN (the backend fixes the status); the status is only
 * editable in Edit. CANCELLED is one-way and never offered here — it happens
 * through the confirm dialog. A published trip with zero open departures shows
 * a warning: it stays published (cancelling the last open departure never
 * unpublishes) but is not bookable until one opens again.
 *
 * Permissions are a UX courtesy — the backend guards are authoritative.
 */
export function DeparturesManager({
  agencyCode,
  tourCode,
  tourStatus,
}: DeparturesManagerProps) {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language ?? "en") as AppLocale
  const canCreate = useAgencyPermission(DEPARTURE_PERMISSIONS.create)
  const canUpdate = useAgencyPermission(DEPARTURE_PERMISSIONS.update)
  const canCancel = useAgencyPermission(DEPARTURE_PERMISSIONS.cancel)
  const canManagePrices = useAgencyPermission(DEPARTURE_PERMISSIONS.managePrices)

  const departuresQuery = useDepartures(agencyCode, tourCode)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AgencyDeparture | null>(null)
  const [cancelling, setCancelling] = useState<AgencyDeparture | null>(null)
  const [pricing, setPricing] = useState<AgencyDeparture | null>(null)

  const cancel = useCancelDeparture(agencyCode, tourCode)

  const departures = departuresQuery.data ?? []
  const openCount = openDepartureCount(departures)
  const isPublished = tourStatus === "PUBLISHED"
  const showNoOpenWarning =
    isPublished && !departuresQuery.isPending && openCount === 0

  const confirmCancel = () => {
    if (!cancelling) return
    cancel.mutate(cancelling.code, {
      onSuccess: () => {
        appToastManager.add({ title: t("trips:departures.cancelSuccess") })
        setCancelling(null)
      },
      onError: (error) => {
        appToastManager.add({ title: getTourErrorMessage(error) })
        setCancelling(null)
      },
    })
  }

  const openEdit = (departure: AgencyDeparture) => {
    if (departure.status === "CANCELLED") return
    setEditing(departure)
    setFormOpen(true)
  }

  return (
    <div className="grid gap-4">
      {showNoOpenWarning ? (
        <div
          role="status"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
        >
          <p className="font-medium text-destructive">
            {t("trips:departures.publishedNoOpen.title")}
          </p>
          <p className="mt-0.5 text-muted-foreground">
            {t("trips:departures.publishedNoOpen.body")}
          </p>
        </div>
      ) : null}

      {departuresQuery.isPending ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          {t("trips:departures.loading")}
        </p>
      ) : departuresQuery.isError ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">
            {getTourErrorMessage(departuresQuery.error)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void departuresQuery.refetch()}
          >
            {t("trips:departures.retry")}
          </Button>
        </div>
      ) : departures.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {t("trips:departures.empty")}
          </p>
          {canCreate ? (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="size-4" aria-hidden />
              {t("trips:departures.create")}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {t("trips:departures.departuresCount", { count: departures.length })}
          </p>
          {canCreate ? (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="size-4" aria-hidden />
              {t("trips:departures.create")}
            </Button>
          ) : null}
        </div>
      )}

      {departures.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b text-start text-xs whitespace-nowrap text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">
                  {t("trips:departures.columns.status")}
                </th>
                <th className="px-3 py-2.5 font-medium">
                  {t("trips:departures.columns.start")}
                </th>
                <th className="hidden px-3 py-2.5 font-medium sm:table-cell">
                  {t("trips:departures.columns.end")}
                </th>
                <th className="hidden px-3 py-2.5 text-end font-medium md:table-cell">
                  {t("trips:departures.columns.capacity")}
                </th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell">
                  {t("trips:departures.columns.deadline")}
                </th>
                <th className="px-3 py-2.5 text-end font-medium">
                  {t("trips:departures.columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {departures.map((departure) => {
                const cancelled = departure.status === "CANCELLED"
                return (
                  <tr
                    key={departure.code}
                    className={cancelled ? "opacity-60" : "hover:bg-muted/40"}
                  >
                    <td className="px-3 py-2 align-middle whitespace-nowrap">
                      <DepartureStatusBadge status={departure.status as DepartureStatus} />
                    </td>
                    <td className="px-3 py-2 align-middle whitespace-nowrap">
                      {formatDateTime(departure.startAt, locale)}
                    </td>
                    <td className="hidden px-3 py-2 align-middle whitespace-nowrap text-muted-foreground sm:table-cell">
                      {formatDateTime(departure.endAt, locale)}
                    </td>
                    <td className="hidden px-3 py-2 text-end align-middle tabular-nums md:table-cell">
                      {departure.capacity}
                    </td>
                    <td className="hidden px-3 py-2 align-middle whitespace-nowrap text-muted-foreground md:table-cell">
                      {departure.bookingDeadline ? (
                        formatDate(departure.bookingDeadline, locale)
                      ) : (
                        <span className="text-muted-foreground/70">
                          {t("trips:departures.deadlineNone")}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <div className="flex items-center justify-end gap-1">
                        {canUpdate && !cancelled ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("trips:departures.editAria", {
                              name: departure.code,
                            })}
                            onClick={() => openEdit(departure)}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                        ) : null}
                        {canManagePrices && !cancelled ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("trips:departures.pricesAria", {
                              name: departure.code,
                            })}
                            onClick={() => setPricing(departure)}
                          >
                            <Coins className="size-4" aria-hidden />
                          </Button>
                        ) : null}
                        {canCancel && !cancelled ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("trips:departures.cancelAria", {
                              name: departure.code,
                            })}
                            onClick={() => setCancelling(departure)}
                          >
                            <XCircle className="size-4" aria-hidden />
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
      ) : null}

      <DepartureFormDialog
        agencyCode={agencyCode}
        tourCode={tourCode}
        departure={editing}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      <DeparturePricesDialog
        agencyCode={agencyCode}
        tourCode={tourCode}
        departure={pricing}
        open={Boolean(pricing)}
        onOpenChange={(open) => {
          if (!open) setPricing(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => {
          if (!open) setCancelling(null)
        }}
        title={t("trips:departures.cancelTitle")}
        description={t("trips:departures.cancelBody")}
        confirmLabel={t("trips:departures.cancelConfirm")}
        cancelLabel={t("trips:departures.cancelDialogCancel")}
        destructive
        onConfirm={confirmCancel}
      />
    </div>
  )
}