import type {
  ActivityRequirements,
  AccommodationType,
  AvailabilityMode,
  GeographicScope,
  GuidanceType,
  ParticipationMode,
  TransportMode,
  Trip,
  TripActivity,
  TripAudience,
  TripFormat,
  TripLocationDraft,
  TripStatus,
  TripTheme,
} from "../types/trip.types"
import type { CreateTripFormValues } from "../schemas/create-trip.schema"
import type { TripFormValues } from "../schemas/trip.schema"
import type {
  AgencyTour,
  TourItineraryDay,
  TourGalleryItem,
  TourListItem,
  TourLocation,
  TourPayload,
  TourStatus,
  TourTextItem,
} from "../types/tour.types"
import { tourLocationName } from "./tour-destination-display.ts"

/**
 * Mapping between the editor's TripFormValues and the backend Tour aggregate.
 * One direction builds the strict `TourPayload` (status and the pricing /
 * extras arrays are deliberately dropped — those move only through dedicated
 * actions or later modules), the other inflates a stored tour back into
 * editable form values.
 *
 * Pure functions, no React, no `@/` imports — loaded directly by `node --test`.
 */

function emptyLocation(): TourLocation {
  return {
    wilayaCode: null,
    cityId: null,
    place: null,
  }
}

/** A blank form field means "no value", never a stored `""` stub. */
function trimToNull(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function locationToPayload(
  location: TripLocationDraft | TourLocation
): TourLocation {
  return {
    wilayaCode: trimToNull(location.wilayaCode),
    cityId: trimToNull(location.cityId),
    place: trimToNull(location.place),
  }
}

function locationToDraft(location: TourLocation): {
  wilayaCode: string
  cityId: string
  place: string
} {
  return {
    wilayaCode: location.wilayaCode ?? "",
    cityId: location.cityId ?? "",
    place: location.place ?? "",
  }
}

function textItems(values: Array<{ text?: string }>): TourTextItem[] {
  return values
    .map((item) => item.text?.trim() ?? "")
    .filter((text) => text.length > 0)
    .map((text) => ({ text }))
}

function galleryItems(values: Array<{ url?: string }>): TourGalleryItem[] {
  return values
    .map((item) => item.url?.trim() ?? "")
    .filter((url) => url.length > 0)
    .map((url) => ({ url }))
}

/**
 * Only complete itinerary days are sent. The editor keeps day rows around
 * while they are being filled; the backend requires all three fields and is
 * strict, so incomplete rows would otherwise fail the whole save.
 */
function itineraryDays(
  values: TripFormValues["itinerary"]
): TourItineraryDay[] {
  return values
    .map((day) => ({
      title: day.title.trim(),
      location: day.location.trim(),
      description: day.description.trim(),
    }))
    .filter(
      (day) =>
        day.title.length > 0 && day.location.length > 0 && day.description.length > 0
    )
}

function cleanStrings(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0)
}

/**
 * The physical profile becomes `null` when it carries no actual requirement,
 * matching the backend's nullable JSON column.
 */
function activityRequirementsToPayload(
  requirements: TripFormValues["activityRequirements"]
): Record<string, unknown> | null {
  if (!requirements) return null

  const payload: Record<string, unknown> = {}
  if (requirements.difficulty) payload.difficulty = requirements.difficulty
  if (requirements.distanceKm != null) payload.distanceKm = requirements.distanceKm
  if (requirements.elevationGainM != null) {
    payload.elevationGainM = requirements.elevationGainM
  }
  if (requirements.minimumAge != null) payload.minimumAge = requirements.minimumAge
  if (requirements.fitnessLevel) payload.fitnessLevel = requirements.fitnessLevel
  const equipment = trimToNull(requirements.requiredEquipment)
  if (equipment) payload.requiredEquipment = equipment

  return Object.keys(payload).length === 0 ? null : payload
}

/**
 * The full aggregate payload from the editor form. `status` is excluded — the
 * backend moves it only through publish / unpublish / archive. Extras are
 * excluded too (a later module owns them); pricing options moved out of the
 * form entirely into the live Pricing module.
 */
export function buildTourPayload(form: TripFormValues): TourPayload {
  return {
    name: form.name.trim(),
    internalRef: trimToNull(form.internalRef),
    format: form.format,
    geographicScope: form.geographicScope,
    availabilityMode: form.availabilityMode,
    participationMode: trimToNull(form.participationMode),
    guidanceType: trimToNull(form.guidanceType),
    origin: locationToPayload(form.origin),
    destinations: form.destinations.map(locationToPayload),
    days: typeof form.days === "number" ? form.days : null,
    nights: typeof form.nights === "number" ? form.nights : null,
    hours: typeof form.hours === "number" ? form.hours : null,
    isFlexible: form.isFlexible,
    languages: cleanStrings(form.languages),
    minTravelers: form.minTravelers ?? 1,
    themes: [...form.themes],
    activities: [...form.activities],
    audiences: [...form.audiences],
    activityRequirements: activityRequirementsToPayload(form.activityRequirements),
    transportModes: [...form.transportModes],
    accommodationTypes: [...form.accommodationTypes],
    shortDescription: trimToNull(form.shortDescription),
    description: trimToNull(form.description),
    highlights: textItems(form.highlights),
    itinerary: itineraryDays(form.itinerary),
    included: textItems(form.included),
    notIncluded: textItems(form.notIncluded),
    importantInformation: trimToNull(form.importantInformation),
    cancellationPolicy: trimToNull(form.cancellationPolicy),
    meetingPoint: trimToNull(form.meetingPoint),
    meetingInstructions: trimToNull(form.meetingInstructions),
    coverImageUrl: trimToNull(form.coverImageUrl),
    gallery: galleryItems(form.gallery),
  }
}

