import type { TripFormValues } from "../schemas/trip.schema"

/**
 * Draft utilities: clone, equality, and the empty draft used before a stored
 * tour loads. Pure functions — no React, no i18n, no persistence. Kept
 * feature-local to trips.
 */

export function cloneDraft(draft: TripFormValues): TripFormValues {
  return structuredClone(draft)
}

export function draftsEqual(a: TripFormValues, b: TripFormValues): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Empty draft used when no stored tour has loaded yet. */
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
