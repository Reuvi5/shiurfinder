// The shul and maggid shiur pages' web address (FR-10). Calls
// PublishersService and returns the result as JSON. No logic here.
//
// Public: the pages work without an account (FR-1).

import { Controller, Get, Param } from '@nestjs/common';
import type { PublisherPageResult } from '@shiurfinder/shared';
import { PublishersService } from './publishers.service';

@Controller('publishers')
export class PublishersController {
  constructor(private readonly publishersService: PublishersService) {}

  /** GET /publishers/:id : a shul's or maggid shiur's page. Check `type` in the reply. */
  @Get(':id')
  page(@Param('id') id: string): Promise<PublisherPageResult> {
    return this.publishersService.page(id);
  }
}
