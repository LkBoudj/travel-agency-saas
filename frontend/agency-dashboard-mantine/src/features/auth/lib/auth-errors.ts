import { ApiError } from '../../../services/api-error.ts';

export type LoginFailureKind = 'invalid-credentials' | 'rate-limited' | 'network' | 'unknown';

export function classifyLoginError(error: unknown): LoginFailureKind {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'invalid-credentials';
    }
    if (error.status === 429) {
      return 'rate-limited';
    }
    return 'unknown';
  }
  if (error instanceof TypeError) {
    return 'network';
  }
  return 'unknown';
}
