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
import arCommon from './locales/ar/common.json';
import arCustomers from './locales/ar/customers.json';
import arDepartures from './locales/ar/departures.json';
import arMembers from './locales/ar/members.json';
import arPricing from './locales/ar/pricing.json';
import arTrips from './locales/ar/trips.json';
import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enCustomers from './locales/en/customers.json';
import enDepartures from './locales/en/departures.json';
import enMembers from './locales/en/members.json';
import enPricing from './locales/en/pricing.json';
import enTrips from './locales/en/trips.json';

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
    },
    ar: {
      common: arCommon,
      auth: arAuth,
      members: arMembers,
      customers: arCustomers,
      trips: arTrips,
      departures: arDepartures,
      pricing: arPricing,
    },
  },
  lng: resolveInitialLocale(readStoredLocale(), window.navigator.language),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: SUPPORTED_LOCALES,
  ns: ['common', 'auth', 'members', 'customers', 'trips', 'departures', 'pricing'],
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
