import { test } from "node:test";
import assert from "node:assert/strict";

import {
  allThemes,
  DEFAULT_THEME_ID,
  isRegisteredThemeId,
  loadTheme,
  THEME_REGISTRY,
} from "./registry.ts";
import {
  getActiveTheme,
  resolveActiveThemeId,
} from "./resolver.ts";
import { buildTestTheme } from "./_test-theme.ts";

const themeA = buildTestTheme({ id: "alpha" });
const themeB = buildTestTheme({ id: "beta" });

function testRegistry() {
  return {
    [themeA.id]: themeA,
    [themeB.id]: themeB,
  };
}

test("isRegisteredThemeId is a string predicate", () => {
  const registry = testRegistry();
  assert.equal(isRegisteredThemeId("alpha", registry), true);
  assert.equal(isRegisteredThemeId("beta", registry), true);
  assert.equal(isRegisteredThemeId("ghost", registry), false);
  assert.equal(isRegisteredThemeId(null, registry), false);
  assert.equal(isRegisteredThemeId(42, registry), false);
  assert.equal(isRegisteredThemeId(undefined, registry), false);
});

test("resolveActiveThemeId resolves known ids, falls back to default otherwise", () => {
  const registry = testRegistry();
  assert.deepEqual(resolveActiveThemeId("alpha", registry), {
    themeId: "alpha",
    usedDefaultTheme: false,
  });
  assert.deepEqual(resolveActiveThemeId("ghost", registry), {
    themeId: DEFAULT_THEME_ID,
    usedDefaultTheme: true,
  });
  assert.deepEqual(resolveActiveThemeId(null, registry), {
    themeId: DEFAULT_THEME_ID,
    usedDefaultTheme: true,
  });
  assert.deepEqual(resolveActiveThemeId(undefined, registry), {
    themeId: DEFAULT_THEME_ID,
    usedDefaultTheme: true,
  });
  assert.equal(resolveActiveThemeId("", registry).usedDefaultTheme, true);
});

test("loadTheme returns the registered theme / default when absent", () => {
  const registry = testRegistry();
  assert.equal(loadTheme("alpha", registry), themeA);
  assert.equal(loadTheme("ghost", registry), undefined); // default not registered here
  assert.equal(loadTheme(undefined, registry), undefined);
});

test("loadTheme falls back to the registered default theme", () => {
  const registry = { [DEFAULT_THEME_ID]: themeA, [themeB.id]: themeB };
  assert.equal(loadTheme("ghost", registry), themeA);
});

test("allThemes enumerates registered themes", () => {
  assert.equal(allThemes(testRegistry()).length, 2);
});

test("getActiveTheme resolves, loads and merges settings", () => {
  const registry = testRegistry();
  const active = getActiveTheme(
    { themeId: "alpha", settings: { "hero.showSearch": false } },
    registry,
  );
  assert.equal(active.themeId, "alpha");
  assert.equal(active.theme, themeA);
  assert.equal(active.usedDefaultTheme, false);
  assert.equal(active.settings["hero.showSearch"], false);
});

test("getActiveTheme falls back to default theme and settings on unknown id", () => {
  const registry = { [DEFAULT_THEME_ID]: themeA };
  const active = getActiveTheme({ themeId: "nope" }, registry);
  assert.equal(active.themeId, DEFAULT_THEME_ID);
  assert.equal(active.theme, themeA);
  assert.equal(active.usedDefaultTheme, true);
  assert.deepEqual(active.settings, themeA.settings.defaults);
});

test("getActiveTheme yields empty settings when the default is unregistered", () => {
  const registry = testRegistry(); // default "starter" NOT registered
  const active = getActiveTheme({ themeId: "nope" }, registry);
  assert.equal(active.theme, undefined);
  assert.deepEqual(active.settings, {});
});

test("ship registry is empty until T6 and uses starter as default id", () => {
  assert.equal(DEFAULT_THEME_ID, "starter");
  assert.deepEqual(Object.keys(THEME_REGISTRY), []);
  assert.equal(isRegisteredThemeId("starter"), false);
  assert.equal(loadTheme(undefined), undefined);
});