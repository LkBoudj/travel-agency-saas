import type { WebsiteThemePatchPayload } from '../../website/types.ts';
import type { SettingsField, SettingsMap, SettingsSchema } from '../types.ts';

/**
 * Pure helpers bridging the theme registry `settingsSchema` and the
 * `PATCH /website/draft/theme` payload. The theme-owned defaults are NOT part
 * of the manifest, so the editor seeds from the stored draft settings with a
 * type-appropriate fallback per field. Values are validated with the same
 * rules the theme-agency applies (`settings-schema.ts` semantics).
 */

export function isValidFieldValue(field: SettingsField, value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  switch (field.type) {
    case 'boolean':
      return typeof value === 'boolean';
    case 'select':
      return typeof value === 'string' && field.options?.some((o) => o.value === value) === true;
    case 'text':
      return typeof value === 'string';
    case 'color':
      return typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value);
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return false;
      }
      if (field.min !== undefined && value < field.min) {
        return false;
      }
      if (field.max !== undefined && value > field.max) {
        return false;
      }
      return true;
  }
}

function fallbackFor(field: SettingsField): boolean | string | number {
  switch (field.type) {
    case 'boolean':
      return false;
    case 'select':
      return field.options?.[0]?.value ?? '';
    case 'text':
      return '';
    case 'color':
      return '#000000';
    case 'number':
      return field.min ?? 0;
  }
}

/** Editor seed: stored value when valid for the field, otherwise a per-type fallback. */
export function initialSettingsMap(
  schema: SettingsSchema,
  stored: Record<string, unknown> | undefined
): SettingsMap {
  const out: SettingsMap = {};
  for (const field of schema.fields) {
    const current = stored?.[field.key];
    out[field.key] = isValidFieldValue(field, current)
      ? (current as boolean | string | number)
      : fallbackFor(field);
  }
  return out;
}

/** Fields grouped in first-seen order — the renderer renders one block per group. */
export function groupSettingsFields(
  schema: SettingsSchema
): Array<{ group: string; fields: SettingsField[] }> {
  const order: string[] = [];
  const byGroup = new Map<string, SettingsField[]>();
  for (const field of schema.fields) {
    let bucket = byGroup.get(field.group);
    if (!bucket) {
      bucket = [];
      byGroup.set(field.group, bucket);
      order.push(field.group);
    }
    bucket.push(field);
  }
  return order.map((group) => ({ group, fields: byGroup.get(group) ?? [] }));
}

/** Only schema-known keys, in schema order — never smuggles anything else. */
export function buildThemeSettingsPatch(
  schema: SettingsSchema,
  settings: SettingsMap
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of schema.fields) {
    const value = settings[field.key];
    if (value !== undefined && isValidFieldValue(field, value)) {
      out[field.key] = value;
    }
  }
  return out;
}

/** Theme-only patch: themeId + themeSettings, nothing else. */
export function buildThemePatch(
  themeId: string,
  schema: SettingsSchema,
  settings: SettingsMap
): WebsiteThemePatchPayload {
  return {
    themeId,
    themeSettings: buildThemeSettingsPatch(schema, settings),
  };
}

/** Activation-only patch: `themeId` alone, leaving settings untouched. */
export function buildActivateThemePatch(themeId: string): WebsiteThemePatchPayload {
  return { themeId };
}
