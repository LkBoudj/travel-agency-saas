import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('prisma-check')
  async checkPrisma() {
    const appUserCount = await this.prisma.appUser.count();
    return { prisma: 'ok', appUserCount };
  }
}
