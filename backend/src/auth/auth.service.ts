import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppUserIdentityService } from './app-user-identity.service.js';
import { InternalAuthUser, JwtPayload } from './auth-user.js';

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

  async changePassword(userId: bigint, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.appUser.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid current password');
    }

    const isValid = await verify(user.passwordHash, currentPassword);
    if (!isValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    const hashed = await hash(newPassword);
    await this.prisma.appUser.update({
      where: { id: userId },
      data: { passwordHash: hashed },
    });
  }
}
