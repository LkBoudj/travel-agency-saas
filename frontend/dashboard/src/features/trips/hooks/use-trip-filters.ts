import { useMemo, useState } from "react"
import type {
  Trip,
  TripFormat,
  GeographicScope,
} from "../types/trip.types"

export type TripFormatFilter = TripFormat | "all"
export type TripScopeFilter = GeographicScope | "all"

/**
 * Client-side filter taps for the trips list.
 *
 * The backend owns search and status (its query already matches name/reference
 * and status), so those two stay on the page as server-query state. Format,
 * scope and destination are trimmed here on the server result only.
 */
export function useTripFilters(trips: Trip[]) {
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
    return trips.filter((trip) => {
      const matchesFormat = format === "all" || trip.format === format
      const matchesScope = scope === "all" || trip.geographicScope === scope
      const matchesDestination =
        destination === "" ||
        trip.destinations.some((d) => d.name === destination)
      return matchesFormat && matchesScope && matchesDestination
    })
  }, [trips, format, scope, destination])

  const hasActiveFilters =
    format !== "all" || scope !== "all" || destination !== ""

  const clear = () => {
    setFormat("all")
    setScope("all")
    setDestination("")
  }

  return {
    format,
    setFormat,
    scope,
    setScope,
    destination,
    setDestination,
    destinationOptions,
    results,
    hasActiveFilters,
    clear,
  }
}