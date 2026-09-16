import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import type { AuthUser, InternalAuthUser } from './auth-user.js';
import { toAuthUser } from './auth-user.js';
import { clearAuthCookie, setAuthCookie } from './auth.cookie.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import type { LoginBody, RegisterBody } from './schemas.js';
import { loginSchema, registerSchema } from './schemas.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  register(@Body({ schema: registerSchema }) dto: RegisterBody): Promise<AuthUser> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
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
  logout(@Res({ passthrough: true }) res: Response): void {
    clearAuthCookie(res, this.config);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}