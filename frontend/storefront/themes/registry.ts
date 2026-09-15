import type { StorefrontTheme } from "./contracts";
import { explorerTheme } from "./explorer";

/**
 * The Explicit Theme Registry.
 *
 * Themes are statically imported and keyed by id. Theme ids are validated
 * against this registry only — never used to load arbitrary paths or modules
 * at runtime (no user-derived import specifiers).
 */
export const DEFAULT_THEME_ID = "explorer";

export const THEME_REGISTRY: Record<string, StorefrontTheme> = {
  [explorerTheme.id]: explorerTheme,
};

export function isRegisteredThemeId(id: unknown): id is string {
  return typeof id === "string" && Object.hasOwn(THEME_REGISTRY, id);
}

export function loadTheme(id: unknown): StorefrontTheme {
  if (isRegisteredThemeId(id)) return THEME_REGISTRY[id];
  return THEME_REGISTRY[DEFAULT_THEME_ID];
}

export const allThemes: StorefrontTheme[] = Object.values(THEME_REGISTRY);