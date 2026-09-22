import { LOCALE_STORAGE_KEY, getLocaleDirection, isAppLocale, type AppLocale } from '../locales';

export function applyDocumentLocale(locale: AppLocale): void {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = getLocaleDirection(locale);
}

export function persistLocale(locale: AppLocale): void {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function readStoredLocale(): AppLocale | null {
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isAppLocale(stored) ? stored : null;
}
