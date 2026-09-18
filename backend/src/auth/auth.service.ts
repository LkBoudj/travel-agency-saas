import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'argon2';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { generateAppUserCode } from './app-user-code.js';
import { AuthUser, InternalAuthUser, JwtPayload, toAuthUser } from './auth-user.js';
import { RegisterBody } from './schemas.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterBody): Promise<AuthUser> {
    const data = {
      code: generateAppUserCode(),
      email: input.email,
      passwordHash: await hash(input.password),
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
    };

    let appUser;
    try {
      appUser = await this.prisma.appUser.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = error.meta?.target;
        if (Array.isArray(target) && target.includes('email')) {
          throw new ConflictException({
            statusCode: 409,
            message: 'Email is already registered',
            errorCode: 'EMAIL_ALREADY_REGISTERED',
          });
        }
        throw new ConflictException({
          statusCode: 409,
          message: 'Could not create user',
          errorCode: 'USER_CREATE_CONFLICT',
        });
      }
      throw error;
    }

    return toAuthUser(appUser);
  }

  login(user: InternalAuthUser): { accessToken: string } {
    const payload: JwtPayload = { sub: user.id };
    return { accessToken: this.jwt.sign(payload) };
  }
}