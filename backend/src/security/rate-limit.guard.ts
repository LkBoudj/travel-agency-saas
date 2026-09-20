import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RateLimitService, rateLimitKey } from './rate-limit.service.js';

export const RATE_LIMIT_KEY = 'rateLimit';

/** Which extra dimension to count alongside the client IP. */
export type RateLimitDimension =
  /** The client address. Cheap to rotate, so never the only dimension. */
  | 'ip'
  /** The normalized `email` in the body — survives IP rotation. */
  | 'email'
  /** The authenticated caller — for routes that require a session. */
  | 'actor';

export interface RateLimitOptions {
  /** Names the env pair `RATE_LIMIT_<SCOPE>_LIMIT` / `..._WINDOW_SECONDS`. */
  scope: string;
  defaultLimit: number;
  defaultWindowSeconds: number;
  dimensions: RateLimitDimension[];
}

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Applies a per-route quota before the handler runs.
 *
 * Limits are read from configuration rather than baked into controllers, so an
 * operator can tighten them without a deploy. Each dimension is counted
 * separately and any one of them can refuse the request: an attacker rotating
 * IPs still accumulates against the email they keep trying.
 *
 * Failing closed on a missing IP is deliberate — an unattributable request is
 * exactly the one not to exempt.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limiter: RateLimitService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const limit = this.numberFromConfig(`RATE_LIMIT_${options.scope}_LIMIT`, options.defaultLimit);
    const windowMs =
      this.numberFromConfig(
        `RATE_LIMIT_${options.scope}_WINDOW_SECONDS`,
        options.defaultWindowSeconds,
      ) * 1000;

    // A limit of 0 disables the route's quota, which keeps tests and local work
    // from fighting the limiter.
    if (limit <= 0) return true;

    for (const dimension of options.dimensions) {
      const value = this.dimensionValue(request, dimension);
      if (!value) continue;

      const decision = this.limiter.hit(
        rateLimitKey(options.scope, dimension, value),
        limit,
        windowMs,
      );
      if (!decision.allowed) {
        // No detail about which dimension tripped: that would itself be a hint.
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests. Try again later.',
            errorCode: 'RATE_LIMITED',
            retryAfterSeconds: decision.retryAfterSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return true;
  }

  private dimensionValue(request: Request, dimension: RateLimitDimension): string | undefined {
    if (dimension === 'ip') {
      // `ip` is undefined only when there is no socket to attribute the request
      // to; counting those together is safer than exempting them.
      return request.ip ?? 'unknown';
    }

    if (dimension === 'email') {
      const body = request.body as { email?: unknown } | undefined;
      return typeof body?.email === 'string' && body.email.trim() ? body.email : undefined;
    }

    // `actor` comes from the authenticated principal the JWT guard attached.
    const user = (request as { user?: { id?: unknown } }).user;
    return typeof user?.id === 'string' ? user.id : undefined;
  }

  private numberFromConfig(key: string, fallback: number): number {
    const raw = this.config.get<string | number>(key);
    if (raw === undefined || raw === null || raw === '') return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  }
}
