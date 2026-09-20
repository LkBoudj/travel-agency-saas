import type { ReadinessResult } from "../types/trip.types"

/**
 * Pure trip-domain helpers: publish readiness and structural-change
 * detection. No React, i18n, Zod, or persistence. Semantic keys only —
 * the UI translates them.
 */

/** The shape the readiness rules read from the editor draft. */
export type PublishReadinessInput = {
  status: unknown
  name: string
  format: unknown
  geographicScope: unknown
  destinations: Array<{ wilayaCode?: string; place?: string }>
  shortDescription: string
  coverImageUrl: string
  availabilityMode: unknown
  /** Count of OPEN departures — the only thing scheduling readiness needs. */
  openDepartureCount: number
  /** ACTIVE pricing options — pricing readiness needs at least one. */
  pricingOptionCount: number
  /** OPEN departures holding ≥1 price — pricing needs a real price too. */
  pricedOpenDepartureCount: number
  themes: string[]
  meetingInstructions: string
  itinerary: unknown[]
}

const MULTI_DAY_FORMATS = new Set(["stay", "circuit", "cruise"])

/**
 * Judgement on whether a draft can ship to customers.
 *
 * Required (counted against readiness progress):
 * - name            → basic information
 * - destination     → at least one resolved stop
 * - shortDescription→ customer-facing summary
 * - coverImage      → cover photo
 * - availability    → availability is set; scheduled additionally needs
 *                     at least one open departure
 *
 * Recommended (not counted toward progress):
 * - pricing (needs both a category and a real price on an open departure),
 *   meetingInstructions, themes, itinerary
 */
export function computePublishReadiness(
  input: PublishReadinessInput
): ReadinessResult {
  const hasResolvedDestination = input.destinations.some((destination) => {
    if (input.geographicScope === "international") {
      return Boolean(destination.place?.trim())
    }
    return Boolean(destination.wilayaCode?.trim())
  })

  const availabilitySatisfied =
    typeof input.availabilityMode === "string" &&
    input.availabilityMode.length > 0 &&
    (input.availabilityMode !== "scheduled" || input.openDepartureCount > 0)

  const badge = (key: string, label: string, satisfied: boolean) => ({
    key,
    label,
    satisfied,
  })

  const required = [
    badge("name", "Basic information", input.name.trim().length > 0),
    badge("destination", "Destination", hasResolvedDestination),
    badge(
      "shortDescription",
      "Customer-facing summary",
      input.shortDescription.trim().length > 0
    ),
    badge("coverImage", "Cover photo", input.coverImageUrl.trim().length > 0),
    badge("availability", "Availability", availabilitySatisfied),
  ]

  const recommended = [
    badge(
      "pricing",
      "Pricing",
      input.pricingOptionCount > 0 && input.pricedOpenDepartureCount > 0
    ),
    badge(
      "meetingInstructions",
      "Meeting instructions",
      input.meetingInstructions.trim().length > 0
    ),
    badge("themes", "Themes", input.themes.length > 0),
    badge("itinerary", "Itinerary", input.itinerary.length > 0),
  ]

  return {
    required,
    recommended,
    canPublish: required.every((item) => item.satisfied),
  }
}

/** Fields whose change is a structural trip change (needs explicit confirm). */
const STRUCTURAL_FIELDS = new Set([
  "format",
  "geographicScope",
  "availabilityMode",
  "status",
])

/**
 * True when the change to `field` reshapes the product beyond content edits.
 * Used to gate destructive switches behind an explicit user confirmation
 * (e.g. format change, scope change) before the change is persisted.
 */
export function isStructuralChange<T extends object>(
  _trip: T,
  field: keyof T
): boolean {
  return STRUCTURAL_FIELDS.has(String(field))
}

/** True when the format is a multi-day product type. */
export function isMultiDayFormat(format: unknown): boolean {
  return typeof format === "string" && MULTI_DAY_FORMATS.has(format)
}

/** True when the availability mode is a fixed-schedule (departure-driven). */
export function isScheduledAvailability(availabilityMode: unknown): boolean {
  return availabilityMode === "scheduled"
}