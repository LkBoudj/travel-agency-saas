import type { AppLocale } from "@/i18n"

/**
 * Centralized Algeria geographic reference data.
 *
 * One source of truth for the 58 wilayas. The form stores stable `code`
 * values only — never translated labels. The active locale resolves the
 * displayed name via `getWilayaLabel` / `wilayaOptions`.
 *
 * Codes follow the official Algerian wilaya numbering (01-58).
 */
export type WilayaEntry = { code: string; nameEn: string; nameAr: string }

export const ALGERIA_WILAYAS: WilayaEntry[] = [
  { code: "01", nameEn: "Adrar", nameAr: "أدرار" },
  { code: "02", nameEn: "Chlef", nameAr: "الشلف" },
  { code: "03", nameEn: "Laghouat", nameAr: "الأغواط" },
  { code: "04", nameEn: "Oum El Bouaghi", nameAr: "أم البواقي" },
  { code: "05", nameEn: "Batna", nameAr: "باتنة" },
  { code: "06", nameEn: "Béjaïa", nameAr: "بجاية" },
  { code: "07", nameEn: "Biskra", nameAr: "بسكرة" },
  { code: "08", nameEn: "Béchar", nameAr: "بشار" },
  { code: "09", nameEn: "Blida", nameAr: "البليدة" },
  { code: "10", nameEn: "Bouira", nameAr: "البويرة" },
  { code: "11", nameEn: "Tamanrasset", nameAr: "تمنراست" },
  { code: "12", nameEn: "Tébessa", nameAr: "تبسة" },
  { code: "13", nameEn: "Tlemcen", nameAr: "تلمسان" },
  { code: "14", nameEn: "Tiaret", nameAr: "تيارت" },
  { code: "15", nameEn: "Tizi Ouzou", nameAr: "تيزي وزو" },
  { code: "16", nameEn: "Algiers", nameAr: "الجزائر" },
  { code: "17", nameEn: "Djelfa", nameAr: "الجلفة" },
  { code: "18", nameEn: "Jijel", nameAr: "جيجل" },
  { code: "19", nameEn: "Sétif", nameAr: "سطيف" },
  { code: "20", nameEn: "Saïda", nameAr: "سعيدة" },
  { code: "21", nameEn: "Skikda", nameAr: "سكيكدة" },
  { code: "22", nameEn: "Sidi Bel Abbès", nameAr: "سيدي بلعباس" },
  { code: "23", nameEn: "Annaba", nameAr: "عنابة" },
  { code: "24", nameEn: "Guelma", nameAr: "قالمة" },
  { code: "25", nameEn: "Constantine", nameAr: "قسنطينة" },
  { code: "26", nameEn: "Médéa", nameAr: "المدية" },
  { code: "27", nameEn: "Mostaganem", nameAr: "مستغانم" },
  { code: "28", nameEn: "M'Sila", nameAr: "المسيلة" },
  { code: "29", nameEn: "Mascara", nameAr: "معسكر" },
  { code: "30", nameEn: "Ouargla", nameAr: "ورقلة" },
  { code: "31", nameEn: "Oran", nameAr: "وهران" },
  { code: "32", nameEn: "El Bayadh", nameAr: "البيض" },
  { code: "33", nameEn: "Illizi", nameAr: "إليزي" },
  { code: "34", nameEn: "Bordj Bou Arréridj", nameAr: "برج بوعريريج" },
  { code: "35", nameEn: "Boumerdès", nameAr: "بومرداس" },
  { code: "36", nameEn: "El Tarf", nameAr: "الطارف" },
  { code: "37", nameEn: "Tindouf", nameAr: "تندوف" },
  { code: "38", nameEn: "Tissemsilt", nameAr: "تيسمسيلت" },
  { code: "39", nameEn: "El Oued", nameAr: "الوادي" },
  { code: "40", nameEn: "Khenchela", nameAr: "خنشلة" },
  { code: "41", nameEn: "Souk Ahras", nameAr: "سوق أهراس" },
  { code: "42", nameEn: "Tipaza", nameAr: "تيبازة" },
  { code: "43", nameEn: "Mila", nameAr: "ميلة" },
  { code: "44", nameEn: "Aïn Defla", nameAr: "عين الدفلى" },
  { code: "45", nameEn: "Naâma", nameAr: "النعامة" },
  { code: "46", nameEn: "Aïn Témouchent", nameAr: "عين تموشنت" },
  { code: "47", nameEn: "Ghardaïa", nameAr: "غرداية" },
  { code: "48", nameEn: "Relizane", nameAr: "غليزان" },
  { code: "49", nameEn: "Timimoun", nameAr: "تيميمون" },
  { code: "50", nameEn: "Bordj Badji Mokhtar", nameAr: "برج باجي مختار" },
  { code: "51", nameEn: "Ouled Djellal", nameAr: "أولاد جلال" },
  { code: "52", nameEn: "Béni Abbès", nameAr: "بني عباس" },
  { code: "53", nameEn: "In Salah", nameAr: "عين صالح" },
  { code: "54", nameEn: "In Guezzam", nameAr: "عين قزام" },
  { code: "55", nameEn: "Touggourt", nameAr: "تقرت" },
  { code: "56", nameEn: "Djanet", nameAr: "جانت" },
  { code: "57", nameEn: "El M'Ghair", nameAr: "المغير" },
  { code: "58", nameEn: "El Meniaa", nameAr: "المنيعة" },
]

const wilayaByCode = new Map(ALGERIA_WILAYAS.map((w) => [w.code, w]))

export function getWilaya(code: string): WilayaEntry | undefined {
  return wilayaByCode.get(code)
}

/** Resolves a wilaya code to its display label for the active locale. */
export function getWilayaLabel(code: string, locale: AppLocale): string {
  const wilaya = getWilaya(code)
  if (!wilaya) return ""
  return locale === "ar" ? wilaya.nameAr : wilaya.nameEn
}

/** Searchable select options for the active locale. Values are stable codes. */
export function wilayaOptions(
  locale: AppLocale
): { value: string; label: string }[] {
  return ALGERIA_WILAYAS.map((w) => ({
    value: w.code,
    label: locale === "ar" ? w.nameAr : w.nameEn,
  }))
}