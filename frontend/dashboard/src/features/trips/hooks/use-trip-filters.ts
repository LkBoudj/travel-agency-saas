import { useMemo, useState } from "react"
import type {
  Trip,
  TripStatus,
  TripFormat,
  GeographicScope,
} from "../types/trip.types"

export type TripStatusFilter = TripStatus | "all"
export type TripFormatFilter = TripFormat | "all"
export type TripScopeFilter = GeographicScope | "all"

/** Client-side filter state for the trips list. Replaced by server queries later. */
export function useTripFilters(trips: Trip[]) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<TripStatusFilter>("all")
  const [format, setFormat] = useState<TripFormatFilter>("all")
  const [scope, setScope] = useState<TripScopeFilter>("all")
  const [destination, setDestination] = useState("")

  const destinationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          trips
            .flatMap((trip) => trip.destinations.map((d) => d.name))
            .filter(Boolean)
        )
      ).sort(),
    [trips]
  )

  const results = useMemo(() => {
    const query = search.trim().toLowerCase()
    return trips.filter((trip) => {
      const matchesSearch =
        query === "" ||
        trip.name.toLowerCase().includes(query) ||
        trip.internalRef?.toLowerCase().includes(query)
      const matchesStatus = status === "all" || trip.status === status
      const matchesFormat = format === "all" || trip.format === format
      const matchesScope = scope === "all" || trip.geographicScope === scope
      const matchesDestination =
        destination === "" ||
        trip.destinations.some((d) => d.name === destination)
      return (
        matchesSearch &&
        matchesStatus &&
        matchesFormat &&
        matchesScope &&
        matchesDestination
      )
    })
  }, [trips, search, status, format, scope, destination])

  const hasActiveFilters =
    search !== "" ||
    status !== "all" ||
    format !== "all" ||
    scope !== "all" ||
    destination !== ""

  return {
    search,
    setSearch,
    status,
    setStatus,
    format,
    setFormat,
    scope,
    setScope,
    destination,
    setDestination,
    destinationOptions,
    results,
    hasActiveFilters,
  }
}