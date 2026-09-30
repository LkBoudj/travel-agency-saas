import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PublicWebsiteController } from './public-website.controller.js';
import { WebsiteController } from './website.controller.js';
import { WebsiteService } from './website.service.js';

/**
 * Agency public website (draft → published aggregate).
 *
 * Data layer (ensure-once draft, tenant-scoped reads/writes, guarded publish,
 * preview minting, featured-tour catalog) plus the dashboard-facing API. The
 * public read boundary is an unguarded controller in the same module — auth is
 * per-controller here (no global guard), so a guard-free class stays public by
 * construction; the draft variant is gated by the shared preview token instead.
 */
@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule],
  controllers: [WebsiteController, PublicWebsiteController],
  providers: [WebsiteService],
})
export class WebsiteModule {}