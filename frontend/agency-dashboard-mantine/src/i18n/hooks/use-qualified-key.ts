import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { translateQualifiedKey } from '../lib/qualified-keys.ts';

/**
 * Resolves a fully-qualified key (`themes.starter.name`) against the loaded
 * namespaces and returns the raw key when there is no translation for it.
 *
 * `i18n.t` is used directly with an explicit `ns`: a namespace-bound `t()`
 * would look for the whole key inside its own namespace and render it raw.
 */
export function useQualifiedKey(): (key: string) => string {
  const { i18n } = useTranslation();

  return useCallback(
    (key: string) =>
      translateQualifiedKey(key, (namespace, path) => {
        if (!i18n.hasLoadedNamespace(namespace)) {
          return undefined;
        }
        const value = i18n.t(path, { ns: namespace, defaultValue: '' });
        return typeof value === 'string' ? value : undefined;
      }),
    [i18n]
  );
}
