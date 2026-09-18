import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import { AUTH_COOKIE_NAME } from './auth.constants.js';

const TTL_UNIT_TO_MS = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
} as const;

function parseTtlToMs(expiresIn: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiresIn.trim());
  if (!match) {
    throw new Error(`Invalid JWT_EXPIRES_IN value: "${expiresIn}"`);
  }
  const value = Number(match[1]);
  const factor = TTL_UNIT_TO_MS[match[2] as keyof typeof TTL_UNIT_TO_MS];
  return value * factor;
}

export function buildAuthCookieOptions(config: ConfigService): CookieOptions & { maxAge: number } {
  return {
    httpOnly: true,
    secure: config.get<string>('NODE_ENV') === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: parseTtlToMs(config.get<string>('JWT_EXPIRES_IN', '15m')),
  };
}

const CLEAR_COOKIE_OPTIONS = (config: ConfigService): CookieOptions => ({
  httpOnly: true,
  secure: config.get<string>('NODE_ENV') === 'production',
  sameSite: 'lax',
  path: '/',
});

export function setAuthCookie(res: Response, token: string, config: ConfigService): void {
  res.cookie(AUTH_COOKIE_NAME, token, buildAuthCookieOptions(config));
}

export function clearAuthCookie(res: Response, config: ConfigService): void {
  res.clearCookie(AUTH_COOKIE_NAME, CLEAR_COOKIE_OPTIONS(config));
}