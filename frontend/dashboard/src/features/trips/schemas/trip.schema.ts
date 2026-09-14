import type { TFunction } from "i18next"
import { z } from "zod"
import {
  TRIP_FORMATS,
  GEOGRAPHIC_SCOPES,
  AVAILABILITY_MODES,
  PARTICIPATION_MODES,
  GUIDANCE_TYPES,
  TRIP_THEMES,
  TRIP_ACTIVITIES,
  TRIP_AUDIENCES,
  TRANSPORT_MODES,
  ACCOMMODATION_TYPES,
  DIFFICULTY_LEVELS,
  FITNESS_LEVELS,
} from "../types/trip.types"

/**
 * Structured location (origin or one destination).
 *
 * Hierarchy: Country → Regional wilaya → City/Commune → optional specific place.
 * All fields are optional at the schema level; "required" depends on scope:
 * - origin fields are validated separately (departure is in Algeria) but are
 *   NOT required for draft creation; the user sets them later in the editor.
 * - domestic destination requires its wilaya
 * - international destination falls back to the free-text place
 * The superRefine below enforces destination scope-specific rules.
 */
function createTripLocationDraftSchema() {
  return z.object({
    wilayaCode: z.string(),
    cityId: z.string(),
    place: z.string(),
  })
}

function createHighlightSchema(t: TFunction) {
  return z.object({
    text: z.string().min(1, t("trips:validation.highlightRequired")),
  })
}

function createItineraryDaySchema(t: TFunction) {
  return z.object({
    title: z.string().min(1, t("trips:validation.dayTitleRequired")),
    location: z.string().min(1, t("trips:validation.locationRequired")),
    description: z.string(),
  })
}

function createPricingOptionSchema(t: TFunction) {
  return z.object({
    name: z.string().min(1, t("trips:validation.pricingOptionNameRequired")),
    description: z.string(),
    basis: z.enum(["per_person", "per_booking"]),
    active: z.boolean(),
  })
}

function createIncludedItemSchema(t: TFunction) {
  return z.object({
    text: z.string().min(1, t("trips:validation.itemRequired")),
  })
}

function createExtraSchema(t: TFunction) {
  return z.object({
    name: z.string().min(1, t("trips:validation.extraNameRequired")),
    description: z.string(),
    price: z.coerce
      .number()
      .nonnegative(t("trips:validation.priceNotNegative")),
    basis: z.enum(["per_person", "per_booking"]),
  })
}

function createDeparturePriceBandSchema(t: TFunction) {
  return z.object({
    pricingOption: z.string().min(1),
    price: z.coerce
      .number()
      .nonnegative(t("trips:validation.priceNotNegative")),
  })
}

function createDepartureSchema(t: TFunction) {
  return z
    .object({
      startAt: z.string().min(1, t("trips:validation.startAtRequired")),
      endAt: z.string().min(1, t("trips:validation.endAtRequired")),
      capacity: z.coerce
        .number()
        .int()
        .positive(t("trips:validation.capacityPositive")),
      bookingDeadline: z
        .string()
        .min(1, t("trips:validation.bookingDeadlineRequired")),
      status: z.enum(["open", "closed", "sold_out", "cancelled"]),
      notes: z.string(),
      prices: z.array(createDeparturePriceBandSchema(t)),
    })
    .superRefine((departure, ctx) => {
      if (departure.endAt < departure.startAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endAt"],
          message: t("trips:validation.endAfterStart"),
        })
      }
    })
}

/** Physical profile. Optional; every number must stay non-negative. */
function createActivityRequirementsSchema(t: TFunction) {
  return z
    .object({
      difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
      distanceKm: z
        .number()
        .int()
        .nonnegative(t("trips:validation.distanceNotNegative"))
        .nullable()
        .optional(),
      elevationGainM: z
        .number()
        .int()
        .nonnegative(t("trips:validation.elevationNotNegative"))
        .nullable()
        .optional(),
      minimumAge: z
        .number()
        .int()
        .nonnegative(t("trips:validation.minimumAgeNotNegative"))
        .nullable()
        .optional(),
      fitnessLevel: z.enum(FITNESS_LEVELS).optional(),
      requiredEquipment: z.string().optional(),
    })
    .optional()
}

const multiDayFormats = ["stay", "circuit", "cruise"] as const

/**
 * Full trip editor schema.
 *
 * Trip-level and departure-level responsibilities stay separated:
 * - capacity and final prices belong to departures
 * - minimum travelers sits on the trip (not a capacity field)
 *
 * Duration is derived from the trip format:
 * - experience → a positive whole number of hours
 * - day_excursion → same-day, no overnight
 * - stay / circuit / cruise → days with nights between 0 and days
 * Day/night/hour values kept when hidden so a format switch never erases them.
 *
 * Messages are localized per active language.
 */
