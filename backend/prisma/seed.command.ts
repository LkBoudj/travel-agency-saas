import { describe, it } from 'vitest';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedRbacBootstrap } from './seed.js';

/**
 * Runner used by `prisma db seed` (see prisma.config.ts -> migrations.seed ->
 * "vitest run --config vitest.seed.config.ts").
 *
 * The seed logic lives in prisma/seed.ts and is executed through vitest because
 * plain `node` type-stripping cannot resolve the generated Prisma client's
 * internal `.js` specifiers on this project setup.
 */
describe('prisma db seed runner', () => {
  it('applies the RBAC bootstrap seed idempotently', async () => {
    const prisma = new PrismaClient({
      adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL as string }),
    });
    try {
      await seedRbacBootstrap(prisma);
    } finally {
      await prisma.$disconnect();
    }
  });
});