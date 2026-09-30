/**
 * Fully-qualified i18n keys: `namespace.path.to.key`.
 *
 * Theme manifests and the pricing/option contracts hand the dashboard keys that
 * already carry their namespace (`themes.starter.name`,
 * `settings.starter.homepage.showFeaturedTours`, `pricing.basis.per_person`).
 * Calling a namespace-bound `t()` with such a key makes i18next look for
 * `pricing.json → "pricing" → "basis" → …`, miss, and render the raw key as
 * page text.
 *
 * `translateQualifiedKey` splits the key, asks the caller to translate it in
 * its own namespace, and **falls back to the raw key** whenever it cannot:
 * an unloaded namespace, a missing string, a malformed key. A raw key is a
 * visible defect; a key that no translation covers is honest.
 */

export interface QualifiedKey {
  namespace: string;
  path: string;
}

const namespacePattern = /^[a-z][a-zA-Z0-9]*$/;
const pathSegmentPattern = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

/** `"themes.starter.name"` → `{ namespace: "themes", path: "starter.name" }`. */
export function splitQualifiedKey(key: string): QualifiedKey | null {
  const trimmed = key.trim();
  const separator = trimmed.indexOf('.');
  if (separator <= 0 || separator === trimmed.length - 1) {
    return null;
  }

  const namespace = trimmed.slice(0, separator);
  const path = trimmed.slice(separator + 1);
  if (!namespacePattern.test(namespace)) {
    return null;
  }

  const segments = path.split('.');
  if (segments.some((segment) => !pathSegmentPattern.test(segment))) {
    return null;
  }

  return { namespace, path };
}

/**
 * Translates a namespace for a qualified key. Return `undefined` (or the path
 * itself) when it has no translation — both mean "fall back to the raw key".
 */
export type QualifiedKeyTranslator = (namespace: string, path: string) => string | undefined;

/** The label to render for a qualified key; never throws, never blanks out. */
export function translateQualifiedKey(key: string, translate: QualifiedKeyTranslator): string {
  const qualified = splitQualifiedKey(key);
  if (qualified === null) {
    return key;
  }

  let translated: string | undefined;
  try {
    translated = translate(qualified.namespace, qualified.path);
  } catch {
    return key;
  }

  if (translated === undefined || translated === '' || translated === qualified.path) {
    return key;
  }

  // Interpolation is the caller's business; the resolved string is passed
  // through untouched so an RTL string (or an LTR slug inside one) is never
  // mangled by the resolver.
  return translated;
}
