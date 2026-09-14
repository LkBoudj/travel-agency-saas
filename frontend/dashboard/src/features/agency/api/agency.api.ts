import type {
  Agency,
  AgencyMembership,
  AgencyStatus,
  DayOfWeek,
  OpeningHoursEntry,
} from "../types/agency.types"
import type { AgencyPatch } from "../types/agency.types"

/**
 * Dev in-memory Agency repository — the SINGLE development persistence
 * boundary for Agency data across the app. Both onboarding (auth feature)
 * and Agency Settings write here; there is no second Agency store or repo.
 *
 * NOT a fake production API. This is the frontend-local boundary that a real
 * backend will replace. Data is ephemeral (lost on refresh). Swapping is a
 * one-file boundary change.
 *
 * On boot the repo is seeded with a complete demo "Sahara Atlas Travel" agency
 * (mimics a real tenant having finished onboarding). createAgency() overwrites
 * the seed; getAgency/saveAgency operate on the same single record.
 */

let repo: Agency | null = null
let counter = 0

export function createEntityId(): string {
  counter += 1
  return `dev-${Date.now()}-${counter}`
}

function now(): string {
  return new Date().toISOString()
}

function buildDefaultOpeningHours(): OpeningHoursEntry[] {
  return (["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"] as DayOfWeek[]).map(
    (day) => ({ day, isOpen: false, opensAt: "", closesAt: "" })
  )
}

/** Fresh all-closed weekly rows for a new location in the UI. */
export function createDefaultOpeningHours(): OpeningHoursEntry[] {
  return buildDefaultOpeningHours()
}

function buildCanonical(input: { name: string; slug: string }): Agency {
  const ts = now()
  return {
    id: createEntityId(),
    tenantId: "dev-tenant-1",
    slug: input.slug,
    status: "active" as AgencyStatus,
    membership: { plan: "starter" } as AgencyMembership,
    createdAt: ts,
    updatedAt: ts,
    name: input.name,
    tagline: "",
    shortDescription: "",
    fullAbout: "",
    media: { logoUrl: "", heroImageUrl: "" },
    contacts: [],
    locations: [],
    services: [],
    serviceLanguages: [],
    legal: { tourismLicenseNumber: "", specialAuthorizations: [] },
    socialLinks: [],
  }
}

/**
 * Demo seed — created on first access. A complete demo profile so the
 * dashboard has realistic data from day one. Mirrors the trips
 * PLACEHOLDER_TRIPS convention and is the single source of the demo
 * agency identity.
 */
function seedDemo(): Agency {
  const agency = buildCanonical({
    name: "Sahara Atlas Travel",
    slug: "sahara-atlas-travel",
  })
  agency.tagline = "Journeys with a sense of place"
  agency.shortDescription =
    "A Djanet-based travel agency crafting desert circuits, mountain escapes, coastal stays and international journeys — designed in Algeria, enjoyed everywhere."
  agency.fullAbout =
    "Sahara Atlas Travel was founded in Djanet, in the heart of the Tassili n'Ajjer. We specialise in small-group journeys across Algeria's Sahara and mountains, and we design stays further afield — from Istanbul to the Maldives. Every itinerary is built around real places, real pace and the people who call them home."
  agency.media = {
    logoUrl: "",
    heroImageUrl: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80",
  }
  agency.contacts = [
    { id: createEntityId(), type: "phone", value: "+213 29 87 65 43", visibility: "public", isPrimary: true },
    { id: createEntityId(), type: "mobile", value: "+213 661 23 45 67", visibility: "public", isPrimary: true },
    { id: createEntityId(), type: "whatsapp", value: "+213 661 23 45 67", visibility: "public", isPrimary: true },
    { id: createEntityId(), type: "email", value: "hello@saharatravel.dz", visibility: "public", isPrimary: true },
  ]
  agency.locations = [
    {
      id: createEntityId(),
      name: "Djanet Office",
      visibility: "public",
      isPrimary: true,
      countryCode: "DZ",
      regionCode: "56",
      commune: "Djanet",
      address: "1 Boulevard des Martyrs, Djanet 33100",
      openingHours: buildDefaultOpeningHours().map((entry, index) =>
        index === 5
          ? { ...entry, isOpen: false }
          : { ...entry, isOpen: true, opensAt: "08:00", closesAt: "17:00" }
      ),
    },
  ]
  agency.services = [
    { id: createEntityId(), type: "desert_safari", customLabel: "Sahara circuits", description: "Multi-day desert circuits across Tassili, Tadrart and the ergs." },
    { id: createEntityId(), type: "domestic_tours", customLabel: "Mountain days", description: "Hiking and nature days in Tikjda, Djurdjura and the Atlas ranges." },
    { id: createEntityId(), type: "international_tours", description: "Designed stays abroad — city breaks, beach holidays and honeymoons." },
    { id: createEntityId(), type: "custom_travel", description: "Tailor-made journeys for private groups of any size." },
  ]
  // Free-form language labels the agency offers to travellers.
  agency.serviceLanguages = ["Arabic", "French", "English"]
  agency.legal = { tourismLicenseNumber: "06-2024-0117", specialAuthorizations: [] }
  agency.socialLinks = [
    { id: createEntityId(), platform: "facebook", url: "https://www.facebook.com" },
    { id: createEntityId(), platform: "instagram", url: "https://www.instagram.com" },
  ]
  return agency
}

function copy(a: Agency): Agency {
  return structuredClone(a)
}

/**
 * Load the current canonical agency (or seed the demo on first access).
 * Returns a structured clone — never a reference to the repo.
 */
export function getAgency(): Agency {
  if (!repo) {
    repo = seedDemo()
  }
  return copy(repo)
}

/**
 * Create an agency from minimal onboarding input. Replaces any existing record
 * in the dev repo (single-tenant dev model). Used by both onboarding and settings.
 */
export function createAgency(input: { name: string; slug: string }): Agency {
  const canonical = buildCanonical(input)
  repo = copy(canonical)
  return copy(repo)
}

/**
 * Persist a partial agency patch. Scalar and top-level object fields are
 * shallow-merged. Owned arrays are replaced wholesale — the saving section
 * is responsible for including the complete array. Returns the new canonical
 * copy (consumers should treat this as the new baseline).
 */
export function saveAgency(patch: AgencyPatch): Agency {
  if (!repo) {
    throw new Error(
      "[agency.api] No agency record exists. Create an agency via onboarding first."
    )
  }

  const next: Agency = {
    ...repo,
    ...patch,
    media: patch.media ?? repo.media,
    legal: patch.legal ?? repo.legal,
    contacts: patch.contacts ?? repo.contacts,
    locations: patch.locations ?? repo.locations,
    services: patch.services ?? repo.services,
    serviceLanguages: patch.serviceLanguages ?? repo.serviceLanguages,
    socialLinks: patch.socialLinks ?? repo.socialLinks,
    updatedAt: now(),
  }

  repo = copy(next)
  return copy(repo)
}

/** Reset the dev repo to its un-seeded state. */
export function resetAgencyDevRepo(): void {
  repo = null
  counter = 0
}
