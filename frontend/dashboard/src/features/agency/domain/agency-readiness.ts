import type {
  Agency,
  AgencyContact,
  ContactType,
} from "../types/agency.types"

/** Single readiness line. Semantic key only — UI resolves via i18next. */
export type AgencyReadinessItem = {
  key: string
  labelKey: string
  satisfied: boolean
}

/** Public profile readiness judgement. */
export type AgencyReadinessResult = {
  required: AgencyReadinessItem[]
  recommended: AgencyReadinessItem[]
  isComplete: boolean
}

type ReadinessInput = Pick<
  Agency,
  | "name"
  | "media"
  | "shortDescription"
  | "tagline"
  | "fullAbout"
  | "contacts"
  | "locations"
  | "services"
  | "serviceLanguages"
  | "legal"
  | "socialLinks"
>

function resolvePublicPrimary(
  contacts: Agency["contacts"],
  type: ContactType
): AgencyContact | undefined {
  return contacts.find(
    (c) =>
      c.type === type && c.isPrimary && c.visibility === "public" && c.value.trim().length > 0
  )
}

function countOpenDays(agency: ReadinessInput): number {
  let count = 0
  for (const loc of agency.locations) {
    for (const entry of loc.openingHours) {
      if (entry.isOpen && entry.opensAt && entry.closesAt) count += 1
    }
  }
  return count
}

function item(
  key: string,
  labelKey: string,
  satisfied: boolean
): AgencyReadinessItem {
  return { key, labelKey, satisfied }
}

/**
 * Pure readiness function. No React, i18n, Zod, or persistence.
 * Required items count toward readiness; recommended items do not.
 */
export function computeAgencyPublicProfileReadiness(
  agency: ReadinessInput
): AgencyReadinessResult {
  const required = [
    item(
      "agencyName",
      "agency:readiness.agencyName",
      agency.name.trim().length > 0
    ),
    item(
      "logo",
      "agency:readiness.logo",
      agency.media.logoUrl.trim().length > 0
    ),
    item(
      "shortDescription",
      "agency:readiness.shortDescription",
      agency.shortDescription.trim().length > 0
    ),
    item(
      "primaryPublicPhone",
      "agency:readiness.primaryPublicPhone",
      Boolean(resolvePublicPrimary(agency.contacts, "phone"))
    ),
    item(
      "primaryPublicEmail",
      "agency:readiness.primaryPublicEmail",
      Boolean(resolvePublicPrimary(agency.contacts, "email"))
    ),
    item(
      "primaryLocation",
      "agency:readiness.primaryLocation",
      agency.locations.some(
        (loc) => loc.isPrimary && (loc.regionCode?.trim().length ?? 0) > 0
      )
    ),
    item(
      "tourismLicenseNumber",
      "agency:readiness.tourismLicenseNumber",
      agency.legal.tourismLicenseNumber.trim().length > 0
    ),
    item(
      "services",
      "agency:readiness.services",
      agency.services.length > 0
    ),
  ]

  const recommended = [
    item(
      "tagline",
      "agency:readiness.tagline",
      agency.tagline.trim().length > 0
    ),
    item(
      "fullAbout",
      "agency:readiness.fullAbout",
      agency.fullAbout.trim().length > 0
    ),
    item(
      "openingHours",
      "agency:readiness.openingHours",
      countOpenDays(agency) > 0
    ),
    item(
      "whatsapp",
      "agency:readiness.whatsapp",
      Boolean(resolvePublicPrimary(agency.contacts, "whatsapp"))
    ),
    item(
      "heroImage",
      "agency:readiness.heroImage",
      agency.media.heroImageUrl.trim().length > 0
    ),
    item(
      "socialLinks",
      "agency:readiness.socialLinks",
      agency.socialLinks.some((s) => s.url.trim().length > 0)
    ),
    item(
      "serviceLanguages",
      "agency:readiness.serviceLanguages",
      agency.serviceLanguages.length > 0
    ),
  ]

  return {
    required,
    recommended,
    isComplete: required.every((r) => r.satisfied),
  }
}
