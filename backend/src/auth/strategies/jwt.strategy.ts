import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy as PassportJwtStrategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AUTH_COOKIE_NAME } from '../auth.constants.js';
import { InternalAuthUser, JwtPayload, toInternalAuthUser } from '../auth-user.js';

function cookieJwtExtractor(cookieName: string): (request: {
  headers?: Record<string, unknown>;
}) => string | null {
  return (request): string | null => {
    const cookieHeader = request.headers?.cookie;
    if (typeof cookieHeader !== 'string') {
      return null;
    }
    for (const part of cookieHeader.split(';')) {
      const separator = part.indexOf('=');
      if (separator === -1) {
        continue;
      }
      const name = part.slice(0, separator).trim();
      if (name === cookieName) {
        return part.slice(separator + 1).trim();
      }
    }
    return null;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(PassportJwtStrategy) {
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieJwtExtractor(AUTH_COOKIE_NAME)]),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<InternalAuthUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    let id: bigint;
    try {
      id = BigInt(payload.sub);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const appUser = await this.prisma.appUser.findUnique({ where: { id } });
    if (!appUser) {
      throw new UnauthorizedException('Invalid token');
    }

    return toInternalAuthUser(appUser);
  }
}