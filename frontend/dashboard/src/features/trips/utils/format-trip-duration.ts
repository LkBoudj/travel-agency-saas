import type { TFunction } from "i18next"
import type { Trip } from "../types/trip.types"

/**
 * Compact duration label for list read models. Derived from the trip format:
 * hours for experiences, "Same day" for day excursions, days otherwise.
 * Localized and pluralized through i18next. Latin digits are rendered with
 * Western Arabic numerals (Arabic UI keeps them Latin).
 */
export function formatTripDuration(
  trip: Pick<Trip, "format" | "hours" | "days">,
  t: TFunction
): string {
  if (trip.format === "experience") {
    return t("trips:duration.hours", { count: trip.hours ?? 0 })
  }
  if (trip.format === "day_excursion") {
    return t("trips:duration.sameDay")
  }
  return t("trips:duration.days", { count: trip.days })
}