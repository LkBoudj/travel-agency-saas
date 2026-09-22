import { getLocaleDirection } from '..';
import { useAppLocale } from './use-app-locale';

export function useIsRtl(): boolean {
  return getLocaleDirection(useAppLocale()) === 'rtl';
}
