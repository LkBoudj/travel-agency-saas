import { test } from "node:test";
import assert from "node:assert/strict";

import type { SettingsSchema, ThemeSettings } from "./contracts.ts";
import {
  isValidFieldValue,
  unknownSettingKeys,
  validateSettingsSchema,
  validateThemeDefaults,
} from "./settings-schema.ts";
import { buildTestTheme } from "./_test-theme.ts";

const { settings } = buildTestTheme();
const { schema } = settings;

function field(key: string) {
  const found = schema.fields.find((f) => f.key === key);
  if (!found) throw new Error(`field ${key} exists in test schema`);
  return found;
}

test("isValidFieldValue validates each field type", () => {
  assert.equal(isValidFieldValue(field("hero.showSearch"), true), true);
  assert.equal(isValidFieldValue(field("hero.showSearch"), false), true);
  assert.equal(isValidFieldValue(field("hero.showSearch"), "yes"), false);
  assert.equal(isValidFieldValue(field("hero.showSearch"), undefined), false);
  assert.equal(isValidFieldValue(field("hero.showSearch"), null), false);

  assert.equal(isValidFieldValue(field("hero.eyebrow"), "slim"), true);
  assert.equal(isValidFieldValue(field("hero.eyebrow"), "Sideways"), false);
  assert.equal(isValidFieldValue(field("hero.eyebrow"), true), false);

  assert.equal(isValidFieldValue(field("homepage.heading"), "text"), true);
  assert.equal(isValidFieldValue(field("homepage.heading"), 42), false);

  assert.equal(isValidFieldValue(field("theme.accent"), "#0ea5e9"), true);
  assert.equal(isValidFieldValue(field("theme.accent"), "#fff"), true);
  assert.equal(isValidFieldValue(field("theme.accent"), "#ffffffff"), true);
  assert.equal(isValidFieldValue(field("theme.accent"), "red"), false);
  assert.equal(isValidFieldValue(field("theme.accent"), "#12"), false);

  assert.equal(isValidFieldValue(field("homepage.maxTours"), 4), true);
  assert.equal(isValidFieldValue(field("homepage.maxTours"), 0), false);
  assert.equal(isValidFieldValue(field("homepage.maxTours"), 13), false);
  assert.equal(isValidFieldValue(field("homepage.maxTours"), "6"), false);
  assert.equal(isValidFieldValue(field("homepage.maxTours"), Number.NaN), false);
});

test("validateSettingsSchema accepts a valid schema", () => {
  assert.deepEqual(validateSettingsSchema(schema), []);
});

test("validateSettingsSchema flags duplicate keys", () => {
  const dup: SettingsSchema = {
    fields: [schema.fields[0], { ...schema.fields[0] }],
  };
  const errors = validateSettingsSchema(dup);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /duplicate/);
});

test("validateSettingsSchema flags unknown types", () => {
  const bad = {
    fields: [
      { key: "a", type: "radio", group: "g", labelKey: "l" },
    ],
  };
  const errors = validateSettingsSchema(bad as unknown as SettingsSchema);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /unknown setting type/);
});

test("validateSettingsSchema flags select without options", () => {
  const bad = {
    fields: [
      { key: "a", type: "select", group: "g", labelKey: "l" },
    ],
  };
  const errors = validateSettingsSchema(bad as unknown as SettingsSchema);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /must declare options/);
});

test("validateSettingsSchema flags duplicate select option values", () => {
  const bad = {
    fields: [
      {
        key: "a",
        type: "select",
        group: "g",
        labelKey: "l",
        options: [
          { value: "x", labelKey: "x1" },
          { value: "x", labelKey: "x2" },
        ],
      },
    ],
  };
  const errors = validateSettingsSchema(bad as unknown as SettingsSchema);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /duplicate option value/);
});

test("validateSettingsSchema flags min > max on number fields", () => {
  const bad = {
    fields: [
      { key: "a", type: "number", group: "g", labelKey: "l", min: 9, max: 2 },
    ],
  };
  const errors = validateSettingsSchema(bad as unknown as SettingsSchema);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /min > max/);
});

test("validateSettingsSchema flags missing group and labelKey", () => {
  const bad = {
    fields: [
      { key: "a", type: "boolean" },
      { key: "b", type: "boolean", group: " ", labelKey: "l" },
      { key: "c", type: "boolean", group: "g", labelKey: "" },
    ],
  };
  const errors = validateSettingsSchema(bad as unknown as SettingsSchema);
  assert.equal(errors.length, 4);
});

test("validateThemeDefaults accepts theme defaults", () => {
  assert.deepEqual(validateThemeDefaults(schema, settings.defaults), []);
});

test("validateThemeDefaults flags missing and invalid defaults", () => {
  const errors = validateThemeDefaults(schema, {
    "hero.showSearch": true,
    // "hero.eyebrow" missing
    "homepage.heading": "Explore",
    "theme.accent": "not-a-color",
    "homepage.maxTours": 99,
  } as ThemeSettings);
  assert.equal(errors.length, 3);
});

test("unknownSettingKeys reports override keys absent from the schema", () => {
  const unknown = unknownSettingKeys(schema, {
    "hero.showSearch": true,
    "settings.nope": 1,
  });
  assert.deepEqual(unknown, ["settings.nope"]);
});