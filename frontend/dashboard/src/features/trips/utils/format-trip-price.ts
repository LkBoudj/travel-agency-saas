import { getIntlLocale, type AppLocale } from "@/i18n"
import i18n from "@/i18n"

/**
 * Formats a numeric price as Algerian Dinar using the active locale.
 * English → "DZD 96,000"; Arabic → "96.000 د.ج" via the ar-DZ symbol
 * (Latin digits kept through the ar-DZ Intl tag). DZD is whole-dinar only —
 * no meaningless decimals are shown. The currency ISO code stays the single
 * source of truth; no Arabic string is hardcoded here.
 */
export function formatTripPrice(
  value: number | null | undefined,
  locale?: AppLocale
): string {
  if (value === null || value === undefined) return "—"
  const activeLocale = locale ?? (i18n.language as AppLocale)
  const formatter = new Intl.NumberFormat(getIntlLocale(activeLocale), {
    style: "currency",
    currency: "DZD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return formatter.format(value)
}