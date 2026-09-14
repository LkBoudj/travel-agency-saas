import type { TFunction } from "i18next"
import { getWilayaLabel, wilayaOptions as wilayaSelectOptions } from "@/constants/algeria-geo"
import type { AppLocale } from "@/i18n"
import {
  AGENCY_SERVICE_TYPES,
  AUTHORIZATION_TYPES,
  CONTACT_TYPES,
  DAYS_OF_WEEK,
  SOCIAL_PLATFORMS,
  VISIBILITIES,
} from "../types/agency.types"

export type AgencyOption<V extends string> = { value: V; labelKey: string }

function toOptions<V extends string>(
  values: readonly V[],
  labelKeys: Record<V, string>
): AgencyOption<V>[] {
  return values.map((v) => ({ value: v, labelKey: labelKeys[v] }))
}

export const CONTACT_TYPE_OPTIONS = toOptions(CONTACT_TYPES, {
  phone: "agency:contacts.types.phone",
  mobile: "agency:contacts.types.mobile",
  whatsapp: "agency:contacts.types.whatsapp",
  email: "agency:contacts.types.email",
})

export const VISIBILITY_OPTIONS = toOptions(VISIBILITIES, {
  public: "agency:visibility.public",
  internal: "agency:visibility.internal",
})

export const SERVICE_TYPE_OPTIONS = toOptions(AGENCY_SERVICE_TYPES, {
  domestic_tours: "agency:services.types.domestic_tours",
  international_tours: "agency:services.types.international_tours",
  desert_safari: "agency:services.types.desert_safari",
  beach_holidays: "agency:services.types.beach_holidays",
  cultural_heritage: "agency:services.types.cultural_heritage",
  omra: "agency:services.types.omra",
  hajj: "agency:services.types.hajj",
  business_travel: "agency:services.types.business_travel",
  visa_assistance: "agency:services.types.visa_assistance",
  airline_tickets: "agency:services.types.airline_tickets",
  hotel_reservations: "agency:services.types.hotel_reservations",
  transfers: "agency:services.types.transfers",
  custom_travel: "agency:services.types.custom_travel",
  other: "agency:services.types.other",
})

export const AUTHORIZATION_TYPE_OPTIONS = toOptions(AUTHORIZATION_TYPES, {
  omra: "agency:legal.specialAuthorizations.type.omra",
  hajj: "agency:legal.specialAuthorizations.type.hajj",
})

export const SOCIAL_PLATFORM_OPTIONS = toOptions(SOCIAL_PLATFORMS, {
  facebook: "agency:social.platforms.facebook",
  instagram: "agency:social.platforms.instagram",
  tiktok: "agency:social.platforms.tiktok",
  youtube: "agency:social.platforms.youtube",
  linkedin: "agency:social.platforms.linkedin",
})

/** Weekday option keys used by the compact opening-hours rows. */
export const DAY_OPTIONS = toOptions(DAYS_OF_WEEK, {
  saturday: "agency:openingHours.days.saturday",
  sunday: "agency:openingHours.days.sunday",
  monday: "agency:openingHours.days.monday",
  tuesday: "agency:openingHours.days.tuesday",
  wednesday: "agency:openingHours.days.wednesday",
  thursday: "agency:openingHours.days.thursday",
  friday: "agency:openingHours.days.friday",
})

/**
 * Initial service-language options for the UI. The domain models
 * `serviceLanguages` as an open `string[]` so future language codes
 * (e.g. "ber", "esp") remain supported without a type change.
 */
export const SERVICE_LANGUAGE_OPTIONS = [
  { value: "ar", labelKey: "agency:services.languages.options.ar" },
  { value: "fr", labelKey: "agency:services.languages.options.fr" },
  { value: "en", labelKey: "agency:services.languages.options.en" },
]

/** Resolves option label keys to localized strings for the active language. */
export function translateOptions<V extends string>(
  options: AgencyOption<V>[],
  t: TFunction
): { value: V; label: string }[] {
  return options.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }))
}

/** Wilaya select options for the active locale (stable codes, localized labels). */
export function agencyWilayaOptions(locale: AppLocale) {
  return wilayaSelectOptions(locale)
}

/** Resolves a wilaya code to its localized label for the active locale. */
export function getAgencyWilayaLabel(code: string, locale: AppLocale): string {
  return getWilayaLabel(code, locale)
}