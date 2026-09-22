import { apiRequest } from '../../../services/api.ts';
import type { AuthUser } from '../types.ts';

export function requestLogin(email: string, password: string): Promise<AuthUser> {
  return apiRequest<AuthUser>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function requestLogout(): Promise<void> {
  return apiRequest<void>('/v1/auth/logout', { method: 'POST' });
}

export function requestCurrentUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/v1/auth/me');
}
