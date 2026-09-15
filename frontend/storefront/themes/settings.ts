import type {
  SettingsField,
  StorefrontTheme,
  ThemeSettings,
} from "./contracts";

export function booleanSetting(
  settings: ThemeSettings,
  key: string,
  fallback: boolean,
): boolean {
  const value = settings[key];
  return typeof value === "boolean" ? value : fallback;
}

export function isValidFieldValue(field: SettingsField, value: unknown): boolean {
  if (value === undefined || value === null) return false;
  switch (field.type) {
    case "boolean":
      return typeof value === "boolean";
    case "select":
      return (
        typeof value === "string" &&
        field.options?.some((option) => option.value === value) === true
      );
  }
}

export function mergeThemeSettings(
  theme: StorefrontTheme,
  overrides: Record<string, unknown> | undefined,
): ThemeSettings {
  const merged: ThemeSettings = { ...theme.settings.defaults };
  if (!overrides) return merged;
  for (const field of theme.settings.schema.fields) {
    const value = overrides[field.key];
    if (isValidFieldValue(field, value)) {
      merged[field.key] = value as ThemeSettings[string];
    }
  }
  return merged;
}

export function resolveThemeSettings(
  theme: StorefrontTheme,
  overrides?: Record<string, unknown>,
): ThemeSettings {
  return mergeThemeSettings(theme, overrides);
}