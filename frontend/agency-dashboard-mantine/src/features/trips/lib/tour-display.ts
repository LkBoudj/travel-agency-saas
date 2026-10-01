import type { TourListRow, TourLocation } from '../types.ts';

export function tourLabel(tour: { name: string }): string {
  return tour.name.trim();
}

export function tourDestinationsSummary(row: { destinations: TourLocation[] }): string {
  return row.destinations
    .map((destination) => destination.place?.trim())
    .filter((place): place is string => Boolean(place))
    .join(', ');
}

function destinationLabel(destination: TourLocation): string | null {
  for (const candidate of [destination.place, destination.cityId, destination.wilayaCode]) {
    const label = candidate?.trim();
    if (label) {
      return label;
    }
  }
  return null;
}

/** Unique destination labels across the given tour rows, in encounter order. */
export function knownDestinationPlaces(
  rows: readonly { destinations: TourLocation[] }[]
): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const row of rows) {
    for (const destination of row.destinations) {
      const label = destinationLabel(destination);
      if (label != null && !seen.has(label)) {
        seen.add(label);
        results.push(label);
      }
    }
  }
  return results;
}

/**
 * How long a trip runs, as the two facts the schema actually stores.
 *
 * `days` and `hours` are mutually exclusive in practice: a day excursion can
 * be hours-only, so reading `days ?? hours` and printing one "d" suffix
 * labelled an 8-hour trip as an 8-day one.
 */
export function tourDurationParts(tour: { days: number | null; hours: number | null }): {
  kind: 'days' | 'hours' | 'none';
  value: number | null;
} {
  if (tour.days != null) {
    return { kind: 'days', value: tour.days };
  }
  if (tour.hours != null) {
    return { kind: 'hours', value: tour.hours };
  }
  return { kind: 'none', value: null };
}

export function tourListRowAmount(row: TourListRow): { kind: string; value: number | null } {
  if (row.startingPrice == null) {
    return { kind: 'pending', value: null };
  }
  return { kind: 'starting', value: row.startingPrice };
}
