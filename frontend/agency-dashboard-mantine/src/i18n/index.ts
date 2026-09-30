import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { applyDocumentLocale, persistLocale, readStoredLocale } from './lib/directions';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  type AppDirection,
  type AppLocale,
  getIntlLocale,
  getLocaleDirection,
  isAppLocale,
  resolveInitialLocale,
  resolveNextLocale,
} from './locales';
import arAuth from './locales/ar/auth.json';
import arBookings from './locales/ar/bookings.json';
import arCommon from './locales/ar/common.json';
import arCustomers from './locales/ar/customers.json';
import arDashboard from './locales/ar/dashboard.json';
import arDepartures from './locales/ar/departures.json';
import arMembers from './locales/ar/members.json';
import arPricing from './locales/ar/pricing.json';
import arSettings from './locales/ar/settings.json';
import arThemes from './locales/ar/themes.json';
import arTrips from './locales/ar/trips.json';
import arWebsite from './locales/ar/website.json';
import enAuth from './locales/en/auth.json';
import enBookings from './locales/en/bookings.json';
import enCommon from './locales/en/common.json';
import enCustomers from './locales/en/customers.json';
import enDashboard from './locales/en/dashboard.json';
import enDepartures from './locales/en/departures.json';
import enMembers from './locales/en/members.json';
import enPricing from './locales/en/pricing.json';
import enSettings from './locales/en/settings.json';
import enThemes from './locales/en/themes.json';
import enTrips from './locales/en/trips.json';
import enWebsite from './locales/en/website.json';

export {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  getIntlLocale,
  getLocaleDirection,
  isAppLocale,
  resolveNextLocale,
};
export type { AppDirection, AppLocale };

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      auth: enAuth,
      members: enMembers,
      customers: enCustomers,
      trips: enTrips,
      departures: enDepartures,
      pricing: enPricing,
      bookings: enBookings,
      dashboard: enDashboard,
      website: enWebsite,
      themes: enThemes,
      settings: enSettings,
    },
    ar: {
      common: arCommon,
      auth: arAuth,
      members: arMembers,
      customers: arCustomers,
      trips: arTrips,
      departures: arDepartures,
      pricing: arPricing,
      bookings: arBookings,
      dashboard: arDashboard,
      website: arWebsite,
      themes: arThemes,
      settings: arSettings,
    },
  },
  lng: resolveInitialLocale(readStoredLocale(), window.navigator.language),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: SUPPORTED_LOCALES,
  ns: [
    'common',
    'auth',
    'members',
    'customers',
    'trips',
    'departures',
    'pricing',
    'bookings',
    'dashboard',
    'website',
    'themes',
    // Declared by the theme registry: a theme's settingsSchema labelKeys are
    // fully qualified (`settings.<themeId>.<group>.<field>`).
    'settings',
  ],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lang) => {
  if (!isAppLocale(lang)) {
    return;
  }
  persistLocale(lang);
  applyDocumentLocale(lang);
});

function getCurrentLocale(): AppLocale {
  return isAppLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE;
}

export function setLocale(locale: AppLocale): void {
  void i18n.changeLanguage(locale);
}

applyDocumentLocale(getCurrentLocale());

export default i18n;
