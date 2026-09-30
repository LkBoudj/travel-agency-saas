#!/usr/bin/env node
/**
 * theme:new — scaffold `themes/<id>/` from the Starter template.
 *
 * The Starter theme is the single source of truth for a theme's shape, so a new
 * theme is a copy plus an identifier rename. Every text file is rewritten so
 * `starterTheme`/`themes.starter.name`/`[starter]`/`starter-preview.jpg` become
 * the new id, which keeps the SDK import surface, the settings keys and the
 * Theme Lab overrides of a fresh theme consistent from the first commit.
 *
 * Usage: node tools/theme-new.mjs <id>
 */
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THEMES_DIR = path.join(ROOT, "themes");
const SOURCE_ID = "starter";

const ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".astro", ".css", ".json", ".mjs", ".md"]);

function fail(message) {
  console.error(`[theme:new] ${message}`);
  process.exit(1);
}

function pascalCase(id) {
  return id
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

/**
 * `starter` becomes the new id and `Starter` its PascalCase form, so
 * `starterTheme`, `buildStarterTokenCss`, `settings.starter.x`,
 * `[starter]` and `starter-preview.jpg` are all renamed while `startDate` and
 * `starters` are left alone (the lookahead keeps a following lowercase letter
 * from being treated as part of the name).
 */
function rewriteSource(source, id) {
  return source
    .replace(/starter(?![a-z])/g, id)
    .replace(/Starter(?![a-z])/g, pascalCase(id));
}

async function copyThemeTree(fromDir, toDir, id) {
  const entries = await readdir(fromDir, { withFileTypes: true });
  await mkdir(toDir, { recursive: true });

  for (const entry of entries) {
    const from = path.join(fromDir, entry.name);
    const to = path.join(toDir, entry.name);

    if (entry.isDirectory()) {
      await copyThemeTree(from, to, id);
      continue;
    }
    if (!TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      await cp(from, to);
      continue;
    }
    await writeFile(to, rewriteSource(await readFile(from, "utf8"), id), "utf8");
  }
}

const [id] = process.argv.slice(2);

if (!id) fail("usage: node tools/theme-new.mjs <id>");
if (!ID_PATTERN.test(id)) {
  fail(`invalid theme id "${id}" (expected ${ID_PATTERN}, e.g. "boutique" or "coastal-luxe")`);
}
if (id === SOURCE_ID) fail(`refusing to overwrite the "${SOURCE_ID}" template`);
if (existsSync(path.join(THEMES_DIR, id))) fail(`themes/${id} already exists`);

const target = path.join(THEMES_DIR, id);
await copyThemeTree(path.join(THEMES_DIR, SOURCE_ID), target, id);

console.log(`[theme:new] created themes/${id} from themes/${SOURCE_ID}`);
console.log("[theme:new] next steps:");
console.log(`  1. edit themes/${id}/manifest.ts, tokens.ts and settings-schema.ts`);
console.log(`  2. node tools/theme-check.mjs ${id}`);
console.log(`  3. preview at /_lab/${id}/home (signed token) with draft overrides`);
console.log(`  4. register: add ${id}Theme to src/theme-registry.ts, then rebuild the Worker`);
