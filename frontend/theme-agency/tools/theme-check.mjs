#!/usr/bin/env node
/**
 * theme:check — validate `themes/<id>/` against the theme contract.
 *
 * Types already enforce a theme's *structure* (`ThemeDefinition`), so this tool
 * checks the things a type system cannot see:
 *
 *   identity    — manifest id matches the directory, keys are id-scoped
 *   settings    — schema keys unique, field types valid, defaults complete and
 *                 type-compatible (the platform validates agency values against
 *                 this schema, so a bad schema is a runtime failure for a tenant)
 *   exports     — the required modules/exports a theme must expose
 *   imports     — no database/auth/tenant/SEO internals, no platform internals
 *   styling     — no hardcoded hex outside the token layer
 *
 * `manifest.ts` and `settings-schema.ts` are imported for real (they only carry
 * `import type`, so Node can read them directly); the remaining checks read the
 * sources, because `index.ts` pulls in `.astro` files Node cannot load.
 *
 * Usage: node tools/theme-check.mjs [id]   (no id = check every theme)
 */
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THEMES_DIR = path.join(ROOT, "themes");

const SETTINGS_FIELD_TYPES = new Set(["boolean", "select", "text", "color", "number"]);
const PAGE_KINDS = ["home", "trips", "trip-detail"];

/** Import specifiers a theme must never reach for. */
const FORBIDDEN_MODULES = ["prisma", "db", "nestjs", "auth", "tenant", "seo"];
/** The only external imports a theme may use (PROJECT_MAP [CORE BOUNDARIES]). */
const ALLOWED_IMPORTS = ["@theme-agency/sdk", "@theme-agency/islands/"];
/** Source directories a theme may not import from. */
const FORBIDDEN_PATH_FRAGMENTS = ["src/platform", "src/core", "src/fixtures", "src/islands/"];

