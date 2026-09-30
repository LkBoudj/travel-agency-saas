import { getEnv } from '../../../config/env.ts';
import type { SettingsFieldType, ThemeManifestEntry, ThemesManifestResponse } from '../types.ts';

/**
 * The theme registry manifest lives on its own host (theme-agency), so it is
 * fetched with a plain, credential-free `fetch` — never through `apiRequest`
 * (that targets the API origin and sends cookies).
 */

export class ThemesManifestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ThemesManifestError';
    this.status = status;
  }
}

const VALID_FIELD_TYPES: readonly string[] = ['boolean', 'select', 'text', 'color', 'number'];

/** Minimal shape guard so a misconfigured manifest fails loudly, not silently. */
export function parseThemesManifest(body: unknown): ThemesManifestResponse {
  if (
    body === null ||
    typeof body !== 'object' ||
    !Array.isArray((body as { themes?: unknown }).themes)
  ) {
    throw new Error('themes manifest: expected { themes: [...] }');
  }

  const themes = (body as { themes: unknown }).themes as unknown[];
  const parsed: ThemeManifestEntry[] = [];

  for (const raw of themes) {
    if (raw === null || typeof raw !== 'object') {
      throw new Error('themes manifest: theme entry is not an object');
    }
    const entry = raw as Record<string, unknown>;

    const themesId = entry.themeId;
    const nameKey = entry.nameKey;
    const descriptionKey = entry.descriptionKey;
    const version = entry.version;
    const fields = (entry.settingsSchema as { fields?: unknown } | undefined)?.fields;

    if (
      typeof themesId !== 'string' ||
      themesId.length === 0 ||
      typeof nameKey !== 'string' ||
      nameKey.length === 0 ||
      typeof descriptionKey !== 'string' ||
      descriptionKey.length === 0 ||
      typeof version !== 'string' ||
      !Array.isArray(fields)
    ) {
      throw new Error('themes manifest: theme entry is missing required fields');
    }

    const settingsSchema = { fields: fields.map(parseSettingsField) };
    parsed.push({
      themeId: themesId,
      nameKey,
      descriptionKey,
      version,
      ...(typeof entry.previewImage === 'string' && entry.previewImage.length > 0
        ? { previewImage: entry.previewImage }
        : {}),
      settingsSchema,
    });
  }

  return { themes: parsed };
}

function parseSettingsField(raw: unknown): {
  key: string;
  type: SettingsFieldType;
  group: string;
  labelKey: string;
  options?: { value: string; labelKey: string }[];
  min?: number;
  max?: number;
  step?: number;
} {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('themes manifest: settings field is not an object');
  }
  const field = raw as Record<string, unknown>;

  if (
    typeof field.key !== 'string' ||
    field.key.length === 0 ||
    typeof field.type !== 'string' ||
    !VALID_FIELD_TYPES.includes(field.type) ||
    typeof field.group !== 'string' ||
    field.group.length === 0 ||
    typeof field.labelKey !== 'string' ||
    field.labelKey.length === 0
  ) {
    throw new Error('themes manifest: settings field is malformed');
  }

  const parsed: {
    key: string;
    type: SettingsFieldType;
    group: string;
    labelKey: string;
    options?: { value: string; labelKey: string }[];
    min?: number;
    max?: number;
    step?: number;
  } = {
    key: field.key,
    type: field.type as SettingsFieldType,
    group: field.group,
    labelKey: field.labelKey,
  };

  if (Array.isArray(field.options)) {
    parsed.options = field.options.map((option) => {
      if (option === null || typeof option !== 'object') {
        throw new Error('themes manifest: select option is malformed');
      }
      const opt = option as Record<string, unknown>;
      if (typeof opt.value !== 'string' || typeof opt.labelKey !== 'string') {
        throw new Error('themes manifest: select option is malformed');
      }
      return { value: opt.value, labelKey: opt.labelKey };
    });
  }

  for (const key of ['min', 'max', 'step'] as const) {
    if (typeof field[key] === 'number') {
      parsed[key] = field[key];
    }
  }

  return parsed;
}

/** `GET {themesBaseUrl}/themes.json`. */
export async function requestThemesManifest(): Promise<ThemesManifestResponse> {
  const base = getEnv().themesBaseUrl;
  const response = await fetch(`${base}/themes.json`, {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new ThemesManifestError(
      `Themes manifest request failed (${response.status})`,
      response.status
    );
  }

  return parseThemesManifest(await response.json());
}
