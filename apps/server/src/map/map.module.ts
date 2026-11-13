import { Module } from '@nestjs/common';
import { MapController } from './map.controller';
import { MapService } from './map.service';
import { MapRepository } from './map.repository';
import { MAP_REPOSITORY } from './map.types';

/**
 * Search and Map (Tracer Bullet) from the SDD's Components section.
 *
 * MAP_REPOSITORY is bound to MapRepository here. This is the one place that
 * knows which implementation the service gets — swapping it for a cached or
 * faked repository is a one-line change and MapService never notices.
 */
@Module({
  controllers: [MapController],
  providers: [MapService, { provide: MAP_REPOSITORY, useClass: MapRepository }],
  exports: [MapService],
})
export class MapModule {}
