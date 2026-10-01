import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const source = readFileSync(path.resolve(import.meta.dirname, './trip-editor.tsx'), 'utf8');
const css = readFileSync(path.resolve(import.meta.dirname, '../../../index.css'), 'utf8');

/**
 * The editor is a three-column layout: a 190px section nav, the form, and a
 * 290px readiness panel. On a 375px phone those two fixed columns alone are
 * wider than the viewport, so the page has to stack them below the `md`
 * breakpoint instead of scrolling sideways.
 */
describe('TripEditor narrow screens', () => {
  test('lets the three columns wrap on narrow viewports', () => {
    expect(source).toMatch(/className="app-editor-columns"/);
    expect(source).not.toMatch(/<Group[^>]*wrap="nowrap"[^>]*className="app-editor-columns"/);
    expect(css).toMatch(/\.app-editor-columns\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).toMatch(
      /@media \(min-width: 62em\)[\s\S]*?\.app-editor-columns\s*\{[^}]*flex-wrap:\s*nowrap/
    );
  });

  test('gives both side columns the full width at the base breakpoint', () => {
    const fullWidthBoxes = source.match(/w=\{\{ base: '100%', md: \d+ \}\}/g) ?? [];
    expect(fullWidthBoxes).toHaveLength(2);
  });
});
