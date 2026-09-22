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

export function tourListRowAmount(row: TourListRow): { kind: string; value: number | null } {
  if (row.startingPrice == null) {
    return { kind: 'pending', value: null };
  }
  return { kind: 'starting', value: row.startingPrice };
}
