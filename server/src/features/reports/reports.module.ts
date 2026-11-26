// Ties the reports feature's pieces together for NestJS (FR-16).
//
// Same layout as map/:
//   reports.controller.ts  receives the request and checks it (reports.validation.ts)
//   reports.service.ts     decides whether a date can be reported
//   reports.queries.ts     reads and writes the database

import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsQueries } from './reports.queries';
import { ReportsService } from './reports.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportsQueries],
})
export class ReportsModule {}
