import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants.js';
import {
  AppUserAccountStatus,
  InternalAuthUser,
  JwtPayload,
  toInternalAuthUser,
} from '../auth/auth-user.js';

/** Same cookie parsing the JWT strategy uses, so both entry points agree. */
function cookieValue(request: Request, cookieName: string): string | null {
  const cookieHeader = request.headers?.cookie;
  if (typeof cookieHeader !== 'string') return null;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    if (name === cookieName) {
      return part.slice(separator + 1).trim();
    }
  }
  return null;
}

/**
 * Resolves the current identity WITHOUT requiring authentication.
 *
 * The public token endpoints accept either an anonymous browser (who then sets
 * a password) or a logged-in account (which must match the invited email). That
 * is deliberately weaker than JwtAuthGuard: an invalid, expired or suspended
 * session resolves to `null` — the request proceeds anonymously and the accept
 * flow decides what an anonymous caller may do. Mirrors JwtStrategy's rules
 * (subject must parse, account must exist and be ACTIVE); status is never taken
 * from the token.
 */
@Injectable()
export class OptionalJwtResolver {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async resolve(request: Request): Promise<InternalAuthUser | null> {
    const token = cookieValue(request, AUTH_COOKIE_NAME);
    if (!token) return null;

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      return null;
    }
    if (!payload?.sub) return null;

    let id: bigint;
    try {
      id = BigInt(payload.sub);
    } catch {
      return null;
    }

    const appUser = await this.prisma.appUser.findUnique({
      where: { id },
      select: { id: true, code: true, email: true, firstName: true, lastName: true, status: true },
    });
    if (!appUser || appUser.status === 'SUSPENDED') return null;

    return toInternalAuthUser({ ...appUser, status: appUser.status as AppUserAccountStatus });
  }
}