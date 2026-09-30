import type { SearchFilterItem } from "./island-props.ts";

/**
 * Pure helpers behind the shared islands (T11). Kept out of the React
 * components so the behaviour is unit-testable with `node --test` and so the
 * components stay presentation-only.
 */

export const DEFAULT_ISLAND_MAX_RESULTS = 8;

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True only for a real calendar date in `YYYY-MM-DD` form. */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toUtcMs(value: string): number {
  return Date.parse(`${value}T00:00:00Z`);
}

/** The day after an ISO date, or `null` when the input is not a real date. */
export function nextIsoDate(value: string): string | null {
  if (!isIsoDate(value)) return null;
  const date = new Date(toUtcMs(value) + MS_PER_DAY);
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Nights between two ISO dates, or `null` when either date is missing/invalid
 * or the range is not strictly forward. A same-day range is a booking error,
 * not a zero-night stay, so it returns `null` rather than `0`.
 */
export function countNights(startIso: string, endIso: string): number | null {
  if (!isIsoDate(startIso) || !isIsoDate(endIso)) return null;
  const start = toUtcMs(startIso);
  const end = toUtcMs(endIso);
  if (end <= start) return null;
  return Math.round((end - start) / MS_PER_DAY);
}

/**
 * Case-insensitive substring search over an item's label, meta and keywords,
 * capped at `maxResults`. An empty query keeps the input order.
 */
export function filterIslandItems(
  items: readonly SearchFilterItem[],
  query: string,
  maxResults: number = DEFAULT_ISLAND_MAX_RESULTS,
): SearchFilterItem[] {
  const needle = query.trim().toLowerCase();
  const matched =
    needle === ""
      ? [...items]
      : items.filter((item) =>
          [item.label, item.meta ?? "", ...(item.keywords ?? [])]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        );
  const limit = Number.isFinite(maxResults)
    ? Math.max(0, Math.trunc(maxResults))
    : matched.length;
  return matched.slice(0, limit);
}
