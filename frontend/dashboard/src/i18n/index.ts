import { useSyncExternalStore } from "react"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import arBookings from "./locales/ar/bookings.json"
import arCommon from "./locales/ar/common.json"
import arAuth from "./locales/ar/auth.json"
import arTrips from "./locales/ar/trips.json"
import arAgency from "./locales/ar/agency.json"
import arCustomers from "./locales/ar/customers.json"
import enBookings from "./locales/en/bookings.json"
import enCommon from "./locales/en/common.json"
import enAuth from "./locales/en/auth.json"
import enTrips from "./locales/en/trips.json"
import enAgency from "./locales/en/agency.json"
import enCustomers from "./locales/en/customers.json"

/** Locales officially supported by the Dashboard. */
export type AppLocale = "en" | "ar"

const LOCALES: readonly AppLocale[] = ["en", "ar"]
export const LOCALE_STORAGE_KEY = "travel-saas-locale"

const LOCALE_TAGS: Record<AppLocale, string> = {
  en: "en-US",
  ar: "ar-DZ",
}

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return LOCALES.includes(value as AppLocale)
}

/** Reads a stored preference; falls back to the browser; never past `en`. */
function detectInitialLocale(): AppLocale {
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  if (isAppLocale(stored)) {
    return stored
  }

  const browser = window.navigator.language?.toLowerCase()
  if (browser?.startsWith("ar")) {
    return "ar"
  }

  return "en"
}

/**
 * Central document sync for language and direction. Nothing else in the app
 * touches `document.documentElement.lang`/`dir`.
 */
export function applyDocumentLocale(locale: AppLocale) {
  const root = document.documentElement
  root.lang = locale
  root.dir = locale === "ar" ? "rtl" : "ltr"
}

function persistLocale(locale: AppLocale) {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
}

export function getLocaleDirection(locale: AppLocale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr"
}

/** Intl tag used for date/number/currency formatting (keeps Latin digits). */
export function getIntlLocale(locale: AppLocale): string {
  return LOCALE_TAGS[locale]
}

export function setLocale(locale: AppLocale) {
  void i18n.changeLanguage(locale)
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        trips: enTrips,
        agency: enAgency,
        customers: enCustomers,
        bookings: enBookings,
      },
      ar: {
        common: arCommon,
        auth: arAuth,
        trips: arTrips,
        agency: arAgency,
        customers: arCustomers,
        bookings: arBookings,
      },
    },
    lng: detectInitialLocale(),
    fallbackLng: "en",
    supportedLngs: LOCALES,
    ns: ["common", "auth", "trips", "agency", "customers", "bookings"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
  })

// Persist and sync the document whenever the locale changes.
i18n.on("languageChanged", (lang) => {
  if (!isAppLocale(lang)) {
    return
  }
  persistLocale(lang)
  applyDocumentLocale(lang)
})

// Set `lang`/`dir` before the first paint of the initial locale.
applyDocumentLocale(i18n.language as AppLocale)

function subscribeToLocale(callback: () => void) {
  i18n.on("languageChanged", callback)
  return () => {
    i18n.off("languageChanged", callback)
  }
}

function getLocaleSnapshot(): AppLocale {
  return isAppLocale(i18n.language) ? i18n.language : "en"
}

/** React hook: the active dashboard locale. */
export function useAppLocale(): AppLocale {
  const locale = useSyncExternalStore(subscribeToLocale, getLocaleSnapshot)
  return locale
}

/** React hook: true when the active dashboard locale is RTL (Arabic). */
export function useIsRtl(): boolean {
  return getLocaleDirection(useAppLocale()) === "rtl"
}

export default i18n