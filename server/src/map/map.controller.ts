// The map's web addresses (routes). Each one checks its input, calls
// MapService, and returns the result as JSON. No logic here; that belongs
// in map.service.ts.
//
// All three routes are public: the map works without an account (FR-1).

import { Controller, Get, Param, Query } from '@nestjs/common';
import type { FilterOptions, MapSearchResult, ShulTodayResult } from '@shiurfinder/shared';
import { ZodValidationPipe } from '../validation/zod-validation.pipe';
import { MapService } from './map.service';
import {
  mapSearchSchema,
  shulTodaySchema,
  type MapSearchInput,
  type ShulTodayInput,
} from './map.validation';

@Controller('map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  /** GET /map/search?lat=40.89&lng=-74.02&radiusMiles=5&q=gemara&dayOfWeek=1 */
  @Get('search')
  search(
    @Query(new ZodValidationPipe(mapSearchSchema)) input: MapSearchInput,
  ): Promise<MapSearchResult> {
    return this.mapService.search(input);
  }

  /** GET /map/filters: the choices the Filters panel can offer. */
  @Get('filters')
  filters(): Promise<FilterOptions> {
    return this.mapService.filterOptions();
  }

  /** GET /map/shul/:id/today?lat=&lng=: the card that opens when a pin is clicked. */
  @Get('shul/:id/today')
  shulToday(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(shulTodaySchema)) input: ShulTodayInput,
  ): Promise<ShulTodayResult> {
    return this.mapService.shulToday(id, input.lat, input.lng);
  }
}
