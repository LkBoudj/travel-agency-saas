/**
 * Theme SDK — the ONLY import surface for theme developers (and the render
 * path). Themes must not import `src/core/`, `src/platform/`, the database,
 * auth internals or tenant-resolution internals directly (PROJECT_MAP
 * [CORE BOUNDARIES]). Re-exports the framework-agnostic core only.
 */
export * from "./core/contracts.ts";
export * from "./core/tokens.ts";
export * from "./core/settings-schema.ts";
export * from "./core/settings-resolve.ts";
export * from "./core/registry.ts";
export * from "./core/resolver.ts";
export * from "./core/page-models.ts";
export * from "./core/island-props.ts";
export * from "./core/island-logic.ts";