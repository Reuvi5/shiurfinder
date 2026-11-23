// Ties the shiur page feature's pieces together for NestJS (FR-9).
//
// Same layout as map/:
//   shiur-page.controller.ts  receives the request and checks it (shiur-page.validation.ts)
//   shiur-page.service.ts     works out length and Hebrew date
//   shiur-page.queries.ts     fetches the row from the database

import { Module } from '@nestjs/common';
import { ShiurPageController } from './shiur-page.controller';
import { ShiurPageQueries } from './shiur-page.queries';
import { ShiurPageService } from './shiur-page.service';

@Module({
  controllers: [ShiurPageController],
  providers: [ShiurPageService, ShiurPageQueries],
})
export class ShiurPageModule {}
