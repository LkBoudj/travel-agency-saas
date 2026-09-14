import type {
  TripFormat,
  GeographicScope,
  AvailabilityMode,
} from "../types/trip.types"
import type { TripFormValues } from "../schemas/trip.schema"

/**
 * Dev in-memory trip repository. NOT a fake production API — it is the
 * frontend-local persistence boundary standing in for the real trips.api.ts
 * that will replace it. Production endpoints MUST NOT be mocked here; the
 * swap boundary is deliberate.
 *
 * Data is ephemeral (lost on page refresh). This is by design — no fake
 * persistence, no localStorage, no production-like stubs.
 */

type TripId = string

type RepoEntry = { draft: TripFormValues; saved: TripFormValues }

const repo = new Map<TripId, RepoEntry>()

let counter = 0
function generateId(): TripId {
  counter += 1
  return `dev-${Date.now()}-${counter}`
}

export type CreateTripInput = {
  name: string
  format: TripFormat
  geographicScope: GeographicScope
  availabilityMode: AvailabilityMode
  days: number | null | undefined
  nights: number | null | undefined
  hours: number | null | undefined
  isFlexible: boolean
  origin: TripFormValues["origin"]
  destinations: TripFormValues["destinations"]
}

export type TripSeed = { id: string; draft: TripFormValues }

/**
 * Persist a brand-new draft trip. The payload contains only the create-drawer
 * fields; the rest is filled from sensible defaults.
 */
export function persistTrip(
  input: CreateTripInput,
  defaults: TripFormValues
): TripSeed {
  const id = generateId()
  const draft: TripFormValues = {
    ...defaults,
    status: "draft",
    name: input.name,
    format: input.format,
    geographicScope: input.geographicScope,
    availabilityMode: input.availabilityMode,
    origin: input.origin,
    destinations: input.destinations,
    days: input.days ?? undefined,
    nights: input.nights ?? undefined,
    hours: input.hours ?? undefined,
    isFlexible: input.isFlexible,
  }
  repo.set(id, { draft: structuredClone(draft), saved: structuredClone(draft) })
  return { id, draft: structuredClone(draft) }
}

/**
 * Load a trip's current saved + draft state.
 * Returns `null` when the id is unknown (handles not-found).
 */
export function loadTrip(
  tripId: TripId
): { id: TripId; draft: TripFormValues; saved: TripFormValues } | null {
  const entry = repo.get(tripId)
  if (!entry) return null
  return {
    id: tripId,
    draft: structuredClone(entry.draft),
    saved: structuredClone(entry.saved),
  }
}

/**
 * Save a full draft as the new canonical saved copy.
 * Returns the canonical copy (the one consumers should treat as baseline).
 */
export function saveTrip(
  tripId: TripId,
  draft: TripFormValues
): TripFormValues | null {
  const entry = repo.get(tripId)
  if (!entry) return null
  const canonical = structuredClone(draft)
  entry.draft = structuredClone(canonical)
  entry.saved = structuredClone(canonical)
  return canonical
}

/**
 * Soft-clear the repo on creation of new trips to avoid confusion in the
 * dev environment. Not used in production.
 */
export function clearDevRepo(): void {
  repo.clear()
  counter = 0
}
