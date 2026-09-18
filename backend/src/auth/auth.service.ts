import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppUserIdentityService } from './app-user-identity.service.js';
import { AuthUser, InternalAuthUser, JwtPayload, toAuthUser } from './auth-user.js';
import { RegisterBody } from './schemas.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly identity: AppUserIdentityService,
  ) {}

  async register(input: RegisterBody): Promise<AuthUser> {
    const prepared = await this.identity.prepare(input);

    try {
      const appUser = await this.identity.create(this.prisma, prepared);
      return toAuthUser({ ...prepared, code: appUser.code });
    } catch (error) {
      return this.identity.rethrowAsIdentityConflict(error, prepared.email, (email) =>
        this.identity.emailExists(this.prisma, email),
      );
    }
  }

  login(user: InternalAuthUser): { accessToken: string } {
    const payload: JwtPayload = { sub: user.id };
    return { accessToken: this.jwt.sign(payload) };
  }
}