/** The departure window and deadline cells of the departures table. */

export function formatDepartureDateTime(value: string, intlLocale: string): string {
  return new Intl.DateTimeFormat(intlLocale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

/** The booking deadline cell (dates only; time is irrelevant there). */
export function formatDepartureDate(value: string, intlLocale: string): string {
  return new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium' }).format(new Date(value));
}
