import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const css = readFileSync(path.resolve(import.meta.dirname, '../../../index.css'), 'utf8');

/**
 * The bottom save bar is `sticky` inside a long form, so it floats over the
 * content while the user scrolls. Without reserved scroll padding, the last
 * inputs of the form end up underneath it and a keyboard user tabs onto a
 * control they cannot see.
 */
describe('sticky save bar clearance', () => {
  test('reserves scroll padding at the end of the scrollport', () => {
    expect(css).toMatch(
      /html,\s*\.mantine-AppShell-main\s*\{[^}]*scroll-padding-block-end:\s*var\(--app-sticky-save-bar-clearance\)/
    );
  });

  test('sizes the clearance in one place', () => {
    expect(css).toMatch(/--app-sticky-save-bar-clearance:\s*\d+px/);
  });

  test('keeps the bar pinned to the logical bottom edge', () => {
    expect(css).toMatch(/\.app-sticky-save-bar\s*\{[^}]*position:\s*sticky/);
    expect(css).toMatch(/\.app-sticky-save-bar\s*\{[^}]*bottom:\s*0/);
  });
});
