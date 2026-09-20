/** Lifecycle states of a reusable travel product. */
export type TripStatus = "draft" | "published" | "archived"

/** How a price component is charged to the customer. */
export type PricingBasis = "per_person" | "per_booking"

/** Product shape of the trip: determines how duration and logistics work. */
export const TRIP_FORMATS = [
  "experience",
  "day_excursion",
  "stay",
  "circuit",
  "cruise",
] as const
export type TripFormat = (typeof TRIP_FORMATS)[number]

/** Domestic home-country constant (Algeria). */
export const HOME_COUNTRY_CODE = "DZ" as const

/** Presentation keys for domain enums, resolved through i18next. */
export const TRIP_FORMAT_LABELS: Record<TripFormat, string> = {
  experience: "trips:format.experience",
  day_excursion: "trips:format.day_excursion",
  stay: "trips:format.stay",
  circuit: "trips:format.circuit",
  cruise: "trips:format.cruise",
}

/** Whether the trip visits places outside the agency's home country. */
export const GEOGRAPHIC_SCOPES = ["domestic", "international"] as const
export type GeographicScope = (typeof GEOGRAPHIC_SCOPES)[number]

export const GEOGRAPHIC_SCOPE_LABELS: Record<GeographicScope, string> = {
  domestic: "trips:scope.domestic",
  international: "trips:scope.international",
}

/** How travelers actually book this product. */
export const AVAILABILITY_MODES = [
  "scheduled",
  "on_request",
  "custom_quote",
] as const
export type AvailabilityMode = (typeof AVAILABILITY_MODES)[number]

export const AVAILABILITY_MODE_LABELS: Record<AvailabilityMode, string> = {
  scheduled: "trips:availability.scheduled",
  on_request: "trips:availability.on_request",
  custom_quote: "trips:availability.custom_quote",
}

/** Traveler composition mode. Metadata only — no pricing logic. */
export const PARTICIPATION_MODES = [
  "shared_group",
  "private",
  "individual",
] as const
export type ParticipationMode = (typeof PARTICIPATION_MODES)[number]

export const PARTICIPATION_MODE_LABELS: Record<ParticipationMode, string> = {
  shared_group: "trips:participation.shared_group",
  private: "trips:participation.private",
  individual: "trips:participation.individual",
}

/** How travellers are accompanied during the trip. Optional. */
export const GUIDANCE_TYPES = ["guided", "escorted", "self_guided", "mixed"] as const
export type GuidanceType = (typeof GUIDANCE_TYPES)[number]

export const GUIDANCE_TYPE_LABELS: Record<GuidanceType, string> = {
  guided: "trips:guidance.guided",
  escorted: "trips:guidance.escorted",
  self_guided: "trips:guidance.self_guided",
  mixed: "trips:guidance.mixed",
}

/** Experience categories. The vibe of the trip, not the logistics. */
export const TRIP_THEMES = [
  "nature",
  "mountain",
  "sahara_desert",
  "beach_coastal",
  "cultural",
  "heritage_history",
  "religious_spiritual",
  "wellness",
  "adventure",
  "eco_tourism",
  "urban_city",
  "gastronomy",
  "festival_event",
  "luxury",
] as const
export type TripTheme = (typeof TRIP_THEMES)[number]

export const TRIP_THEME_LABELS: Record<TripTheme, string> = {
  nature: "trips:theme.nature",
  mountain: "trips:theme.mountain",
  sahara_desert: "trips:theme.sahara_desert",
  beach_coastal: "trips:theme.beach_coastal",
  cultural: "trips:theme.cultural",
  heritage_history: "trips:theme.heritage_history",
  religious_spiritual: "trips:theme.religious_spiritual",
  wellness: "trips:theme.wellness",
  adventure: "trips:theme.adventure",
  eco_tourism: "trips:theme.eco_tourism",
  urban_city: "trips:theme.urban_city",
  gastronomy: "trips:theme.gastronomy",
  festival_event: "trips:theme.festival_event",
  luxury: "trips:theme.luxury",
}

