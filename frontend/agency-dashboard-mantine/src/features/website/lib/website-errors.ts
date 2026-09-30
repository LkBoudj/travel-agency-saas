import { ApiError } from '../../../services/api-error.ts';
import { WEBSITE_NOT_PUBLISHED, WEBSITE_SLUG_CONFLICT } from '../types.ts';

export type WebsiteErrorKind = 'not-published' | 'slug-conflict' | 'network' | 'unknown';

export interface WebsiteErrorInfo {
  kind: WebsiteErrorKind;
}

export function classifyWebsiteError(error: unknown): WebsiteErrorInfo {
  if (!(error instanceof ApiError)) {
    return { kind: 'network' };
  }

  if (error.code === WEBSITE_NOT_PUBLISHED) {
    return { kind: 'not-published' };
  }

  if (error.code === WEBSITE_SLUG_CONFLICT) {
    return { kind: 'slug-conflict' };
  }

  return { kind: 'unknown' };
}
