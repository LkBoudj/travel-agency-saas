import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { verify } from 'argon2';
import { Strategy as PassportLocalStrategy } from 'passport-local';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AppUserAccountStatus, InternalAuthUser, toInternalAuthUser } from '../auth-user.js';
import { DUMMY_PASSWORD_HASH } from '../dummy-password-hash.js';

@Injectable()
export class LocalStrategy extends PassportStrategy(PassportLocalStrategy) {
  constructor(private readonly prisma: PrismaService) {
    super({ usernameField: 'email' });
  }

  /**
   * Verifies credentials without revealing whether the email exists.
   *
   * An unknown email used to return before argon2 ever ran, which made the
   * response time itself an account-existence oracle: a miss answered in tens of
   * milliseconds, a hit paid the full hashing cost. The fix is to always perform
   * one real verification — against the account's hash when there is one, and
   * against a fixed dummy hash when there is not — so both paths do comparable
   * work and return the same 401.
   *
   * This removes the argon2 work-factor oracle. It is not constant time end to
   * end: database latency, network jitter and V8 still vary, and a determined
   * attacker with enough samples may find residual signal. Rate limiting is the
   * companion control.
   */
  async validate(emailInput: string, password: string): Promise<InternalAuthUser> {
    if (!emailInput || !password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const email = emailInput.trim().toLowerCase();
    const appUser = await this.prisma.appUser.findUnique({ where: { email } });

    // Always hash. When the account does not exist the result is discarded, but
    // the work has been done and the timing no longer distinguishes the cases.
    const passwordValid = await verify(appUser?.passwordHash ?? DUMMY_PASSWORD_HASH, password);

    if (!appUser || !passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (appUser.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is suspended');
    }

    return toInternalAuthUser({ ...appUser, status: appUser.status as AppUserAccountStatus });
  }
}
