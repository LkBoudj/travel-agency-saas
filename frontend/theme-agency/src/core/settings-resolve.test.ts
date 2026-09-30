import { test } from "node:test";
import assert from "node:assert/strict";

import type { ThemeSettings } from "./contracts.ts";
import {
  booleanSetting,
  mergeThemeSettings,
  numberSetting,
  resolveThemeSettings,
  stringSetting,
} from "./settings-resolve.ts";
import { buildTestTheme } from "./_test-theme.ts";

const theme = buildTestTheme();

test("mergeThemeSettings returns defaults when no overrides", () => {
  assert.deepEqual(mergeThemeSettings(theme, undefined), theme.settings.defaults);
});

test("mergeThemeSettings applies valid overrides and keeps rest", () => {
  const merged = mergeThemeSettings(theme, {
    "hero.showSearch": false,
    "homepage.maxTours": 3,
  });
  assert.equal(merged["hero.showSearch"], false);
  assert.equal(merged["homepage.maxTours"], 3);
  assert.equal(merged["hero.eyebrow"], "full");
});

test("mergeThemeSettings ignores invalid overrides (falls back to default)", () => {
  const merged = mergeThemeSettings(theme, {
    "hero.showSearch": "nope",
    "hero.eyebrow": "Sideways",
    "theme.accent": "red",
    "homepage.maxTours": 99,
    "homepage.heading": 123,
  });
  assert.equal(merged["hero.showSearch"], true);
  assert.equal(merged["hero.eyebrow"], "full");
  assert.equal(merged["theme.accent"], "#0ea5e9");
  assert.equal(merged["homepage.maxTours"], 6);
  assert.equal(merged["homepage.heading"], "Explore");
});

test("mergeThemeSettings drops unknown override keys", () => {
  const merged = mergeThemeSettings(theme, { "settings.doesNotExist": true });
  assert.equal(merged["settings.doesNotExist"], undefined);
});

test("resolveThemeSettings is mergeThemeSettings", () => {
  assert.deepEqual(resolveThemeSettings(theme, { "hero.showSearch": false }), {
    ...theme.settings.defaults,
    "hero.showSearch": false,
  });
});

test("typed accessors fall back", () => {
  const full: ThemeSettings = {
    "hero.showSearch": false,
    "homepage.heading": "Custom",
    "homepage.maxTours": 4,
  };
  assert.equal(booleanSetting(full, "hero.showSearch", true), false);
  assert.equal(booleanSetting(full, "missing", true), true);
  assert.equal(stringSetting(full, "homepage.heading", "X"), "Custom");
  assert.equal(stringSetting(full, "missing", "X"), "X");
  assert.equal(numberSetting(full, "homepage.maxTours", 1), 4);
  assert.equal(numberSetting(full, "missing", 1), 1);
});

test("typed accessors distinguish invalid values from valid falsy ones", () => {
  const weird: ThemeSettings = {
    "hero.showSearch": "false",
    "homepage.heading": 7,
    "homepage.maxTours": "6",
  };
  assert.equal(booleanSetting(weird, "hero.showSearch", false), false);
  assert.equal(stringSetting(weird, "homepage.heading", "X"), "X");
  assert.equal(numberSetting(weird, "homepage.maxTours", 1), 1);
});