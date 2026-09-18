import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditService } from './audit.service.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { RateLimitService } from './rate-limit.service.js';

/**
 * Cross-cutting security services: the audit trail and the rate limiter.
 *
 * Global because both are infrastructure every feature module may need, and
 * threading them through each module's imports would add ceremony without
 * adding isolation. The rate limiter is a single instance on purpose — its
 * counters are only meaningful when shared across the routes it protects.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [AuditService, RateLimitService, RateLimitGuard],
  exports: [AuditService, RateLimitService, RateLimitGuard],
})
export class SecurityModule {}
