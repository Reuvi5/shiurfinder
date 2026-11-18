import { Controller, Get, Param, Query, UsePipes } from '@nestjs/common';
import type { MapSearchResult, ShulTodayResult } from '@shiurfinder/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  mapSearchSchema,
  shulTodaySchema,
  type MapSearchDto,
  type ShulTodayDto,
} from './dto/map-search.dto';
import { MapService } from './map.service';

/**
 * Receives the request, hands it to the service, returns what comes back.
 * No rules here on purpose (SDD, Layers) — if logic starts appearing in a
 * controller it belongs in the service instead.
 *
 * Everything on this controller is public: FR-1 says the map, lists and search
 * work without an account.
 */
@Controller('map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  /** UC-1 steps 5-7. GET /map/search?lat=&lng=&radiusMiles=&q=&topic=&dayOfWeek= */
  @Get('search')
  @UsePipes(new ZodValidationPipe(mapSearchSchema))
  search(@Query() query: MapSearchDto): Promise<MapSearchResult> {
    return this.mapService.search(query);
  }

  /** UC-1 steps 10-11. GET /map/shul/:id/today?lat=&lng= */
  @Get('shul/:id/today')
  shulToday(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(shulTodaySchema)) query: ShulTodayDto,
  ): Promise<ShulTodayResult> {
    return this.mapService.shulToday(id, query.lat, query.lng);
  }
}
