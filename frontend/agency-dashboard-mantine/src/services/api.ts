import { getEnv } from '../config/env.ts';
import { ApiError, parseErrorBody } from './api-error.ts';

export { ApiError, parseErrorBody };

/**
 * The single transport to the NestJS API.
 *
 * Session auth is an HttpOnly cookie, so `credentials: "include"` is the whole
 * authentication mechanism — the token is never read, stored, or attached by
 * client code.
 */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getEnv().apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      // Non-JSON error body → normalized generic below.
    }

    const { message, code, metadata } = parseErrorBody(body);
    throw new ApiError(
      message === 'Request failed' ? `Request failed (${response.status})` : message,
      response.status,
      code,
      metadata
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (text.trim().length === 0) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
