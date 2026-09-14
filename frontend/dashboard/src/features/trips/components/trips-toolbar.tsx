import { useMemo } from "react"
import { Search, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import {
  FORMAT_OPTIONS,
  SCOPE_OPTIONS,
  translateOptions,
} from "../constants/trip-taxonomy"
import type {
  TripStatusFilter,
  TripFormatFilter,
  TripScopeFilter,
} from "../hooks/use-trip-filters"

type TripsToolbarProps = {
  search: string
  onSearchChange: (value: string) => void
  status: TripStatusFilter
  onStatusChange: (value: TripStatusFilter) => void
  format: TripFormatFilter
  onFormatChange: (value: TripFormatFilter) => void
  scope: TripScopeFilter
  onScopeChange: (value: TripScopeFilter) => void
  destination: string
  onDestinationChange: (value: string) => void
  destinationOptions: string[]
}

type StatusOption = { value: TripStatusFilter; labelKey: string }

const STATUS_OPTIONS: StatusOption[] = [
  { value: "all", labelKey: "trips:toolbar.allStatuses" },
  { value: "draft", labelKey: "trips:status.draft" },
  { value: "published", labelKey: "trips:status.published" },
  { value: "archived", labelKey: "trips:status.archived" },
]

/**
 * Toolbar row for the trips resource index. Lives on top of the table surface.
 * Search is the widest control; filters stay compact to its right.
 */
export function TripsToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  format,
  onFormatChange,
  scope,
  onScopeChange,
  destination,
  onDestinationChange,
  destinationOptions,
}: TripsToolbarProps) {
  const { t } = useTranslation()
  const resolvedStatusOptions = useMemo(
    () => STATUS_OPTIONS.map((o) => ({ ...o, label: t(o.labelKey) })),
    [t]
  )
  const resolvedFormatOptions = useMemo(
    () => translateOptions(FORMAT_OPTIONS, t),
    [t]
  )
  const resolvedScopeOptions = useMemo(
    () => translateOptions(SCOPE_OPTIONS, t),
    [t]
  )

  return (
    <div className="flex flex-col gap-2.5 p-3 lg:flex-row lg:items-center lg:gap-3 lg:justify-between">
      <div className="relative w-full lg:max-w-md lg:flex-1">
        <Search className="pointer-events-none absolute top-1/2 start-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("trips:toolbar.searchPlaceholder")}
          aria-label={t("trips:toolbar.searchAria")}
          className="pe-8 ps-9"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label={t("trips:toolbar.clearSearchAria")}
            className="absolute top-1/2 end-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <NativeSelect
          value={status}
          onChange={(e) => onStatusChange(e.target.value as TripStatusFilter)}
          aria-label={t("trips:toolbar.filterStatusAria")}
          className="w-36"
        >
          {resolvedStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          value={format}
          onChange={(e) => onFormatChange(e.target.value as TripFormatFilter)}
          aria-label={t("trips:toolbar.filterFormatAria")}
          className="w-40"
        >
          <option value="all">{t("trips:toolbar.allFormats")}</option>
          {resolvedFormatOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          value={scope}
          onChange={(e) => onScopeChange(e.target.value as TripScopeFilter)}
          aria-label={t("trips:toolbar.filterScopeAria")}
          className="w-36"
        >
          <option value="all">{t("trips:toolbar.allScopes")}</option>
          {resolvedScopeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>

        {destinationOptions.length > 0 && (
          <NativeSelect
            value={destination}
            onChange={(e) => onDestinationChange(e.target.value)}
            aria-label={t("trips:toolbar.filterDestinationAria")}
            className="w-44"
          >
            <option value="">{t("trips:toolbar.allDestinations")}</option>
            {destinationOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </NativeSelect>
        )}
      </div>
    </div>
  )
}