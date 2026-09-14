import { Plus } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { useTripFilters } from "../hooks/use-trip-filters"
import { PLACEHOLDER_TRIPS } from "../utils/placeholder-trips"
import {
  TripsEmptyState,
  TripsNoResultsState,
} from "../components/trips-empty-state"
import { CreateTripDrawer } from "../components/create-trip-drawer"
import { TripsTable } from "../components/trips-table"
import { TripsToolbar } from "../components/trips-toolbar"

export function TripsPage() {
  const { t } = useTranslation()
  const filters = useTripFilters(PLACEHOLDER_TRIPS)
  const [createOpen, setCreateOpen] = useState(false)
  const showEmptyState = PLACEHOLDER_TRIPS.length === 0
  const showNoResults =
    PLACEHOLDER_TRIPS.length > 0 && filters.results.length === 0

  const clearFilters = () => {
    filters.setSearch("")
    filters.setStatus("all")
    filters.setFormat("all")
    filters.setScope("all")
    filters.setDestination("")
  }

  const resultContext = filters.hasActiveFilters
    ? t("trips:page.resultCountFiltered", {
        results: filters.results.length,
        total: PLACEHOLDER_TRIPS.length,
      })
    : t("trips:page.resultCount", { count: PLACEHOLDER_TRIPS.length })

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <PageHeader
        title={t("trips:page.title")}
        description={t("trips:page.description")}
        actions={
          <Button
            type="button"
            className="text-[13px]"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            {t("trips:page.createTrip")}
          </Button>
        }
      />

      <div className="overflow-hidden rounded-lg border bg-card">
        <TripsToolbar
          search={filters.search}
          onSearchChange={filters.setSearch}
          status={filters.status}
          onStatusChange={filters.setStatus}
          format={filters.format}
          onFormatChange={filters.setFormat}
          scope={filters.scope}
          onScopeChange={filters.setScope}
          destination={filters.destination}
          onDestinationChange={filters.setDestination}
          destinationOptions={filters.destinationOptions}
        />

        <div className="border-t border-border" />

        {filters.results.length > 0 && <TripsTable trips={filters.results} />}
        {showEmptyState && !filters.hasActiveFilters && (
          <TripsEmptyState onCreate={() => setCreateOpen(true)} />
        )}
        {showNoResults && <TripsNoResultsState onClearFilters={clearFilters} />}

        {filters.results.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">{resultContext}</p>
            {filters.hasActiveFilters && (
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
      </div>

      <CreateTripDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}