/**
 * Payload from the six-field create drawer. The backend fills the rest with
 * its own defaults; the payload only needs what the drawer actually captured
 * plus the explicit "empty" values the strict schema requires.
 */
export function buildCreateTourPayload(
  input: CreateTripFormValues
): TourPayload {
  const destination: TourLocation = {
    wilayaCode: trimToNull(input.destination.wilayaCode),
    cityId: trimToNull(input.destination.cityId),
    place: trimToNull(input.destination.place),
  }

  return {
    name: input.name.trim(),
    internalRef: null,
    format: input.format,
    geographicScope: input.geographicScope,
    availabilityMode: input.availabilityMode,
    participationMode: null,
    guidanceType: null,
    origin: emptyLocation(),
    destinations: [destination],
    days: typeof input.days === "number" ? input.days : null,
    nights: typeof input.nights === "number" ? input.nights : null,
    hours: typeof input.hours === "number" ? input.hours : null,
    isFlexible: input.isFlexible,
    languages: [],
    minTravelers: 1,
    themes: [],
    activities: [],
    audiences: [],
    activityRequirements: null,
    transportModes: [],
    accommodationTypes: [],
    shortDescription: null,
    description: null,
    highlights: [],
    itinerary: [],
    included: [],
    notIncluded: [],
    importantInformation: null,
    cancellationPolicy: null,
    meetingPoint: null,
    meetingInstructions: null,
    coverImageUrl: null,
    gallery: [],
  }
}

/** Inflates a stored tour into editable form values for the editor session. */
export function toTripFormValues(tour: AgencyTour): TripFormValues {
  return {
    status: toTripStatus(tour.status),
    name: tour.name,
    internalRef: tour.internalRef ?? "",
    format: tour.format as TripFormat,
    geographicScope: tour.geographicScope as GeographicScope,
    availabilityMode: tour.availabilityMode as AvailabilityMode,
    participationMode: (tour.participationMode ?? "") as ParticipationMode | "",
    guidanceType: (tour.guidanceType ?? "") as GuidanceType | "",
    origin: locationToDraft(tour.origin),
    destinations: tour.destinations.map(locationToDraft),
    days: tour.days ?? undefined,
    nights: tour.nights ?? undefined,
    hours: tour.hours ?? undefined,
    isFlexible: tour.isFlexible,
    languages: [...tour.languages],
    minTravelers: tour.minTravelers,
    themes: tour.themes as TripTheme[],
    activities: tour.activities as TripActivity[],
    audiences: tour.audiences as TripAudience[],
    activityRequirements: (tour.activityRequirements ?? {}) as ActivityRequirements,
    transportModes: tour.transportModes as TransportMode[],
    accommodationTypes: tour.accommodationTypes as AccommodationType[],
    shortDescription: tour.shortDescription ?? "",
    description: tour.description ?? "",
    highlights: tour.highlights.map((item) => ({ text: item.text })),
    itinerary: tour.itinerary.map((day) => ({
      title: day.title,
      location: day.location,
      description: day.description,
    })),
    included: tour.included.map((item) => ({ text: item.text })),
    notIncluded: tour.notIncluded.map((item) => ({ text: item.text })),
    importantInformation: tour.importantInformation ?? "",
    cancellationPolicy: tour.cancellationPolicy ?? "",
    meetingPoint: tour.meetingPoint ?? "",
    meetingInstructions: tour.meetingInstructions ?? "",
    // Extras are later-module data; the editor keeps its own empty collection
    // for them until that module lands.
    extras: [],
    coverImageUrl: tour.coverImageUrl ?? "",
    gallery: tour.gallery.map((item) => ({ url: item.url })),
  }
}

const TOUR_STATUS_UP: Record<TripStatus, TourStatus> = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED",
}

const TOUR_STATUS_DOWN: Record<TourStatus, TripStatus> = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
}

export function toTourStatus(status: TripStatus): TourStatus {
  return TOUR_STATUS_UP[status]
}

export function toTripStatus(status: TourStatus): TripStatus {
  return TOUR_STATUS_DOWN[status]
}

/** One list row into the UI table read model. */
export function toTripRow(item: TourListItem): Trip {
  return {
    id: item.code,
    name: item.name,
    internalRef: item.internalRef ?? undefined,
    status: toTripStatus(item.status),
    coverImageUrl: item.coverImageUrl ?? undefined,
    destinations: item.destinations
      .map((location) => ({ name: tourLocationName(location) }))
      .filter((destination) => destination.name.length > 0),
    format: item.format as TripFormat,
    geographicScope: item.geographicScope as GeographicScope,
    availabilityMode: item.availabilityMode as AvailabilityMode,
    days: item.days ?? 0,
    nights: item.nights ?? 0,
    hours: item.hours,
    nextDeparture: null,
    startingPrice: item.startingPrice,
  }
}

export function toTripRows(items: TourListItem[]): Trip[] {
  return items.map(toTripRow)
}