export function createTripFormSchema(t: TFunction) {
  return z
    .object({
      status: z.enum(["draft", "published", "archived"]),
      name: z.string().min(1, t("trips:validation.tripNameRequired")),
      internalRef: z.string(),
      format: z.enum(TRIP_FORMATS).or(z.literal("")),
      geographicScope: z.enum(GEOGRAPHIC_SCOPES).or(z.literal("")),
      availabilityMode: z.enum(AVAILABILITY_MODES),
      participationMode: z.enum(PARTICIPATION_MODES).or(z.literal("")).optional(),
      guidanceType: z.enum(GUIDANCE_TYPES).or(z.literal("")).optional(),
      origin: createTripLocationDraftSchema(),
      destinations: z
        .array(createTripLocationDraftSchema())
        .min(1, t("trips:validation.atLeastOneDestination")),
      days: z.number().int().optional(),
      nights: z.number().int().optional(),
      hours: z.number().int().optional(),
      isFlexible: z.boolean(),
      languages: z.array(z.string()),
      minTravelers: z.coerce
        .number()
        .int()
        .nonnegative(t("trips:validation.minimumTravelersNotNegative")),
      themes: z.array(z.enum(TRIP_THEMES)),
      activities: z.array(z.enum(TRIP_ACTIVITIES)),
      audiences: z.array(z.enum(TRIP_AUDIENCES)),
      activityRequirements: createActivityRequirementsSchema(t),
      transportModes: z.array(z.enum(TRANSPORT_MODES)),
      accommodationTypes: z.array(z.enum(ACCOMMODATION_TYPES)),
      shortDescription: z
        .string()
        .min(1, t("trips:validation.shortDescriptionRequired"))
        .max(160, t("trips:validation.shortDescriptionMax")),
      description: z.string(),
      highlights: z.array(createHighlightSchema(t)),
      itinerary: z.array(createItineraryDaySchema(t)),
      pricingOptions: z.array(createPricingOptionSchema(t)),
      departures: z.array(createDepartureSchema(t)),
      included: z.array(createIncludedItemSchema(t)),
      notIncluded: z.array(createIncludedItemSchema(t)),
      importantInformation: z.string(),
      cancellationPolicy: z.string(),
      meetingPoint: z.string(),
      meetingInstructions: z.string(),
      extras: z.array(createExtraSchema(t)),
      coverImageUrl: z.string(),
      gallery: z.array(z.object({ url: z.string() })),
    })
    .superRefine((value, ctx) => {
      const addIssue = (path: (string | number)[], message: string) => {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path, message })
      }

      if (value.format === "") {
        addIssue(["format"], t("trips:validation.formatRequired"))
      }
      if (value.geographicScope === "") {
        addIssue(["geographicScope"], t("trips:validation.scopeRequired"))
      }

      // Locations: a domestic destination must resolve to a wilaya, an
      // international one to its free-text place. The origin is not part of
      // draft validation — it is completed later in the editor and its wilaya
      // is not required to create or save a draft.
      value.destinations.forEach((destination, index) => {
        if (value.geographicScope === "international") {
          if (!destination.place?.trim()) {
            addIssue(
              ["destinations", index, "place"],
              t("trips:validation.destinationPlaceRequired")
            )
          }
        } else if (!destination.wilayaCode?.trim()) {
          addIssue(
            ["destinations", index, "wilayaCode"],
            t("trips:validation.destinationWilayaRequired")
          )
        }
      })

      if (value.format === "experience") {
        const hours = value.hours
        if (typeof hours !== "number" || hours <= 0 || !Number.isInteger(hours)) {
          addIssue(["hours"], t("trips:validation.hoursPositive"))
        }
      }

      if (multiDayFormats.includes(value.format as (typeof multiDayFormats)[number])) {
        const days = value.days
        const nights = value.nights
        if (typeof days !== "number" || days <= 0 || !Number.isInteger(days)) {
          addIssue(["days"], t("trips:validation.daysPositive"))
        }
        if (typeof nights !== "number" || nights < 0) {
          addIssue(["nights"], t("trips:validation.nightsNotNegative"))
        } else if (typeof days === "number" && nights > days) {
          addIssue(["nights"], t("trips:validation.nightsExceedDays"))
        }
      }
    })
}

export type TripFormValues = z.infer<ReturnType<typeof createTripFormSchema>>