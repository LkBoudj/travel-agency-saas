/** Lifecycle status of the agency entity. */
export type AgencyStatus = "active" | "suspended"

/** Subscription plan tier. */
export type AgencyPlan = "starter" | "pro"

/** Platform membership metadata. */
export type AgencyMembership = { plan: AgencyPlan }

/** Contact channel types. */
export const CONTACT_TYPES = ["phone", "mobile", "whatsapp", "email"] as const
export type ContactType = (typeof CONTACT_TYPES)[number]

/** Visibility for contacts and locations. */
export const VISIBILITIES = ["public", "internal"] as const
export type Visibility = (typeof VISIBILITIES)[number]

/**
 * Days of the week for opening hours.
 * Ordered Saturday → Friday to match Algeria's weekend-first weekly UI.
 */
export const DAYS_OF_WEEK = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

/** Agency service types. Controlled vocabulary. */
export const AGENCY_SERVICE_TYPES = [
  "domestic_tours",
  "international_tours",
  "desert_safari",
  "beach_holidays",
  "cultural_heritage",
  "omra",
  "hajj",
  "business_travel",
  "visa_assistance",
  "airline_tickets",
  "hotel_reservations",
  "transfers",
  "custom_travel",
  "other",
] as const
export type AgencyServiceType = (typeof AGENCY_SERVICE_TYPES)[number]

/** Social platforms. */
export const SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
] as const
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

/** Special authorization types (seasonal legal requirements). */
export const AUTHORIZATION_TYPES = ["omra", "hajj"] as const
export type AuthorizationType = (typeof AUTHORIZATION_TYPES)[number]

/** One contact entry. At most one primary per type. */
export type AgencyContact = {
  id: string
  type: ContactType
  value: string
  visibility: Visibility
  isPrimary: boolean
}

/** One day's opening hours. */
export type OpeningHoursEntry = {
  day: DayOfWeek
  isOpen: boolean
  opensAt: string
  closesAt: string
}

/** One agency office / location. At most one primary. */
export type AgencyLocation = {
  id: string
  name: string
  visibility: Visibility
  isPrimary: boolean
  countryCode: "DZ"
  regionCode?: string
  /** Free-text commune until Algerian commune reference data lands. Not a stable ID. */
  commune?: string
  address?: string
  openingHours: OpeningHoursEntry[]
}

/** One offered service. */
export type AgencyService = {
  id: string
  type: AgencyServiceType
  customLabel?: string
  description?: string
}

/** Seasonal authorization. Computed expiry: validUntil < today. */
export type SpecialAuthorization = {
  id: string
  type: AuthorizationType
  referenceNumber: string
  season: string
  validUntil: string
}

/** External social link. */
export type SocialLink = {
  id: string
  platform: SocialPlatform
  url: string
}

/** Brand media URLs. M1: URL strings only — no upload yet. */
export type AgencyMedia = {
  logoUrl: string
  heroImageUrl: string
}

/** Legal & trust profile. */
export type LegalProfile = {
  tourismLicenseNumber: string
  specialAuthorizations: SpecialAuthorization[]
}

/**
 * Canonical Agency entity. Single source of truth shared by onboarding
 * and Agency Settings. Arrays are replaced wholesale by the saving section.
 */
export type Agency = {
  id: string
  tenantId: string
  slug: string
  status: AgencyStatus
  membership: AgencyMembership
  createdAt: string
  updatedAt: string
  /** General */
  name: string
  tagline: string
  shortDescription: string
  fullAbout: string
  /** Brand */
  media: AgencyMedia
  /** Contacts & Locations */
  contacts: AgencyContact[]
  locations: AgencyLocation[]
  /** Services */
  services: AgencyService[]
  serviceLanguages: string[]
  /** Legal & Trust */
  legal: LegalProfile
  /** Social */
  socialLinks: SocialLink[]
}

/** Partial patch accepted by the agency persistence boundary. */
export type AgencyPatch = Partial<
  Pick<
    Agency,
    | "name"
    | "tagline"
    | "shortDescription"
    | "fullAbout"
    | "media"
    | "contacts"
    | "locations"
    | "services"
    | "serviceLanguages"
    | "legal"
    | "socialLinks"
  >
>
