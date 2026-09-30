import type { ThemeDefinition } from "./contracts.ts";

/**
 * The Explicit Theme Registry (generic core helpers).
 *
 * Core is framework-agnostic and cannot import Astro themes, so the
 * authoritative id → ThemeDefinition map lives app-level in
 * `src/theme-registry.ts` and is passed in by the render path. These helpers
 * default to this empty registry only so tests stay self-contained.
 */
export const DEFAULT_THEME_ID = "starter";

export const THEME_REGISTRY: Record<string, ThemeDefinition> = {};

export function isRegisteredThemeId(
  id: unknown,
  registry: Record<string, ThemeDefinition> = THEME_REGISTRY,
): id is string {
  return typeof id === "string" && Object.hasOwn(registry, id);
}

export function loadTheme(
  id: unknown,
  registry: Record<string, ThemeDefinition> = THEME_REGISTRY,
): ThemeDefinition | undefined {
  if (isRegisteredThemeId(id, registry)) return registry[id];
  return registry[DEFAULT_THEME_ID];
}

export function allThemes(
  registry: Record<string, ThemeDefinition> = THEME_REGISTRY,
): ThemeDefinition[] {
  return Object.values(registry);
}