const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".astro", ".css", ".mjs"]);
const ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const TOKEN_OWNER = "tokens.ts";
// 3/6/8-digit hex only: a 4-digit run is far more often a CSS id selector.
const HEX_PATTERN = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g;
const IMPORT_PATTERN = /(?:\bfrom\s*|\bimport\s*\(\s*)["']([^"']+)["']/g;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pascalCase(id) {
  return id
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

/** Picks the manifest export regardless of how the theme named it. */
function findExport(module, predicate) {
  for (const value of Object.values(module)) {
    if (predicate(value)) return value;
  }
  return null;
}

function checkManifest(manifest, id, problems) {
  if (!manifest) {
    problems.push("manifest.ts: no manifest object exported (expected an object with id/nameKey/descriptionKey/version)");
    return;
  }
  if (manifest.id !== id) {
    problems.push(`manifest.ts: id "${String(manifest.id)}" does not match directory "themes/${id}"`);
  }
  for (const key of ["nameKey", "descriptionKey", "version"]) {
    if (typeof manifest[key] !== "string" || manifest[key].trim() === "") {
      problems.push(`manifest.ts: "${key}" must be a non-empty string`);
    }
  }
  for (const key of ["nameKey", "descriptionKey"]) {
    const value = manifest[key];
    if (typeof value === "string" && !value.startsWith(`themes.${id}.`)) {
      problems.push(`manifest.ts: "${key}" should be id-scoped ("themes.${id}.…")`);
    }
  }
}

function checkFieldTypes(value, type, key, problems) {
  if (type === "boolean") {
    if (typeof value !== "boolean") problems.push(`settings-schema.ts: default for "${key}" must be a boolean`);
    return;
  }
  if (type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      problems.push(`settings-schema.ts: default for "${key}" must be a finite number`);
    }
    return;
  }
  if (typeof value !== "string") {
    problems.push(`settings-schema.ts: default for "${key}" must be a string`);
  }
}

function checkSettings(schema, defaults, problems) {
  if (!schema) {
    problems.push("settings-schema.ts: no settings schema exported (expected an object with a fields array)");
    return;
  }
  if (!Array.isArray(schema.fields) || schema.fields.length === 0) {
    problems.push("settings-schema.ts: schema.fields must be a non-empty array");
    return;
  }

  const seen = new Set();
  for (const field of schema.fields) {
    if (!isPlainObject(field)) {
      problems.push("settings-schema.ts: every field must be an object");
      continue;
    }
    const { key, type, group, labelKey } = field;
    if (typeof key !== "string" || key.trim() === "") {
      problems.push("settings-schema.ts: every field needs a non-empty key");
      continue;
    }
    if (seen.has(key)) problems.push(`settings-schema.ts: duplicate field key "${key}"`);
    seen.add(key);

    if (!SETTINGS_FIELD_TYPES.has(type)) {
      problems.push(`settings-schema.ts: field "${key}" has unsupported type "${String(type)}"`);
    }
    if (typeof group !== "string" || group.trim() === "") {
      problems.push(`settings-schema.ts: field "${key}" needs a non-empty group`);
    }
    if (typeof labelKey !== "string" || labelKey.trim() === "") {
      problems.push(`settings-schema.ts: field "${key}" needs a non-empty labelKey`);
    }
    if (type === "select") {
      const options = field.options;
      if (!Array.isArray(options) || options.length === 0) {
        problems.push(`settings-schema.ts: select field "${key}" needs a non-empty options array`);
      } else {
        const values = new Set();
        for (const option of options) {
          if (!isPlainObject(option) || typeof option.value !== "string") {
            problems.push(`settings-schema.ts: select field "${key}" has an invalid option`);
            continue;
          }
          if (values.has(option.value)) {
            problems.push(`settings-schema.ts: select field "${key}" has duplicate option "${option.value}"`);
          }
          values.add(option.value);
        }
      }
    }
    if (type === "number") {
      for (const bound of ["min", "max", "step"]) {
        if (field[bound] !== undefined && typeof field[bound] !== "number") {
          problems.push(`settings-schema.ts: field "${key}" has a non-numeric "${bound}"`);
        }
      }
      if (typeof field.min === "number" && typeof field.max === "number" && field.min > field.max) {
        problems.push(`settings-schema.ts: field "${key}" has min > max`);
      }
    }
  }

  if (!isPlainObject(defaults)) {
    problems.push("settings-schema.ts: no theme settings defaults exported (expected a plain object)");
    return;
  }

  for (const key of seen) {
    if (!(key in defaults)) {
      problems.push(`settings-schema.ts: missing default for "${key}"`);
      continue;
    }
    const field = schema.fields.find((candidate) => candidate?.key === key);
    checkFieldTypes(defaults[key], field?.type, key, problems);
    if (field?.type === "select" && Array.isArray(field.options)) {
      const allowed = field.options.map((option) => option?.value);
      if (!allowed.includes(defaults[key])) {
        problems.push(`settings-schema.ts: default for "${key}" is not one of its options`);
      }
    }
  }
  for (const key of Object.keys(defaults)) {
    if (!seen.has(key)) {
      problems.push(`settings-schema.ts: default "${key}" has no matching schema field`);
    }
  }
}

function checkIndexSource(source, problems) {
  if (!/export\s+(const|default)\s/.test(source)) {
    problems.push("index.ts: expected an exported theme object (export const <id>Theme or export default)");
  }
  if (!/ThemeDefinition/.test(source)) {
    problems.push("index.ts: theme must be typed as ThemeDefinition so the contract is enforced");
  }
  // The `pages` map must declare one template per platform page kind; scanning
  // the whole file would pass on an unrelated `["home", "trips", "trip-detail"]`
  // list, so only the map itself is inspected.
  const pages = /pages:\s*\{([^}]*)\}/s.exec(source);
  if (!pages) {
    problems.push('index.ts: theme is missing a "pages" map');
  } else {
    for (const kind of PAGE_KINDS) {
      const pattern = kind === "trip-detail" ? /["']trip-detail["']/ : new RegExp(`\\b${kind}\\b`);
      if (!pattern.test(pages[1])) {
        problems.push(`index.ts: pages must include a "${kind}" template`);
      }
    }
  }
  for (const member of ["Layout", "sections", "settings"]) {
    if (!new RegExp(`\\b${member}\\b`).test(source)) {
      problems.push(`index.ts: theme is missing "${member}"`);
    }
  }
}

function checkTokensSource(source, id, problems) {
  if (!/TokenConfig/.test(source)) {
    problems.push("tokens.ts: token config must be typed as TokenConfig");
  }
  for (const layer of ["primitive", "semantic"]) {
    if (!new RegExp(`\\b${layer}\\s*:`).test(source)) {
      problems.push(`tokens.ts: token config is missing the "${layer}" layer`);
    }
  }
  const expected = `build${pascalCase(id)}TokenCss`;
  if (!source.includes(`export function ${expected}`)) {
    problems.push(`tokens.ts: expected an exported ${expected}() helper`);
  }
  if (!/buildTokenCss/.test(source)) {
    problems.push("tokens.ts: token css must come from the SDK buildTokenCss()");
  }
}

function checkImports(relativeFile, source, themeDir, problems) {
  for (const match of source.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1];

    if (ALLOWED_IMPORTS.some((allowed) => specifier.startsWith(allowed))) continue;

    if (specifier.startsWith(".")) {
      const resolved = path.resolve(path.dirname(relativeFile), specifier);
      if (!resolved.startsWith(`${themeDir}${path.sep}`)) {
        problems.push(`${path.relative(ROOT, relativeFile)}: themes may only import from the SDK, shared islands and their own directory (found "${specifier}")`);
        continue;
      }
      if (FORBIDDEN_PATH_FRAGMENTS.some((fragment) => resolved.includes(fragment))) {
        problems.push(`${path.relative(ROOT, relativeFile)}: forbidden import "${specifier}"`);
      }
      continue;
    }

    const segments = specifier.split("/").flatMap((segment) => segment.split(/^@/));
    const banned = segments.find((segment) => FORBIDDEN_MODULES.includes(segment.toLowerCase()));
    if (banned) {
      problems.push(
        `${path.relative(ROOT, relativeFile)}: forbidden import "${specifier}" (themes must not reach for ${banned})`,
      );
    } else {
      problems.push(
        `${path.relative(ROOT, relativeFile)}: unexpected external import "${specifier}" (use @theme-agency/sdk or @theme-agency/islands/*)`,
      );
    }
  }
}

