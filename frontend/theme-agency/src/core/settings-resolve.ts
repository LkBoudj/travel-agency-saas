import type {
  SettingsValue,
  ThemeDefinition,
  ThemeSettings,
} from "./contracts.ts";
import { isValidFieldValue } from "./settings-schema.ts";

/**
 * Settings resolution: theme-owned defaults merged with agency/preview
 * overrides, validating each value against the schema. Unknown override keys
 * are dropped; invalid values fall back to the default.
 */

export function mergeThemeSettings(
  theme: ThemeDefinition,
  overrides: Record<string, unknown> | undefined,
): ThemeSettings {
  const merged: ThemeSettings = { ...theme.settings.defaults };
  if (!overrides) return merged;

  for (const field of theme.settings.schema.fields) {
    const value = overrides[field.key];
    if (isValidFieldValue(field, value)) {
      merged[field.key] = value as SettingsValue;
    }
  }
  return merged;
}

export function resolveThemeSettings(
  theme: ThemeDefinition,
  overrides?: Record<string, unknown>,
): ThemeSettings {
  return mergeThemeSettings(theme, overrides);
}

// Typed accessors for Theme templates. Unset or invalid values fall back.

export function booleanSetting(
  settings: ThemeSettings,
  key: string,
  fallback: boolean,
): boolean {
  const value = settings[key];
  return typeof value === "boolean" ? value : fallback;
}

export function stringSetting(
  settings: ThemeSettings,
  key: string,
  fallback: string,
): string {
  const value = settings[key];
  return typeof value === "string" ? value : fallback;
}

export function numberSetting(
  settings: ThemeSettings,
  key: string,
  fallback: number,
): number {
  const value = settings[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}