/** Concrete physical experiences travelers take part in. */
export const TRIP_ACTIVITIES = [
  "hiking",
  "trekking",
  "walking_tour",
  "sightseeing",
  "guided_visit",
  "museum_archaeology",
  "camping",
  "offroad_4x4",
  "camel_trek",
  "cycling",
  "horse_riding",
  "boat_trip",
  "swimming_beach",
  "fishing",
  "skiing_snow",
  "climbing",
  "kayaking",
  "diving",
  "wellness_hammam",
  "craft_workshop",
  "food_tasting",
  "photography",
  "festival",
] as const
export type TripActivity = (typeof TRIP_ACTIVITIES)[number]

export const TRIP_ACTIVITY_LABELS: Record<TripActivity, string> = {
  hiking: "trips:activity.hiking",
  trekking: "trips:activity.trekking",
  walking_tour: "trips:activity.walking_tour",
  sightseeing: "trips:activity.sightseeing",
  guided_visit: "trips:activity.guided_visit",
  museum_archaeology: "trips:activity.museum_archaeology",
  camping: "trips:activity.camping",
  offroad_4x4: "trips:activity.offroad_4x4",
  camel_trek: "trips:activity.camel_trek",
  cycling: "trips:activity.cycling",
  horse_riding: "trips:activity.horse_riding",
  boat_trip: "trips:activity.boat_trip",
  swimming_beach: "trips:activity.swimming_beach",
  fishing: "trips:activity.fishing",
  skiing_snow: "trips:activity.skiing_snow",
  climbing: "trips:activity.climbing",
  kayaking: "trips:activity.kayaking",
  diving: "trips:activity.diving",
  wellness_hammam: "trips:activity.wellness_hammam",
  craft_workshop: "trips:activity.craft_workshop",
  food_tasting: "trips:activity.food_tasting",
  photography: "trips:activity.photography",
  festival: "trips:activity.festival",
}

/** Who the product is designed for. Optional, used on marketplace cards. */
export const TRIP_AUDIENCES = [
  "families",
  "couples",
  "honeymoon",
  "friends",
  "solo",
  "youth",
  "seniors",
  "corporate",
] as const
export type TripAudience = (typeof TRIP_AUDIENCES)[number]

export const TRIP_AUDIENCE_LABELS: Record<TripAudience, string> = {
  families: "trips:audience.families",
  couples: "trips:audience.couples",
  honeymoon: "trips:audience.honeymoon",
  friends: "trips:audience.friends",
  solo: "trips:audience.solo",
  youth: "trips:audience.youth",
  seniors: "trips:audience.seniors",
  corporate: "trips:audience.corporate",
}

/** Physical difficulty rating of the trip's main activities. */
export const DIFFICULTY_LEVELS = ["easy", "moderate", "challenging"] as const
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number]

export const DIFFICULTY_LEVEL_LABELS: Record<DifficultyLevel, string> = {
  easy: "trips:difficulty.easy",
  moderate: "trips:difficulty.moderate",
  challenging: "trips:difficulty.challenging",
}

/** Fitness expectation communicated to travelers. */
export const FITNESS_LEVELS = ["basic", "normal", "good", "high"] as const
export type FitnessLevel = (typeof FITNESS_LEVELS)[number]

export const FITNESS_LEVEL_LABELS: Record<FitnessLevel, string> = {
  basic: "trips:fitness.basic",
  normal: "trips:fitness.normal",
  good: "trips:fitness.good",
  high: "trips:fitness.high",
}

/** How travelers get from place to place during the trip. Optional. */
export const TRANSPORT_MODES = [
  "bus",
  "minibus",
  "car",
  "flight",
  "train",
  "boat",
  "offroad_4x4",
  "camel",
  "bicycle",
  "walking",
  "self_drive",
  "mixed",
] as const
export type TransportMode = (typeof TRANSPORT_MODES)[number]

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  bus: "trips:transport.bus",
  minibus: "trips:transport.minibus",
  car: "trips:transport.car",
  flight: "trips:transport.flight",
  train: "trips:transport.train",
  boat: "trips:transport.boat",
  offroad_4x4: "trips:transport.offroad_4x4",
  camel: "trips:transport.camel",
  bicycle: "trips:transport.bicycle",
  walking: "trips:transport.walking",
  self_drive: "trips:transport.self_drive",
  mixed: "trips:transport.mixed",
}

