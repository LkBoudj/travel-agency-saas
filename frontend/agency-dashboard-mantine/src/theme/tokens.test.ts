import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * Token discipline.
 *
 * The app has a real token layer (`--app-*` in the `:root` block) and every
 * surface, border and muted text colour in the product is supposed to come from
 * it. Nothing stops a future edit from writing `var(--mantine-color-gray-4)` or
 * a raw hex straight into a component, which is how the dark-scheme leftovers
 * and the hardcoded teal got in. These tests fail on that, not on taste.
 */

const SRC = path.resolve(import.meta.dirname, '..');
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.css', '.svg'];

/** This file names the tokens and the patterns it bans, so it cannot police itself. */
const SELF = path.join(SRC, 'theme/tokens.test.ts');

/** Where `--app-*` may be declared: the token layer and the base stylesheet. */
const TOKEN_LAYER_FILES = [path.join(SRC, 'theme/tokens.css'), path.join(SRC, 'index.css')];

/**
 * Files allowed to name Mantine's palette ramps directly: the token layer and the
 * theme layer, plus `contrast.test.ts`, which asserts on the variable names it
 * expects the theme to emit.
 */
const PALETTE_ALLOWLIST = new Set([
  path.join(SRC, 'index.css'),
  path.join(SRC, 'theme/tokens.css'),
  path.join(SRC, 'theme/component-defaults.ts'),
  path.join(SRC, 'theme/theme.ts'),
  path.join(SRC, 'theme/contrast.test.ts'),
]);

/**
 * Mantine's *semantic* variables (`dimmed`, `text`, `body`, `default-hover`, …)
 * are theme decisions, not palette steps, so they are not what this bans. What is
 * banned is naming a palette step — the hardcoded `teal-6` that meant "good" and
 * the `gray-4` that meant "border" are exactly the drift this catches.
 */
const PALETTE_STEP =
  /var\(--mantine-color-(?:brand|gray|dark|success|warning|danger|info|red|orange|yellow|green|teal|cyan|blue|grape|violet|pink|indigo|lime)-\d/g;

/**
 * Files allowed to contain a raw hex. `theme/colors.ts` owns the palettes and the
 * style guide documents them by printing them.
 *
 * A file that holds user-picked colour *data* is not on this list; it declares
 * itself with `RAW_HEX_EXEMPT` instead, because the theme layer cannot name the
 * files that qualify without depending on feature internals.
 */
const HEX_ALLOWLIST = new Set([
  path.join(SRC, 'favicon.svg'),
  path.join(SRC, 'theme/colors.ts'),
  path.join(SRC, 'theme/contrast.test.ts'),
  path.join(SRC, 'theme/theme.ts'),
  // The token layer is where a literal belongs: it is the one file every colour
  // is funnelled through, so a hex here is a decision, not a shortcut. The dark
  // navigation rail has no Mantine palette behind it and so has to spell its four
  // steps out; everything else must still reach them through `var(--app-*)`.
  path.join(SRC, 'theme/tokens.css'),
  path.join(SRC, 'pages/StyleGuide.page.tsx'),
]);

/**
 * A file opts out of the raw-hex ban by naming this marker in a comment. The rule
 * is about chrome, not about data: a colour *value* a member picks for a theme
 * setting is stored exactly as written, and is not expressible as a token. The
 * exemption travels with the file instead of being listed here, the way a lint
 * suppression does — the token layer states the convention, never the consumer.
 */
const RAW_HEX_EXEMPT = /app-allow-raw-hex/;

/** The tokens the whole product is built on; losing one breaks pages, not just styling. */
const FOUNDATION_TOKENS = [
  '--app-surface-page',
  '--app-surface-raised',
  '--app-surface-sunken',
  '--app-border-subtle',
  '--app-border-strong',
  '--app-row-hover',
  '--app-skeleton',
  '--app-focus-ring',
  '--app-accent-border',
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(full);
    }
    return SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext)) ? [full] : [];
  });
}

const FILES = sourceFiles(SRC).filter((file) => file !== SELF);

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

function collect(files: string[], pattern: RegExp): string[] {
  return files.flatMap((file) =>
    [...read(file).matchAll(pattern)].map(
      (match) => `${path.relative(SRC, file)}: ${match[1] ?? match[0]}`
    )
  );
}

describe('token layer', () => {
  const declared = new Set(
    TOKEN_LAYER_FILES.flatMap((file) =>
      [...read(file).matchAll(/^\s*(--app-[a-z0-9-]+)\s*:/gm)].map((match) => match[1])
    )
  );

  test('declares every foundation token', () => {
    expect([...FOUNDATION_TOKENS.filter((token) => !declared.has(token))]).toEqual([]);
  });

  test('every --app-* custom property used in src/ is declared by the token layer', () => {
    const used = collect(FILES, /var\((--app-[a-z0-9-]+)/g);
    expect(used.length).toBeGreaterThan(0);

    const undeclared = [...new Set(used.map((hit) => hit.split(': ')[1]))].filter(
      (token) => !declared.has(token)
    );
    expect(undeclared).toEqual([]);
  });

  test('pins the stat-tile anatomy to a 13px label over a 24px value', () => {
    // A component test can only assert that the tile points at these tokens;
    // jsdom resolves no custom property. This is where 13px and 24px are
    // actually enforced, so the anatomy cannot drift back to Mantine's defaults.
    const layer = TOKEN_LAYER_FILES.map(read).join('\n');

    expect(layer).toMatch(/--app-tile-label-size:\s*0\.8125rem/); // 13px
    expect(layer).toMatch(/--app-tile-value-size:\s*1\.5rem/); // 24px
  });

  test('pins the table contract to the two neutral literals the reference measures', () => {
    // Mantine's gray ramp is blue-tinted: gray-1 (`#f1f3f5`) and gray-3
    // (`#dee2e6`) are the closest steps, and both read as tinted against a
    // neutral page. The header band and the separator are therefore spelled out
    // as literals here — the same reason the nav rail spells out its four steps —
    // and the theme reads only these tokens. A `gray-N` fallback would silently
    // reintroduce the cast the redesign is removing.
    const layer = TOKEN_LAYER_FILES.map(read).join('\n');

    expect(layer).toMatch(/--app-table-header-surface:\s*#f7f7f7/i);
    expect(layer).toMatch(/--app-table-separator:\s*#e3e3e3/i);
  });
});

describe('palette discipline', () => {
  test('no file outside the allowlist names a Mantine palette step', () => {
    const offenders = collect(
      FILES.filter((file) => !PALETTE_ALLOWLIST.has(file)),
      PALETTE_STEP
    );
    expect(offenders).toEqual([]);
  });

  test('no raw hex outside the allowlist', () => {
    const offenders = collect(
      FILES.filter((file) => !HEX_ALLOWLIST.has(file) && !RAW_HEX_EXEMPT.test(read(file))),
      /#[0-9a-fA-F]{3,8}\b/g
    );
    expect(offenders).toEqual([]);
  });
});

describe('banned effects', () => {
  test('no glassmorphism survives in app source', () => {
    expect(collect(FILES, /backdrop-?[Ff]ilter|--app-glass/g)).toEqual([]);
  });

  test('no decorative CSS gradient survives in app source', () => {
    expect(collect(FILES, /(linear|radial|conic)-gradient\(/g)).toEqual([]);
  });
});
