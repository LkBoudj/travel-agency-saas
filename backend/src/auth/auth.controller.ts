import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import type { AuthUser, InternalAuthUser } from './auth-user.js';
import { toAuthUser } from './auth-user.js';
import { AUTH_COOKIE_NAME } from './auth.constants.js';
import { clearAuthCookie, setAuthCookie } from './auth.cookie.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RateLimit, RateLimitGuard } from '../security/rate-limit.guard.js';
import type { LoginBody } from './schemas.js';
import { loginSchema } from './schemas.js';

const SAFE_USER_EXAMPLE: AuthUser = {
  code: 'USR-ABCDEF123456',
  email: 'owner@agency.example',
  firstName: 'Ada',
  lastName: 'Lovelace',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(200)
  // Counted per IP and per email: an attacker rotating addresses still
  // accumulates against the account they keep trying.
  @UseGuards(RateLimitGuard)
  @RateLimit({
    scope: 'LOGIN',
    defaultLimit: 10,
    defaultWindowSeconds: 60,
    dimensions: ['ip', 'email'],
  })
  @ApiOperation({ summary: 'Log in with email and password (sets the HttpOnly auth cookie)' })
  @ApiBody({
    description: 'Credentials. Email is case-insensitive (trimmed + lowercased).',
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'owner@agency.example' },
        password: { type: 'string', minLength: 1, example: 'correct-password' },
      },
    },
    examples: {
      demo: {
        summary: 'Demo owner credentials',
        value: { email: 'owner@agency.example', password: 'correct-password' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Logged in. Sets the HttpOnly auth cookie; JWT is never in the response body.',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: SAFE_USER_EXAMPLE.code },
        email: { type: 'string', example: SAFE_USER_EXAMPLE.email },
        firstName: { type: 'string', nullable: true, example: SAFE_USER_EXAMPLE.firstName },
        lastName: { type: 'string', nullable: true, example: SAFE_USER_EXAMPLE.lastName },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @UseGuards(AuthGuard('local'))
  login(
    @Body({ schema: loginSchema }) _dto: LoginBody,
    @Req() req: Request & { user: InternalAuthUser },
    @Res({ passthrough: true }) res: Response,
  ): AuthUser {
    const { accessToken } = this.authService.login(req.user);
    setAuthCookie(res, accessToken, this.config);
    return toAuthUser(req.user);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log out by clearing the auth cookie' })
  @ApiOkResponse({ description: 'Logged out. The auth cookie is cleared.' })
  logout(@Res({ passthrough: true }) res: Response): void {
    clearAuthCookie(res, this.config);
  }

  @Get('me')
  @ApiOperation({ summary: 'Return the currently authenticated user from the auth cookie' })
  @ApiCookieAuth(AUTH_COOKIE_NAME)
  @ApiOkResponse({
    description: 'Authenticated. Returns the safe user carried in request.user.',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: SAFE_USER_EXAMPLE.code },
        email: { type: 'string', example: SAFE_USER_EXAMPLE.email },
        firstName: { type: 'string', nullable: true, example: SAFE_USER_EXAMPLE.firstName },
        lastName: { type: 'string', nullable: true, example: SAFE_USER_EXAMPLE.lastName },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid or expired auth cookie' })
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: InternalAuthUser): AuthUser {
    return toAuthUser(user);
  }
}