/** Where travelers sleep during the trip. "None" fits single-day formats. */
export const ACCOMMODATION_TYPES = [
  "none",
  "hotel",
  "resort",
  "guesthouse",
  "homestay",
  "camp",
  "mixed",
] as const
export type AccommodationType = (typeof ACCOMMODATION_TYPES)[number]

export const ACCOMMODATION_TYPE_LABELS: Record<AccommodationType, string> = {
  none: "trips:accommodation.none",
  hotel: "trips:accommodation.hotel",
  resort: "trips:accommodation.resort",
  guesthouse: "trips:accommodation.guesthouse",
  homestay: "trips:accommodation.homestay",
  camp: "trips:accommodation.camp",
  mixed: "trips:accommodation.mixed",
}

/** Physical profile shown only when physically demanding activities are set. */
export type ActivityRequirements = {
  difficulty?: DifficultyLevel
  distanceKm?: number | null
  elevationGainM?: number | null
  minimumAge?: number | null
  fitnessLevel?: FitnessLevel
  requiredEquipment?: string
}

/** A city / place the trip visits (multiple allowed, ordered). */
export type TripDestination = { name: string }

/**
 * Editable structured location used by the trip form.
 *
 * Hierarchy: Country → Region/Wilaya → City/Commune → optional Specific Place.
 * The stored identifier for a domestic location is the stable wilaya code;
 * labels are resolved through the active locale at render time.
 */
export type TripLocationDraft = {
  /** Domestic: stable Algerian wilaya code (e.g. "16" for Algiers). */
  wilayaCode?: string
  /** Commune within the selected wilaya. Free text until commune reference data lands. */
  cityId?: string
  /** Specific place where the traveler actually goes; also the international free-text destination. */
  place?: string
}

/**
 * One scheduled day inside the trip's itinerary.
 * The day number is derived from position in the array, not stored.
 */
export type TripItineraryDay = {
  title: string
  location: string
  description: string
}

/** A customer/pricing category. Final prices live on departures, not here. */
export type PricingOption = {
  name: string
  description: string
  basis: PricingBasis
  active: boolean
}

/** Optional add-on purchasable with the trip. */
export type TripExtra = {
  name: string
  description: string
  price: number
  basis: PricingBasis
}

/** Read model for the trips management list. */
export type Trip = {
  id: string
  name: string
  internalRef?: string
  status: TripStatus
  coverImageUrl?: string
  destinations: TripDestination[]
  format: TripFormat
  geographicScope: GeographicScope
  availabilityMode: AvailabilityMode
  days: number
  nights: number
  hours?: number | null
  nextDeparture?: string | null
  startingPrice?: number | null
}

/** Presentation keys for domain enums, kept with their contracts. */
export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  draft: "trips:status.draft",
  published: "trips:status.published",
  archived: "trips:status.archived",
}

export const PRICING_BASIS_LABELS: Record<PricingBasis, string> = {
  per_person: "trips:pricingBasis.per_person",
  per_booking: "trips:pricingBasis.per_booking",
}

// Trip v4 canonical contracts (frozen). The editor keeps its structured
// form model (TripLocationDraft); these types are the persistence boundary.

/** Which unit a trip's duration is expressed in. */
export type DurationShape = "hours" | "same_day" | "days_nights"

/** Frozen v4 duration value. Shape derives from the format. */
export type Duration = {
  shape: DurationShape
  value: number | { days: number; nights: number } | null
  /** Valid only for custom_quote: goal-only duration, value is null. */
  isFlexible: boolean
}

/** Frozen v4 structured place reference. */
export type TripLocation = {
  countryCode: string
  regionCode?: string
  localityId?: string
  specificPlace?: string
}

/** Single readiness line, identified by a stable semantic key (no locale). */
export type ReadinessItem = {
  key: string
  label: string
  satisfied: boolean
}

/** Publish readiness judgement for a trip draft. */
export type ReadinessResult = {
  required: ReadinessItem[]
  recommended: ReadinessItem[]
  canPublish: boolean
}