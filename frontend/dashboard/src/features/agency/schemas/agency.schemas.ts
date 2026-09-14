import type { TFunction } from "i18next"
import { z } from "zod"
import {
  AGENCY_SERVICE_TYPES,
  AUTHORIZATION_TYPES,
  CONTACT_TYPES,
  DAYS_OF_WEEK,
  SOCIAL_PLATFORMS,
  VISIBILITIES,
} from "../types/agency.types"

/**
 * Agency section schemas. Each section owns a form slice of the canonical
 * Agency record; a section save persists only that slice (see AgencyPatch).
 * Messages are localized per active language.
 */

const contactSchema = z.object({
  id: z.string(),
  type: z.enum(CONTACT_TYPES),
  value: z.string().min(1),
  visibility: z.enum(VISIBILITIES),
  isPrimary: z.boolean(),
})

const openingHoursSchema = z.object({
  day: z.enum(DAYS_OF_WEEK),
  isOpen: z.boolean(),
  opensAt: z.string(),
  closesAt: z.string(),
})

const locationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  visibility: z.enum(VISIBILITIES),
  isPrimary: z.boolean(),
  countryCode: z.literal("DZ"),
  regionCode: z.string(),
  commune: z.string(),
  address: z.string(),
  openingHours: z.array(openingHoursSchema).length(DAYS_OF_WEEK.length),
})

const serviceSchema = z.object({
  id: z.string(),
  type: z.enum(AGENCY_SERVICE_TYPES),
  customLabel: z.string(),
  description: z.string(),
})

const specialAuthorizationSchema = z.object({
  id: z.string(),
  type: z.enum(AUTHORIZATION_TYPES),
  referenceNumber: z.string().min(1),
  season: z.string().min(1),
  validUntil: z.string().min(1),
})

const socialLinkSchema = z.object({
  id: z.string(),
  platform: z.enum(SOCIAL_PLATFORMS),
  url: z.string(),
})

export function createGeneralSchema(t: TFunction) {
  return z.object({
    name: z.string().min(1, t("agency:validation.nameRequired")),
    tagline: z.string(),
    shortDescription: z
      .string()
      .max(200, t("agency:validation.shortDescriptionMax")),
    fullAbout: z.string(),
  })
}

export function createBrandSchema() {
  return z.object({
    media: z.object({
      logoUrl: z.string(),
      heroImageUrl: z.string(),
    }),
  })
}

export function createContactsSchema(t: TFunction) {
  return z.object({ contacts: z.array(contactSchema) }).superRefine((values, ctx) => {
    const byType = new Map<string, number[]>()
    values.contacts.forEach((c, index) => {
      const list = byType.get(c.type) ?? []
      list.push(index)
      byType.set(c.type, list)
    })
    byType.forEach((indexes, type) => {
      const primaryCount = indexes.filter(
        (index) => values.contacts[index].isPrimary
      ).length
      if (primaryCount > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["contacts"],
          message: t("agency:validation.multiplePrimary", { type }),
        })
      }
    })
  })
}

export function createLocationsSchema(t: TFunction) {
  return z.object({ locations: z.array(locationSchema) }).superRefine((values, ctx) => {
    const primaryCount = values.locations.filter((loc) => loc.isPrimary).length
    if (primaryCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["locations"],
        message: t("agency:validation.multiplePrimaryLocations"),
      })
    }
  })
}

export function createServicesSchema(t: TFunction) {
  return z.object({
    services: z.array(serviceSchema).min(1, t("agency:validation.serviceRequired")),
    serviceLanguages: z.array(z.string()),
  })
}

export function createLegalSchema() {
  return z.object({
    legal: z.object({
      tourismLicenseNumber: z.string(),
      specialAuthorizations: z.array(specialAuthorizationSchema),
    }),
  })
}

export function createSocialSchema() {
  return z.object({ socialLinks: z.array(socialLinkSchema) })
}

export type GeneralFormValues = z.infer<ReturnType<typeof createGeneralSchema>>
export type BrandFormValues = z.infer<ReturnType<typeof createBrandSchema>>
export type ContactsFormValues = z.infer<ReturnType<typeof createContactsSchema>>
export type LocationsFormValues = z.infer<ReturnType<typeof createLocationsSchema>>
export type ServicesFormValues = z.infer<ReturnType<typeof createServicesSchema>>
export type LegalFormValues = z.infer<ReturnType<typeof createLegalSchema>>
export type SocialFormValues = z.infer<ReturnType<typeof createSocialSchema>>