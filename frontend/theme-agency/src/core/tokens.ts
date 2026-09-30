import type { Branding, BrandColorName } from "./contracts.ts";

/**
 * Three-layer design tokens.
 *
 * Layers (PROJECT_MAP_THEME_AGENCY.md): primitive → semantic → component.
 *   primitive  — raw naming-only values (palette, spacing, radii, …)
 *   semantic   — roles components read (brand, text, surface, border, …)
 *               agency branding overrides the value here (literal, not ref)
 *   component  — per-component tokens derived from semantic roles
 *
 * RTL/bidi safety: tokens hold values, not physical directions; helpers that
 * emit spacing emit logical properties (margin-inline-start / inset-inline-*)
 * so one theme serves both LTR and RTL (`ar` is a product language).
 */

export interface TokenError {
  name: string;
  message: string;
}

export interface TokenRef {
  /** Dotted name within the layer, e.g. "color.sky.500" or "button.bg". */
  name: string;
  type: "color" | "spacing" | "radius" | "font-size" | "font-weight";
}

/** Literal values (the only layer holding concrete values). */
export interface PrimitiveToken extends TokenRef {
  value: string;
}

/** References a primitive token. */
export interface SemanticToken extends TokenRef {
  from: string;
}

/** References a semantic role. */
export interface ComponentToken extends TokenRef {
  from: string;
}

export interface TokenConfig {
  primitive: PrimitiveToken[];
  semantic: SemanticToken[];
  component: ComponentToken[];
}

export type TokenLayerName = "primitive" | "semantic" | "component";

/** camelCase → kebab-case, "." → "-", lowercase. CSS-var-safe name. */
export function toVarName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/\./g, "-")
    .toLowerCase();
}

export function tokenVar(layer: TokenLayerName, name: string): string {
  return `var(--${layer}-${toVarName(name)})`;
}

function primitiveVar(from: string): string {
  return `var(--primitive-${toVarName(from)})`;
}

function semanticVar(from: string): string {
  return `var(--semantic-${toVarName(from)})`;
}

// ---------------------------------------------------------------------------
// Branding → semantic mapping
// ---------------------------------------------------------------------------

/** Each branding color key is an agency-controlled semantic role override. */
export const BRANDING_ROLE_MAP: Record<BrandColorName, string> = {
  primary: "brand",
  onPrimary: "brand-fg",
  accent: "accent",
  text: "text",
  surface: "surface",
};

export interface BrandingOverrides {
  byRole: Record<string, string>;
  overridden: string[];
}

/**
 * Maps agency branding onto the semantic layer ONLY (components never read
 * branding directly). Returns literal values keyed by semantic role and the
 * list of roles the agency overrides.
 */
export function resolveBrandingOverrides(
  branding: Branding | undefined,
): BrandingOverrides {
  const byRole: Record<string, string> = {};
  const overridden: string[] = [];
  if (!branding) return { byRole, overridden };

  for (const [key, value] of Object.entries(branding.colors)) {
    const role = BRANDING_ROLE_MAP[key as BrandColorName];
    if (role && typeof value === "string" && value !== "") {
      byRole[role] = value;
      overridden.push(role);
    }
  }
  return { byRole, overridden };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateTokenConfig(config: TokenConfig): TokenError[] {
  const errors: TokenError[] = [];

  const primitiveNames = new Set<string>();
  for (const token of config.primitive) {
    if (primitiveNames.has(token.name)) {
      errors.push({
        name: token.name,
        message: `duplicate primitive token name "${token.name}"`,
      });
    }
    primitiveNames.add(token.name);
  }

  const semanticRoles = new Set<string>();
  for (const token of config.semantic) {
    if (semanticRoles.has(token.name)) {
      errors.push({
        name: token.name,
        message: `duplicate semantic token name "${token.name}"`,
      });
    }
    semanticRoles.add(token.name);
    if (!primitiveNames.has(token.from)) {
      errors.push({
        name: token.name,
        message: `semantic "${token.name}" references unknown primitive "${token.from}"`,
      });
    }
  }

  const componentNames = new Set<string>();
  for (const token of config.component) {
    if (componentNames.has(token.name)) {
      errors.push({
        name: token.name,
        message: `duplicate component token name "${token.name}"`,
      });
    }
    componentNames.add(token.name);
    if (!semanticRoles.has(token.from)) {
      errors.push({
        name: token.name,
        message: `component "${token.name}" references unknown semantic role "${token.from}"`,
      });
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// CSS emission
// ---------------------------------------------------------------------------

function declarations(header: string, lines: string[]): string {
  if (lines.length === 0) return "";
  return `${header}\n${lines.join("\n")}\n}`;
}

function emitPrimitive(tokens: PrimitiveToken[]): string {
  return declarations(
    ":root {",
    tokens.map((token) => `  --primitive-${toVarName(token.name)}: ${token.value};`),
  );
}

function emitSemantic(
  tokens: SemanticToken[],
  overrides: Record<string, string>,
): string {
  return declarations(
    ":root {",
    tokens.map((token) => {
      const override = overrides[toVarName(token.name)];
      const value = override
        ? override
        : primitiveVar(token.from);
      return `  --semantic-${toVarName(token.name)}: ${value};`;
    }),
  );
}

function emitComponent(tokens: ComponentToken[]): string {
  return declarations(
    ":root {",
    tokens.map(
      (token) => `  --component-${toVarName(token.name)}: ${semanticVar(token.from)};`,
    ),
  );
}

export interface BuildTokenCssResult {
  css: string;
  /** Semantic roles the agency branding overrode. */
  overriddenRoles: string[];
}

export function buildTokenCss(
  config: TokenConfig,
  branding?: Branding,
): BuildTokenCssResult {
  const { byRole, overridden } = resolveBrandingOverrides(branding);

  const blocks = [
    emitPrimitive(config.primitive),
    emitSemantic(config.semantic, byRole),
    emitComponent(config.component),
  ].filter((block) => block !== "");

  return { css: blocks.join("\n\n") + "\n", overriddenRoles: overridden };
}

// ---------------------------------------------------------------------------
// RTL-safe logical-property helpers used by themes/components
// ---------------------------------------------------------------------------

export type LogicalEdge = "inline-start" | "inline-end";

export function logicalDeclaration(
  property: "margin" | "padding",
  edge: LogicalEdge,
  value: string,
): string {
  return `${property}-${edge}: ${value};`;
}

export function logicalPair(
  property: "margin" | "padding",
  start: string,
  end: string,
): string {
  return `${logicalDeclaration(property, "inline-start", start)} ${logicalDeclaration(property, "inline-end", end)}`;
}

export function insetLogical(edge: LogicalEdge, value: string): string {
  return `inset-inline-${edge === "inline-start" ? "start" : "end"}: ${value};`;
}