import { useSyncExternalStore } from 'react';
import i18n, { isAppLocale } from '..';
import { DEFAULT_LOCALE, type AppLocale } from '../locales';

function subscribe(callback: () => void): () => void {
  i18n.on('languageChanged', callback);
  return () => {
    i18n.off('languageChanged', callback);
  };
}

function getSnapshot(): AppLocale {
  return isAppLocale(i18n.language) ? i18n.language : DEFAULT_LOCALE;
}

export function useAppLocale(): AppLocale {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
