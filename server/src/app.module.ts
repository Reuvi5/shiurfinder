// The list of everything the server is made of.
//
// NestJS builds the app from "modules". Each feature folder (map/, and later
// shiurim/, accounts/, ...) has its own module, and it only runs once it is
// added to `imports` below.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './core/auth/auth.module';
import { DatabaseModule } from './core/database/database.module';
import { HealthController } from './features/health/health.controller';
import { MapModule } from './features/map/map.module';
import { ShiurPageModule } from './features/shiur-page/shiur-page.module';
import { PublishersModule } from './features/publishers/publishers.module';
import { PortalModule } from './features/portal/portal.module';
import { AccountModule } from './features/account/account.module';
import { ReportsModule } from './features/reports/reports.module';

@Module({
  imports: [
    // Loads the .env file at the repo root into process.env.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../.env', '.env'] }),
    DatabaseModule,
    AuthModule,
    MapModule,
    ShiurPageModule,
    PublishersModule,
    PortalModule,
    AccountModule,
    ReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
