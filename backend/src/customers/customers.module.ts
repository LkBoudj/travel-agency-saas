import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';

/**
 * Agency business customers.
 *
 * The module is agency-scoped the same way as the other agency-backed
 * features: the controller lives under `agencies/:agencyCode`, every route is
 * guarded by an AGENCY permission, and the service re-scopes every query to the
 * agency resolved from the route. A customer is NOT an identity — no link to
 * `app_user`, no credentials — so nothing here reaches into the auth domain.
 */
@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}