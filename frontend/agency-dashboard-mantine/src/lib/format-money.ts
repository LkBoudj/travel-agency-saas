/**
 * Formats an amount as currency in the given Intl locale.
 * Falls back to a plain number when Intl cannot represent the currency.
 */
export function formatMoney(
  amount: number,
  intlLocale: string,
  options: { currency?: string; precision?: number } = {}
): string {
  const { currency = 'USD', precision } = options;

  try {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      ...(precision !== undefined
        ? { minimumFractionDigits: precision, maximumFractionDigits: precision }
        : { maximumFractionDigits: 2 }),
    }).format(amount);
  } catch {
    return amount.toLocaleString(intlLocale);
  }
}
