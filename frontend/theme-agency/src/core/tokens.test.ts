import { test } from "node:test";
import assert from "node:assert/strict";

import type { Branding } from "./contracts.ts";
import {
  buildTokenCss,
  insetLogical,
  logicalDeclaration,
  logicalPair,
  resolveBrandingOverrides,
  toVarName,
  tokenVar,
  validateTokenConfig,
} from "./tokens.ts";
import type { PrimitiveToken, TokenConfig } from "./tokens.ts";

function sampleConfig(): TokenConfig {
  const primitive: PrimitiveToken[] = [
    { name: "color.sky.500", type: "color", value: "#0ea5e9" },
    { name: "color.ink.900", type: "color", value: "#0f172a" },
    { name: "color.paper", type: "color", value: "#ffffff" },
    { name: "color.sand.300", type: "color", value: "#fcd9b8" },
    { name: "spacing.base", type: "spacing", value: "0.25rem" },
    { name: "spacing.lg", type: "spacing", value: "1.5rem" },
  ];
  return {
    primitive,
    semantic: [
      { name: "brand", type: "color", from: "color.sky.500" },
      { name: "brand-fg", type: "color", from: "color.paper" },
      { name: "text", type: "color", from: "color.ink.900" },
      { name: "surface", type: "color", from: "color.paper" },
      { name: "accent", type: "color", from: "color.sand.300" },
      { name: "border", type: "color", from: "color.sand.300" },
    ],
    component: [
      { name: "button.bg", type: "color", from: "brand" },
      { name: "button.fg", type: "color", from: "brand-fg" },
      { name: "footer.bg", type: "color", from: "surface" },
    ],
  };
}

const testBranding: Branding = {
  name: "Demo",
  logo: null,
  colors: { primary: "#7c3aed", accent: "#db2777" },
};

test("toVarName normalizes dots and camelCase for css-var safety", () => {
  assert.equal(toVarName("color.sky.500"), "color-sky-500");
  assert.equal(toVarName("brand-fg"), "brand-fg");
  assert.equal(toVarName("onPrimary"), "on-primary");
  assert.equal(toVarName("button.bg"), "button-bg");
});

test("tokenVar references the prefixed css custom property", () => {
  assert.equal(tokenVar("primitive", "color.sky.500"), "var(--primitive-color-sky-500)");
  assert.equal(tokenVar("semantic", "brand"), "var(--semantic-brand)");
  assert.equal(tokenVar("component", "button.bg"), "var(--component-button-bg)");
});

test("buildTokenCss emits all three layers with correct references", () => {
  const { css } = buildTokenCss(sampleConfig());
  assert.match(css, /--primitive-color-sky-500: #0ea5e9;/);
  assert.match(css, /--primitive-spacing-base: 0\.25rem;/);
  assert.match(css, /--semantic-brand: var\(--primitive-color-sky-500\);/);
  assert.match(css, /--semantic-surface: var\(--primitive-color-paper\);/);
  assert.match(css, /--component-button-bg: var\(--semantic-brand\);/);
  assert.match(css, /--component-footer-bg: var\(--semantic-surface\);/);
});

test("branding overrides semantic values with literals and reports the roles", () => {
  const { css, overriddenRoles } = buildTokenCss(sampleConfig(), testBranding);

  assert.match(css, /--semantic-brand: #7c3aed;/);
  assert.match(css, /--semantic-accent: #db2777;/);
  // non-overridden semantic tokens still reference primitives
  assert.match(css, /--semantic-surface: var\(--primitive-color-paper\);/);
  // components always reference semantics, never branding directly
  assert.match(css, /--component-button-bg: var\(--semantic-brand\);/);
  assert.equal(css.includes("#7c3aed"), true);
  assert.equal(css.includes("#db2777"), true);

  assert.deepEqual(overriddenRoles.sort(), ["accent", "brand"]);
});

test("resolveBrandingOverrides returns empty for absent branding", () => {
  assert.deepEqual(resolveBrandingOverrides(undefined), {
    byRole: {},
    overridden: [],
  });
});

test("validateTokenConfig accepts a well-formed config", () => {
  assert.deepEqual(validateTokenConfig(sampleConfig()), []);
});

test("validateTokenConfig flags duplicate names and unknown references", () => {
  const config = sampleConfig();
  config.primitive.push({ name: "color.sky.500", type: "color", value: "#000" });
  config.semantic.push({ name: "brand", type: "color", from: "color.sky.500" });
  config.semantic.push({ name: "broken", type: "color", from: "does.not.exist" });
  config.component.push({ name: "card.bg", type: "color", from: "ghost" });

  const errors = validateTokenConfig(config);
  assert.equal(errors.length, 4);
  assert.ok(errors.some((e) => /duplicate primitive/.test(e.message)));
  assert.ok(errors.some((e) => /duplicate semantic/.test(e.message)));
  assert.ok(errors.some((e) => /unknown primitive "does\.not\.exist"/.test(e.message)));
  assert.ok(errors.some((e) => /unknown semantic role "ghost"/.test(e.message)));
});

test("logical helpers emit inline-* properties, never physical left/right", () => {
  const margin = logicalPair("margin", "1.5rem", "0.5rem");
  assert.equal(margin, "margin-inline-start: 1.5rem; margin-inline-end: 0.5rem;");
  assert.ok(!margin.includes("left"));
  assert.ok(!margin.includes("right"));

  assert.equal(logicalDeclaration("padding", "inline-start", "1rem"), "padding-inline-start: 1rem;");
  assert.equal(insetLogical("inline-end", "var(--semantic-surface)"), "inset-inline-end: var(--semantic-surface);");
  assert.ok(!insetLogical("inline-start", "1rem").includes("left"));
});