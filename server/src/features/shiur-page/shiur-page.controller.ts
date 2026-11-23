// The shiur page's web address (route). Checks the input, calls
// ShiurPageService, and returns the result as JSON. No logic here.
//
// Public: anyone can see a shiur without an account (FR-1).

import { Controller, Get, Param, Query } from '@nestjs/common';
import type { ShiurDetails } from '@shiurfinder/shared';
import { ZodValidationPipe } from '../../core/validation/zod-validation.pipe';
import { ShiurPageService } from './shiur-page.service';
import { shiurDetailsSchema, type ShiurDetailsInput } from './shiur-page.validation';

@Controller('shiur-page')
export class ShiurPageController {
  constructor(private readonly shiurPageService: ShiurPageService) {}

  /** GET /shiur-page/:occurrenceId?lat=&lng=: one date of a shiur (FR-9). */
  @Get(':id')
  details(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(shiurDetailsSchema)) input: ShiurDetailsInput,
  ): Promise<ShiurDetails> {
    return this.shiurPageService.details(id, input.lat, input.lng);
  }
}
