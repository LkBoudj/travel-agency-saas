import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import type {
  SettingsSchema,
  ThemeDefinition,
  ThemeSettings,
} from "./contracts.ts";

const dummyComponent = (() => {}) as unknown as AstroComponentFactory;

export interface TestThemeOptions {
  id?: string;
  settings?: {
    schema?: SettingsSchema;
    defaults?: ThemeSettings;
  };
}

/** Minimal contract-complete theme for unit tests (not exported by the SDK). */
export function buildTestTheme(options: TestThemeOptions = {}): ThemeDefinition {
  const schema: SettingsSchema = {
    fields: [
      {
        key: "hero.showSearch",
        type: "boolean",
        group: "hero",
        labelKey: "settings.test.hero.showSearch",
      },
      {
        key: "hero.eyebrow",
        type: "select",
        group: "hero",
        labelKey: "settings.test.hero.eyebrow",
        options: [
          { value: "slim", labelKey: "settings.test.hero.eyebrow.slim" },
          { value: "full", labelKey: "settings.test.hero.eyebrow.full" },
        ],
      },
      {
        key: "homepage.heading",
        type: "text",
        group: "homepage",
        labelKey: "settings.test.homepage.heading",
      },
      {
        key: "theme.accent",
        type: "color",
        group: "theme",
        labelKey: "settings.test.theme.accent",
      },
      {
        key: "homepage.maxTours",
        type: "number",
        group: "homepage",
        labelKey: "settings.test.homepage.maxTours",
        min: 1,
        max: 12,
      },
    ],
  };

  const defaults: ThemeSettings = {
    "hero.showSearch": true,
    "hero.eyebrow": "full",
    "homepage.heading": "Explore",
    "theme.accent": "#0ea5e9",
    "homepage.maxTours": 6,
  };

  const settingsSchema = options.settings?.schema ?? schema;
  const settingsDefaults = options.settings?.defaults ?? defaults;

  return {
    id: options.id ?? "test",
    nameKey: "theme.test.name",
    descriptionKey: "theme.test.description",
    version: "0.0.0",
    Layout: dummyComponent,
    pages: {
      home: dummyComponent,
      trips: dummyComponent,
      "trip-detail": dummyComponent,
      "custom-page": dummyComponent,
    },
    sections: [],
    settings: { schema: settingsSchema, defaults: settingsDefaults },
  };
}