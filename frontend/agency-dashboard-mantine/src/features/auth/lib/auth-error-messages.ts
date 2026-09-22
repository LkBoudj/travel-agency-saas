import { classifyLoginError, type LoginFailureKind } from './auth-errors.ts';

type Translate = (key: string) => string;

const LOGIN_ERROR_KEYS: Record<LoginFailureKind, string> = {
  'invalid-credentials': 'errors.invalidCredentials',
  'rate-limited': 'errors.rateLimited',
  network: 'errors.network',
  unknown: 'errors.generic',
};

export function getLoginErrorMessage(error: unknown, t: Translate): string {
  return t(LOGIN_ERROR_KEYS[classifyLoginError(error)]);
}
