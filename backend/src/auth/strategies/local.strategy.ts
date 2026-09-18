import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { verify } from 'argon2';
import { Strategy as PassportLocalStrategy } from 'passport-local';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AppUserAccountStatus, InternalAuthUser, toInternalAuthUser } from '../auth-user.js';

@Injectable()
export class LocalStrategy extends PassportStrategy(PassportLocalStrategy) {
  constructor(private readonly prisma: PrismaService) {
    super({ usernameField: 'email' });
  }

  async validate(emailInput: string, password: string): Promise<InternalAuthUser> {
    if (!emailInput || !password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const email = emailInput.trim().toLowerCase();
    const appUser = await this.prisma.appUser.findUnique({ where: { email } });
    if (!appUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await verify(appUser.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (appUser.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is suspended');
    }

    return toInternalAuthUser({ ...appUser, status: appUser.status as AppUserAccountStatus });
  }
}