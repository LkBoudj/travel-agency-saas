import type { TFunction } from "i18next"
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
  TRIP_FORMAT_LABELS,
  GEOGRAPHIC_SCOPE_LABELS,
  AVAILABILITY_MODE_LABELS,
  PARTICIPATION_MODE_LABELS,
  GUIDANCE_TYPE_LABELS,
  TRIP_THEME_LABELS,
  TRIP_ACTIVITY_LABELS,
  TRIP_AUDIENCE_LABELS,
  TRANSPORT_MODE_LABELS,
  ACCOMMODATION_TYPE_LABELS,
  DIFFICULTY_LEVEL_LABELS,
  FITNESS_LEVEL_LABELS,
} from "../types/trip.types"

export type Option<V extends string> = { value: V; labelKey: string }

function toOptions<V extends string>(
  values: readonly V[],
  labelKeys: Record<V, string>
): Option<V>[] {
  return values.map((v) => ({ value: v, labelKey: labelKeys[v] }))
}

export const FORMAT_OPTIONS = toOptions(TRIP_FORMATS, TRIP_FORMAT_LABELS)
export const SCOPE_OPTIONS = toOptions(GEOGRAPHIC_SCOPES, GEOGRAPHIC_SCOPE_LABELS)
export const AVAILABILITY_OPTIONS = toOptions(AVAILABILITY_MODES, AVAILABILITY_MODE_LABELS)
export const PARTICIPATION_OPTIONS = toOptions(PARTICIPATION_MODES, PARTICIPATION_MODE_LABELS)
export const GUIDANCE_OPTIONS = toOptions(GUIDANCE_TYPES, GUIDANCE_TYPE_LABELS)
export const THEME_OPTIONS = toOptions(TRIP_THEMES, TRIP_THEME_LABELS)
export const ACTIVITY_OPTIONS = toOptions(TRIP_ACTIVITIES, TRIP_ACTIVITY_LABELS)
export const AUDIENCE_OPTIONS = toOptions(TRIP_AUDIENCES, TRIP_AUDIENCE_LABELS)
export const TRANSPORT_OPTIONS = toOptions(TRANSPORT_MODES, TRANSPORT_MODE_LABELS)
export const ACCOMMODATION_OPTIONS = toOptions(ACCOMMODATION_TYPES, ACCOMMODATION_TYPE_LABELS)
export const DIFFICULTY_OPTIONS = toOptions(DIFFICULTY_LEVELS, DIFFICULTY_LEVEL_LABELS)
export const FITNESS_OPTIONS = toOptions(FITNESS_LEVELS, FITNESS_LEVEL_LABELS)

/** Resolves option label keys to localized strings for the active language. */
export function translateOptions<V extends string>(
  options: Option<V>[],
  t: TFunction
): { value: V; label: string }[] {
  return options.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }))
}

/** Activities that imply a physical profile section in the editor. */
export const PHYSICAL_REQUIREMENT_ACTIVITIES = new Set<string>([
  "hiking",
  "trekking",
  "climbing",
  "cycling",
  "skiing_snow",
])

export function requiresActivityRequirements(
  activities: readonly string[]
): boolean {
  return activities.some((a) => PHYSICAL_REQUIREMENT_ACTIVITIES.has(a))
}