// Ties the publisher portal's pieces together for NestJS (FR-20).
//
// Same layout as map/:
//   portal.controller.ts  receives the request and checks it (portal.validation.ts)
//   portal.service.ts     checks the choices fit together, works out the dates
//   portal.queries.ts     reads and writes the database

import { Module } from '@nestjs/common';
import { PortalController } from './portal.controller';
import { PortalQueries } from './portal.queries';
import { PortalService } from './portal.service';

@Module({
  controllers: [PortalController],
  providers: [PortalService, PortalQueries],
})
export class PortalModule {}
