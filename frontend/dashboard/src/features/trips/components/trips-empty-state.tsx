import { Plane } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button, buttonVariants } from "@/components/ui/button"

type TripsEmptyStateProps = {
  onCreate: () => void
}

/**
 * Empty state for a trips list with no trips at all. Renders as a compact
 * content block inside the resource surface.
 */
export function TripsEmptyState({ onCreate }: TripsEmptyStateProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Plane className="size-4" aria-hidden />
      </span>
      <h2 className="mt-3 text-sm font-semibold">{t("trips:empty.title")}</h2>
      <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
        {t("trips:empty.description")}
      </p>
      <Button type="button" onClick={onCreate} className="mt-4">
        {t("trips:empty.createTrip")}
      </Button>
    </div>
  )
}

type TripsNoResultsStateProps = {
  onClearFilters: () => void
}

/** Shown when a search/filter matches nothing but trips exist. */
export function TripsNoResultsState({ onClearFilters }: TripsNoResultsStateProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <h2 className="text-sm font-semibold">{t("trips:noResults.title")}</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {t("trips:noResults.description")}
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className={buttonVariants({ variant: "outline", className: "mt-4" })}
      >
        {t("trips:noResults.clearFilters")}
      </button>
    </div>
  )
}