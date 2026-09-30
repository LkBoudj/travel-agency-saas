/**
 * Mirrors of the theme registry manifest served by the theme-agency at
 * `GET {themesBaseUrl}/themes.json` (see
 * `frontend/theme-agency/src/pages/themes.json.ts`). The manifest ships the
 * serializable manifest fields plus every theme's settings schema so the
 * dashboard can render the customize editor without bundling themes.
 */

export type SettingsValue = boolean | string | number;

/** Edited settings bag keyed by `SettingsField.key`. */
export type SettingsMap = Record<string, SettingsValue>;

export type SettingsFieldType = 'boolean' | 'select' | 'text' | 'color' | 'number';

export interface SettingsFieldOption {
  value: string;
  labelKey: string;
}

export interface SettingsField {
  key: string;
  type: SettingsFieldType;
  group: string;
  /** Theme-owned i18n key (localized by the theme, not the dashboard). */
  labelKey: string;
  options?: SettingsFieldOption[];
  min?: number;
  max?: number;
  step?: number;
}

export interface SettingsSchema {
  fields: SettingsField[];
}

export interface ThemeManifestEntry {
  themeId: string;
  nameKey: string;
  descriptionKey: string;
  version: string;
  previewImage?: string;
  settingsSchema: SettingsSchema;
}

export interface ThemesManifestResponse {
  themes: ThemeManifestEntry[];
}
