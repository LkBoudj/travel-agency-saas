import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { useAgencyContext } from "@/features/agency-context/hooks/use-agency-context"
import type { TripStatus } from "../types/trip.types"
import { useTours } from "../hooks/use-tours"
import { useTourCapabilities } from "../hooks/use-tour-capabilities"
import { useTripFilters } from "../hooks/use-trip-filters"
import { useDebouncedValue } from "../hooks/use-debounced-value"
import { getTourErrorMessage } from "../lib/tour-error-adapter"
import { toTourStatus, toTripRows } from "../lib/tour-payloads"
import {
  TripsEmptyState,
  TripsNoResultsState,
} from "../components/trips-empty-state"
import { CreateTripDrawer } from "../components/create-trip-drawer"
import { TripsTable } from "../components/trips-table"
import { TripsToolbar } from "../components/trips-toolbar"

type TripStatusFilter = TripStatus | "all"

/**
 * Trips list for the agency in the URL.
 *
 * Search and status are server queries (name/reference text + exact status);
 * format, scope and destination are trimmed client-side on the result. The
 * page never fabricates a populated list — loading, error and empty states are
 * distinct, and every action is gated by permission (UX only; the backend
 * guards are authoritative).
 */
export function TripsPage() {
  const { t } = useTranslation()
  const { agency } = useAgencyContext()
  const capabilities = useTourCapabilities()

  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [status, setStatus] = useState<TripStatusFilter>("all")
  const statusParam =
    status === "all" ? undefined : toTourStatus(status)

  const toursQuery = useTours(
    agency.code,
    debouncedSearch,
    statusParam,
    capabilities.canView
  )

  const trips = useMemo(
    () => toTripRows(toursQuery.data ?? []),
    [toursQuery.data]
  )

  const filters = useTripFilters(trips)
  const hasActiveFilters =
    search !== "" || status !== "all" || filters.hasActiveFilters
  const currentTrips = filters.results

  const clearFilters = () => {
    setSearch("")
    setStatus("all")
    filters.clear()
  }

  const resultContext = hasActiveFilters
    ? t("trips:page.resultCountFiltered", {
        results: currentTrips.length,
        total: trips.length,
      })
    : t("trips:page.resultCount", { count: trips.length })

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <PageHeader
        title={t("trips:page.title")}
        description={t("trips:page.description")}
        actions={
          capabilities.canCreate ? (
            <Button
              type="button"
              className="text-[13px]"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" />
              {t("trips:page.createTrip")}
            </Button>
          ) : undefined
        }
      />

      <div className="overflow-hidden rounded-lg border bg-card">
        {capabilities.canView ? (
          <>
            <TripsToolbar
              search={search}
              onSearchChange={setSearch}
              status={status}
              onStatusChange={setStatus}
              format={filters.format}
              onFormatChange={filters.setFormat}
              scope={filters.scope}
              onScopeChange={filters.setScope}
              destination={filters.destination}
              onDestinationChange={filters.setDestination}
              destinationOptions={filters.destinationOptions}
            />

            <div className="border-t border-border" />

            {toursQuery.isPending ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("trips:page.loading")}
              </p>
            ) : toursQuery.isError ? (
              <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {getTourErrorMessage(toursQuery.error)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void toursQuery.refetch()}
                >
                  {t("trips:error.retry")}
                </Button>
              </div>
            ) : (
              <>
                {currentTrips.length > 0 && (
                  <TripsTable trips={currentTrips} />
                )}
                {currentTrips.length === 0 && !hasActiveFilters &&
                  (capabilities.canCreate ? (
                    <TripsEmptyState onCreate={() => setCreateOpen(true)} />
                  ) : (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {t("trips:page.noTrips")}
                    </p>
                  ))}
                {currentTrips.length === 0 && hasActiveFilters && (
                  <TripsNoResultsState onClearFilters={clearFilters} />
                )}

                {currentTrips.length > 0 && (
                  <div className="flex items-center justify-between border-t border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      {resultContext}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                      >
                        {t("trips:page.clearFilters")}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            {t("trips:error.loadFailed")}
          </p>
        )}
      </div>

      <CreateTripDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}