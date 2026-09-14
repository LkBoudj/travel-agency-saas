import type { TripFormValues } from "../schemas/trip.schema"
import { persistTrip, type CreateTripInput } from "../api/trips.api"

/**
 * Draft utilities: clone, equality, empty draft, create-to-draft mapping,
 * and display-label helpers. Pure functions — no React, no i18n, no
 * persistence. Kept feature-local to trips.
 */

export function cloneDraft(draft: TripFormValues): TripFormValues {
  return structuredClone(draft)
}

export function draftsEqual(a: TripFormValues, b: TripFormValues): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Empty draft used as the default when loading an unknown trip id. */
export function createEmptyDraft(): TripFormValues {
  return {
    status: "draft",
    name: "",
    internalRef: "",
    format: "",
    geographicScope: "",
    availabilityMode: "scheduled",
    participationMode: "",
    guidanceType: "",
    origin: { wilayaCode: "", cityId: "", place: "" },
    destinations: [{ wilayaCode: "", cityId: "", place: "" }],
    days: 1,
    nights: 0,
    hours: 3,
    isFlexible: false,
    languages: [],
    minTravelers: 1,
    themes: [],
    activities: [],
    audiences: [],
    activityRequirements: {},
    transportModes: [],
    accommodationTypes: [],
    shortDescription: "",
    description: "",
    highlights: [],
    itinerary: [],
    pricingOptions: [],
    departures: [],
    included: [],
    notIncluded: [],
    importantInformation: "",
    cancellationPolicy: "",
    meetingPoint: "",
    meetingInstructions: "",
    extras: [],
    coverImageUrl: "",
    gallery: [],
  }
}

/**
 * Persist a create-trip payload (the 6-field form) as a new draft and return
 * its id + draft for navigation and toast. Canonical == saved copy.
 */
export function persistCreatePayload(
  input: CreateTripInput
): { id: string; draft: TripFormValues } {
  const defaults = createEmptyDraft()
  return persistTrip(input, defaults)
}

/** Stable display label for the editor header / breadcrumb. */
export function resolveTripLabel(
  draft: TripFormValues | null,
  fallback: string
): string {
  return draft?.name?.trim() || fallback
}
