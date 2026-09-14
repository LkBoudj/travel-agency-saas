import type { AppLocale } from "@/i18n"
import { getWilayaLabel } from "@/constants/algeria-geo"
import type { TripLocationDraft } from "../types/trip.types"

/**
 * Compact human-readable label for an edited trip location, resolved for the
 * active locale. The stored value stays a stable wilaya code; this resolves
 * only what users see.
 *
 * Composition rules:
 * - Specific place first, then the administrative context: "Tikjda, Bouira".
 * - International scope uses the free-text `place` as the destination label.
 * - Duplicated admin/place parts collapse (e.g. "Ghardaia, Ghardaia" → "Ghardaia").
 */
export function resolveTripLocationLabel(
  location: TripLocationDraft | undefined,
  locale: AppLocale
): string {
  if (!location) return ""

  const place = location.place?.trim() || ""
  const city = location.cityId?.trim() || ""
  const wilaya = location.wilayaCode
    ? getWilayaLabel(location.wilayaCode, locale)
    : ""

  const primary = place || city
  if (primary && wilaya && primary !== wilaya) {
    return `${primary}, ${wilaya}`
  }
  return primary || wilaya
}