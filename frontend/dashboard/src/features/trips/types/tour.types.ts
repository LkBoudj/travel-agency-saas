/**
 * Backend tour contracts, mirrored from `backend/src/tours`.
 *
 * The backend names the product a Tour (`TUR-…`, `/v1/.../tours`); this app
 * keeps calling it a Trip at the UI layer. Status here is the backend's
 * uppercase lifecycle; the list/editor UI translated it to the lowercase
 * `TripStatus` read model at the mapping boundary in `lib/tour-payloads.ts`.
 *
 * `code` is the only stable external key — no database id ever crosses the
 * contract, and tenancy is the `:agencyCode` in the route.
 */
export type TourStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"

/** One structured location on the wire (origin and destinations alike). */
export type TourLocation = {
  wilayaCode: string | null
  cityId: string | null
  place: string | null
}

export type TourItineraryDay = {
  title: string
  location: string
  description: string
}

export type TourTextItem = {
  text: string
}

export type TourGalleryItem = {
  url: string
}

/**
 * Full tour record from `GET .../tours/:tourCode`. The writable fields line up
 * with `TourPayload`; reads add `code`, `status` and audit timestamps.
 */
export type AgencyTour = {
  code: string
  name: string
  internalRef: string | null
  status: TourStatus
  format: string
  geographicScope: string
  availabilityMode: string
  participationMode: string | null
  guidanceType: string | null
  days: number | null
  nights: number | null
  hours: number | null
  isFlexible: boolean
  minTravelers: number
  languages: string[]
  themes: string[]
  activities: string[]
  audiences: string[]
  activityRequirements: Record<string, unknown> | null
  transportModes: string[]
  accommodationTypes: string[]
  shortDescription: string | null
  description: string | null
  highlights: TourTextItem[]
  itinerary: TourItineraryDay[]
  included: TourTextItem[]
  notIncluded: TourTextItem[]
  importantInformation: string | null
  cancellationPolicy: string | null
  meetingPoint: string | null
  meetingInstructions: string | null
  coverImageUrl: string | null
  gallery: TourGalleryItem[]
  origin: TourLocation
  destinations: TourLocation[]
  /** Derived once per read: min amount across OPEN departures; null when none. */
  startingPrice: number | null
  createdAt: string
  updatedAt: string
}

/**
 * Light list row for the trips management table — the long copy blocks are
 * deliberately absent. `GET .../tours` returns these.
 */
export type TourListItem = {
  code: string
  name: string
  internalRef: string | null
  status: TourStatus
  coverImageUrl: string | null
  format: string
  geographicScope: string
  availabilityMode: string
  days: number | null
  nights: number | null
  hours: number | null
  destinations: TourLocation[]
  /** Derived once per read: min amount across OPEN departures; null when none. */
  startingPrice: number | null
  createdAt: string
  updatedAt: string
}

/**
 * The writable aggregate, shared by create and update (`PUT` full replacement).
 * Status is NOT part of the payload — it moves only through the explicit
 * publish / unpublish / archive actions. Departures, prices and extras belong
 * to later modules and are deliberately never sent.
 */
export type TourPayload = {
  name: string
  internalRef: string | null
  format: string
  geographicScope: string
  availabilityMode: string
  participationMode: string | null
  guidanceType: string | null
  origin: TourLocation
  destinations: TourLocation[]
  days: number | null
  nights: number | null
  hours: number | null
  isFlexible: boolean
  languages: string[]
  minTravelers: number
  themes: string[]
  activities: string[]
  audiences: string[]
  activityRequirements: Record<string, unknown> | null
  transportModes: string[]
  accommodationTypes: string[]
  shortDescription: string | null
  description: string | null
  highlights: TourTextItem[]
  itinerary: TourItineraryDay[]
  included: TourTextItem[]
  notIncluded: TourTextItem[]
  importantInformation: string | null
  cancellationPolicy: string | null
  meetingPoint: string | null
  meetingInstructions: string | null
  coverImageUrl: string | null
  gallery: TourGalleryItem[]
}