// Makes the database connection (PrismaService) available to the whole server.
//
// @Global means a feature module can ask for PrismaService in its constructor
// without importing this module itself.

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
