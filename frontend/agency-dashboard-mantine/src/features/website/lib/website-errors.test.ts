import { describe, expect, test } from 'vitest';
import { ApiError } from '../../../services/api-error.ts';
import { WEBSITE_NOT_PUBLISHED, WEBSITE_SLUG_CONFLICT } from '../types.ts';
import { classifyWebsiteError } from './website-errors.ts';

describe('classifyWebsiteError', () => {
  test('treats non-ApiError values as network errors', () => {
    expect(classifyWebsiteError(new Error('boom'))).toEqual({ kind: 'network' });
    expect(classifyWebsiteError(null)).toEqual({ kind: 'network' });
    expect(classifyWebsiteError(undefined)).toEqual({ kind: 'network' });
  });

  test('maps WEBSITE_NOT_PUBLISHED to not-published', () => {
    const error = new ApiError('msg', 404, WEBSITE_NOT_PUBLISHED);
    expect(classifyWebsiteError(error)).toEqual({ kind: 'not-published' });
  });

  test('maps WEBSITE_SLUG_CONFLICT to slug-conflict', () => {
    const error = new ApiError('msg', 409, WEBSITE_SLUG_CONFLICT);
    expect(classifyWebsiteError(error)).toEqual({ kind: 'slug-conflict' });
  });

  test('maps other statuses to unknown', () => {
    expect(classifyWebsiteError(new ApiError('msg', 400))).toEqual({ kind: 'unknown' });
    expect(classifyWebsiteError(new ApiError('msg', 500, 'INTERNAL'))).toEqual({
      kind: 'unknown',
    });
  });
});