function checkHardcodedHex(relativeFile, source, problems) {
  if (path.basename(relativeFile) === TOKEN_OWNER) return;
  const lines = source.split("\n");
  lines.forEach((line, index) => {
    for (const match of line.matchAll(HEX_PATTERN)) {
      problems.push(
        `${path.relative(ROOT, relativeFile)}:${index + 1}: hardcoded color "${match[0]}" — colours belong in ${TOKEN_OWNER}`,
      );
    }
  });
}

async function loadModule(themeDir, file, problems) {
  const target = path.join(themeDir, file);
  if (!existsSync(target)) {
    problems.push(`missing required file: ${path.relative(ROOT, target)}`);
    return null;
  }
  try {
    return await import(pathToFileURL(target).href);
  } catch (error) {
    problems.push(`${file}: could not be loaded (${error.message.split("\n")[0]})`);
    return null;
  }
}

async function checkTheme(id) {
  const problems = [];
  const themeDir = path.join(THEMES_DIR, id);

  const manifestModule = await loadModule(themeDir, "manifest.ts", problems);
  if (manifestModule) {
    checkManifest(
      findExport(manifestModule, (value) => isPlainObject(value) && "nameKey" in value && "version" in value),
      id,
      problems,
    );
  }

  const settingsModule = await loadModule(themeDir, "settings-schema.ts", problems);
  if (settingsModule) {
    checkSettings(
      findExport(settingsModule, (value) => isPlainObject(value) && Array.isArray(value.fields)),
      findExport(
        settingsModule,
        (value) => isPlainObject(value) && !Array.isArray(value.fields),
      ),
      problems,
    );
  }

  const files = await walk(themeDir);
  for (const file of files) {
    if (!SCANNED_EXTENSIONS.has(path.extname(file))) continue;
    const source = await readFile(file, "utf8");
    const relative = path.relative(themeDir, file);

    if (relative === "index.ts") checkIndexSource(source, problems);
    if (relative === "tokens.ts") checkTokensSource(source, id, problems);
    checkImports(file, source, themeDir, problems);
    checkHardcodedHex(file, source, problems);
  }

  return { id, files: files.length, problems };
}

const [requested] = process.argv.slice(2);
const ids = requested
  ? [requested]
  : (await readdir(THEMES_DIR, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

if (ids.length === 0) {
  console.error("[theme:check] no themes found under themes/");
  process.exit(1);
}

let failed = 0;
for (const id of ids) {
  if (!ID_PATTERN.test(id)) {
    console.error(`[theme:check] invalid theme directory name "${id}"`);
    failed += 1;
    continue;
  }
  const { files, problems } = await checkTheme(id);
  if (problems.length === 0) {
    console.log(`[theme:check] themes/${id}: ok (${files} files)`);
    continue;
  }
  failed += 1;
  console.error(`[theme:check] themes/${id}: ${problems.length} problem(s)`);
  for (const problem of problems) console.error(`  - ${problem}`);
}

process.exit(failed === 0 ? 0 : 1);
