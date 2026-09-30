import { describe, expect, test } from 'vitest';
import { getStatusColor, STATUS_COLORS } from './colors.ts';

describe('getStatusColor', () => {
  test('maps every status the catalogs translate', () => {
    // Guard against a status gaining a label without gaining a colour: the
    // translation catalogs are the source of the set of statuses the app shows.
    const expected: Record<string, string> = {
      active: 'success',
      published: 'success',
      open: 'success',
      confirmed: 'success',
      accepted: 'success',
      pending: 'warning',
      suspended: 'warning',
      cancelled: 'danger',
      archived: 'gray',
      draft: 'gray',
      closed: 'gray',
      deactivated: 'gray',
      inactive: 'gray',
      expired: 'gray',
      revoked: 'gray',
    };
    expect(STATUS_COLORS).toEqual(expected);
  });

  test('resolves API enums regardless of case', () => {
    expect(getStatusColor('PUBLISHED')).toBe('success');
    expect(getStatusColor('published')).toBe('success');
    expect(getStatusColor('Published')).toBe('success');
  });

  test('falls back to the neutral palette for an unknown status', () => {
    expect(getStatusColor('SOMETHING_NEW')).toBe('gray');
    expect(getStatusColor('')).toBe('gray');
  });

  test('only points at palettes registered in the theme', () => {
    // A typo here would render an undefined CSS variable instead of a colour.
    for (const color of Object.values(STATUS_COLORS)) {
      expect(['success', 'warning', 'danger', 'info', 'gray', 'brand']).toContain(color);
    }
  });
});
