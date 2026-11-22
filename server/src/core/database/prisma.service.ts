// The server's one connection to the database.
//
// It *is* a Prisma client (it extends PrismaClient), so anything that receives
// it can run queries: this.prisma.publisher.findFirst(...) for simple lookups,
// or this.prisma.$queryRaw`...` for raw SQL.
//
// Only the *.queries.ts files should use it. Controllers and services don't
// touch the database directly.

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ log: ['warn', 'error'] });
  }

  // Runs once when the server starts.
  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to the database');
  }

  // Runs once when the server shuts down.
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
