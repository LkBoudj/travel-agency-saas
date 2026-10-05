import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

/**
 * Module K — the manual payment ledger of a booking.
 *
 * It owns no tenancy of its own: payments resolve through their booking under
 * the shared agency authorization guard, exactly like the travelers module.
 */
@Module({
  imports: [PrismaModule, AuthModule, AuthorizationModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}