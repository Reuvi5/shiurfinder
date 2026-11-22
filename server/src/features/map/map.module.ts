// Ties the map feature's pieces together for NestJS.
//
// A request flows through this folder like this:
//   map.controller.ts  receives the request and checks it (map.validation.ts)
//   map.service.ts     decides what the results mean
//   map.queries.ts     fetches the rows from the database

import { Module } from '@nestjs/common';
import { MapController } from './map.controller';
import { MapQueries } from './map.queries';
import { MapService } from './map.service';

@Module({
  controllers: [MapController],
  providers: [MapService, MapQueries],
})
export class MapModule {}
