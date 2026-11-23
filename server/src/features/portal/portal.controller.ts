// The publisher portal's web addresses (FR-20). Checks the input, calls
// PortalService, and returns the result as JSON. No logic here.
//
// Open to everyone for now: accounts and access control aren't built yet.

import { Body, Controller, Get, Post } from '@nestjs/common';
import type { NewShiurResult, PortalOptions } from '@shiurfinder/shared';
import { ZodValidationPipe } from '../../core/validation/zod-validation.pipe';
import { PortalService } from './portal.service';
import { newShiurSchema, type NewShiurInput } from './portal.validation';

@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  /** GET /portal/options: the shuls, rooms, maggidei shiur and lists the form offers. */
  @Get('options')
  options(): Promise<PortalOptions> {
    return this.portalService.options();
  }

  /** POST /portal/shiurim: post a new weekly or featured shiur. */
  @Post('shiurim')
  create(
    @Body(new ZodValidationPipe(newShiurSchema)) input: NewShiurInput,
  ): Promise<NewShiurResult> {
    return this.portalService.create(input);
  }
}
