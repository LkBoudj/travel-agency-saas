import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ToursController } from './tours.controller.js';
import { ToursService } from './tours.service.js';

/**
 * Agency tours (the reusable travel product).
 *
 * The module is agency-scoped the same way as the other agency-backed features:
 * the controller lives under `agencies/:agencyCode`, every route is guarded by
 * an AGENCY `Permission.key`, and the service re-scopes every query to the
 * agency resolved from the route. Publishing is an explicit, guarded action —
 * the backend never auto-publishes.
 */
@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule],
  controllers: [ToursController],
  providers: [ToursService],
})
export class ToursModule {}