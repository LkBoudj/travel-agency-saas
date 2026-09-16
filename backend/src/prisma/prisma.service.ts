import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaNeon({
        connectionString: config.getOrThrow('DATABASE_URL'),
      }),
    });
  }
}