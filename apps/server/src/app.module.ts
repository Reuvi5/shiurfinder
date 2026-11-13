import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MapModule } from './map/map.module';
import { HealthController } from './health.controller';

/**
 * One server program, split into a module per area of the app
 * (SDD, Single-deployment app).
 *
 * As the other tracer bullet and the rest of the features land, each becomes
 * its own module here: ShiurimModule, PublishersModule, NotificationsModule,
 * SavesModule, ReportsModule, AccountsModule.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    PrismaModule,
    MapModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
