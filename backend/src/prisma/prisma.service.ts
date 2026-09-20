import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaNeon({
        connectionString: config.getOrThrow('DATABASE_URL'),
      }),
      // Interactive transactions are the seat-consumption serialization point:
      // `bookings.service.ts` re-reads the departure row with `SELECT ... FOR
      // UPDATE`, so concurrent bookings of a hot departure legitimately QUEUE on
      // the row lock inside their transaction. Prisma's 5s default aborting
      // those waiters (P2028) would turn legitimate contention into failed
      // bookings, so the window is raised deliberately: `maxWait` covers queuing
      // for a pool connection to even START the transaction, `timeout` covers
      // the transaction itself waiting on the row lock. Verified by the live
      // concurrency e2e (`test/bookings-concurrency.e2e-spec.ts`).
      transactionOptions: { maxWait: 30_000, timeout: 30_000 },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}