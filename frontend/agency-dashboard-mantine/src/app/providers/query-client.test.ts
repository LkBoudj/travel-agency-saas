import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../services/api-error.ts';
import { buildQueryClient } from './query-client.ts';

const THEME_DIR = path.resolve(import.meta.dirname, '..', '..', 'theme');

function themeSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return themeSourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('buildQueryClient', () => {
  it('keeps the shipped query defaults', () => {
    const defaults = buildQueryClient().getDefaultOptions();

    expect(defaults.queries?.staleTime).toBe(30_000);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaults.mutations?.retry).toBe(false);
  });

  it('does not retry client errors but does retry server and network errors', () => {
    const retry = buildQueryClient().getDefaultOptions().queries?.retry as (
      failureCount: number,
      error: unknown
    ) => boolean;

    expect(retry(0, new ApiError('bad request', 400))).toBe(false);
    expect(retry(0, new ApiError('forbidden', 403))).toBe(false);
    expect(retry(0, new ApiError('server error', 500))).toBe(true);
    expect(retry(1, new ApiError('server error', 500))).toBe(true);
    expect(retry(2, new ApiError('server error', 500))).toBe(false);
    expect(retry(0, new TypeError('offline'))).toBe(true);
  });
});

describe('theme layer boundary', () => {
  it('has no dependency on the HTTP layer', () => {
    const offenders = themeSourceFiles(THEME_DIR).filter((file) =>
      /from\s+['"][^'"]*services\/api/.test(readFileSync(file, 'utf8'))
    );

    expect(offenders).toEqual([]);
  });
});
