export const LOCALE_STORAGE_KEY = 'travel-saas-locale';
export const DEFAULT_LOCALE = 'en' as const;
export const SUPPORTED_LOCALES = ['en', 'ar'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export type AppDirection = 'ltr' | 'rtl';

const INTL_TAGS: Record<AppLocale, string> = {
  en: 'en-US',
  ar: 'ar-DZ',
};

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === 'en' || value === 'ar';
}

export function getLocaleDirection(locale: AppLocale): AppDirection {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function getIntlLocale(locale: AppLocale): string {
  return INTL_TAGS[locale];
}

export function resolveNextLocale(locale: AppLocale): AppLocale {
  return locale === 'en' ? 'ar' : 'en';
}

export function resolveInitialLocale(
  stored: string | null | undefined,
  browserLang: string | undefined
): AppLocale {
  if (isAppLocale(stored)) {
    return stored;
  }
  if (browserLang?.toLowerCase().startsWith('ar')) {
    return 'ar';
  }
  return DEFAULT_LOCALE;
}
