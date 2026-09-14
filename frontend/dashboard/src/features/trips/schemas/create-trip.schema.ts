import type { TFunction } from "i18next"
import { z } from "zod"
import {
  TRIP_FORMATS,
  GEOGRAPHIC_SCOPES,
  AVAILABILITY_MODES,
} from "../types/trip.types"

const multiDayFormats = ["stay", "circuit", "cruise"] as const

const createDestinationSchema = () =>
  z.object({
    wilayaCode: z.string(),
    cityId: z.string(),
    place: z.string(),
  })

/**
 * Create Trip drawer schema — the six fields only: name, format, geographic
 * scope, destination, availability, duration. Scope-aware destination rule:
 * domestic resolves to a wilaya, international to its free-text place.
 */
export function createCreateTripSchema(t: TFunction) {
  return z
    .object({
      name: z.string().min(1, t("trips:validation.tripNameRequired")),
      format: z.enum(TRIP_FORMATS).or(z.literal("")),
      geographicScope: z.enum(GEOGRAPHIC_SCOPES).or(z.literal("")),
      availabilityMode: z.enum(AVAILABILITY_MODES),
      destination: createDestinationSchema(),
      days: z.number().int().optional(),
      nights: z.number().int().optional(),
      hours: z.number().int().optional(),
      isFlexible: z.boolean(),
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

      const { destination } = value
      if (value.geographicScope === "international") {
        if (!destination.place?.trim()) {
          addIssue(
            ["destination", "place"],
            t("trips:validation.destinationPlaceRequired")
          )
        }
      } else if (!destination.wilayaCode?.trim()) {
        addIssue(
          ["destination", "wilayaCode"],
          t("trips:validation.destinationWilayaRequired")
        )
      }

      if (value.format === "experience") {
        const hours = value.hours
        if (
          typeof hours !== "number" ||
          hours <= 0 ||
          !Number.isInteger(hours)
        ) {
          addIssue(["hours"], t("trips:validation.hoursPositive"))
        }
      }

      if (
        multiDayFormats.includes(
          value.format as (typeof multiDayFormats)[number]
        )
      ) {
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

export type CreateTripFormValues = z.infer<
  ReturnType<typeof createCreateTripSchema>
>

export function createEmptyCreateTrip(): CreateTripFormValues {
  return {
    name: "",
    format: "",
    geographicScope: "domestic",
    availabilityMode: "scheduled",
    destination: { wilayaCode: "", cityId: "", place: "" },
    days: 1,
    nights: 0,
    hours: 3,
    isFlexible: false,
  }
}