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

  login(user: InternalAuthUser): { accessToken: string } {
    const payload: JwtPayload = { sub: user.id };
    return { accessToken: this.jwt.sign(payload) };
  }
}