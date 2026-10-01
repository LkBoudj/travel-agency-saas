/**
 * Formats an absolute date in the given Intl locale.
 *
 * `ar` resolves to `ar-DZ`, so the Arabic UI gets Arabic month names and
 * Arabic-Indic digits instead of the English default `dayjs().format('ll')`
 * produced regardless of the active locale. Unparseable input degrades to a
 * dash, like every other cell in the listings.
 */
export function formatShortDate(value: string, intlLocale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium' }).format(date);
}
