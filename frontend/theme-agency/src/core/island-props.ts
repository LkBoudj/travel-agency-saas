/**
 * Shared React islands contract (T11).
 *
 * An Astro island can only receive data that survives the trip from the server
 * bundle to the browser, so the contract here is deliberately the JSON-safe
 * subset: strings, finite numbers, booleans, `null`, arrays and plain objects.
 * Theme authors get a typed props shape per island plus a validator that names
 * the offending path, because a bad prop otherwise fails deep inside Astro's
 * serializer with an opaque error.
 *
 * This module lives in the framework-agnostic core (where `node --test` can
 * cover it) and is re-exported by `src/sdk.ts`; the components themselves live
 * in `src/islands/`.
 */

export const ISLAND_IDS = ["search-filter", "date-picker", "booking-cta"] as const;

export type IslandId = (typeof ISLAND_IDS)[number];

/** The guaranteed-safe subset of values that can cross the island boundary. */
export type IslandPropValue =
  | string
  | number
  | boolean
  | null
  | IslandPropValue[]
  | { [key: string]: IslandPropValue };

export interface SearchFilterItem {
  id: string;
  label: string;
  meta?: string;
  /** When present the row links instead of selecting. */
  href?: string;
  keywords?: string[];
}

export interface SearchFilterProps {
  label: string;
  placeholder?: string;
  emptyMessage?: string;
  items: SearchFilterItem[];
  initialQuery?: string;
  maxResults?: number;
  /** Element id base; pass a unique value when rendering the island twice. */
  id?: string;
}

export interface DatePickerProps {
  label: string;
  startLabel?: string;
  endLabel?: string;
  /** Inclusive ISO bounds (`YYYY-MM-DD`). */
  min?: string;
  max?: string;
  initialStart?: string;
  initialEnd?: string;
  nightsLabel?: string;
  id?: string;
}

export interface BookingCtaProps {
  title: string;
  description?: string;
  ctaLabel: string;
  successMessage: string;
  note?: string;
  disabled?: boolean;
}

export interface IslandPropsById {
  "search-filter": SearchFilterProps;
  "date-picker": DatePickerProps;
  "booking-cta": BookingCtaProps;
}

/** Props that must be present for an island to work at all. */
export const ISLAND_REQUIRED_PROPS: Record<IslandId, readonly string[]> = {
  "search-filter": ["label", "items"],
  "date-picker": ["label"],
  "booking-cta": ["title", "ctaLabel", "successMessage"],
};

export function isIslandId(value: unknown): value is IslandId {
  return typeof value === "string" && (ISLAND_IDS as readonly string[]).includes(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

/**
 * Returns the path of the first value that cannot cross the island boundary,
 * or `null` when the whole value is serializable. `undefined` is allowed as an
 * object value (Astro drops the prop) but not as an array item, which would
 * silently become `null`.
 */
export function findUnserializableValue(value: unknown, path = ""): string | null {
  if (value === null) return null;

  const type = typeof value;
  if (type === "string" || type === "boolean") return null;
  if (type === "undefined") return null;
  if (type === "number") return Number.isFinite(value) ? null : path;
  if (type !== "object") return path;

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      if (item === undefined) return `${path}[${index}]`;
      const issue = findUnserializableValue(item, `${path}[${index}]`);
      if (issue) return issue;
    }
    return null;
  }

  if (!isPlainObject(value)) return path;

  for (const [key, item] of Object.entries(value)) {
    const issue = findUnserializableValue(item, path ? `${path}.${key}` : key);
    if (issue) return issue;
  }
  return null;
}

export type IslandPropsValidation =
  | { ok: true }
  | { ok: false; issues: string[] };

/** Validates a theme author's island props against the contract. */
export function validateIslandProps(
  islandId: unknown,
  props: unknown,
): IslandPropsValidation {
  if (!isIslandId(islandId)) {
    return { ok: false, issues: [`unknown island id: ${String(islandId)}`] };
  }
  if (!isPlainObject(props)) {
    return { ok: false, issues: [`${islandId}: props must be a plain object`] };
  }

  const issues: string[] = [];
  for (const key of ISLAND_REQUIRED_PROPS[islandId]) {
    if (props[key] === undefined) {
      issues.push(`${islandId}: missing required prop "${key}"`);
    }
  }
  for (const [key, value] of Object.entries(props)) {
    const issue = findUnserializableValue(value, key);
    if (issue) {
      issues.push(
        `${islandId}: "${issue}" is not serializable (islands receive JSON-safe data only)`,
      );
    }
  }

  return issues.length > 0 ? { ok: false, issues } : { ok: true };
}
