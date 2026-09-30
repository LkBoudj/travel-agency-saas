import type { SettingsSchema } from "../core/contracts.ts";
import { getRegisteredThemes } from "../theme-registry.ts";

/**
 * Static theme catalog consumed by the agency dashboard (theme picker + theme
 * editor form). Mirrors the live registry exactly — the manifest ships the
 * serializable manifest fields plus the settings schema, so clients can render
 * the agency-facing editor without rebuilding themes (T7).
 */
export interface ThemeManifestEntry {
  themeId: string;
  nameKey: string;
  descriptionKey: string;
  version: string;
  previewImage?: string;
  settingsSchema: SettingsSchema;
}

export function GET(): Response {
  const themes: ThemeManifestEntry[] = getRegisteredThemes().map((theme) => ({
    themeId: theme.id,
    nameKey: theme.nameKey,
    descriptionKey: theme.descriptionKey,
    version: theme.version,
    ...(theme.previewImage ? { previewImage: theme.previewImage } : {}),
    settingsSchema: theme.settings.schema,
  }));

  return new Response(JSON.stringify({ themes }, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}