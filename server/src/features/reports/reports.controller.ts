// Reports' web addresses (FR-16). Checks the input, calls ReportsService,
// and returns the result as JSON. No logic here.
//
// Seeing a date's reports is public (FR-1); sending one needs an account.

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { ShiurReports } from '@shiurfinder/shared';
import type { SignedInUser } from '../../core/auth/auth.service';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { SignedInGuard } from '../../core/auth/signed-in.guard';
import { ZodValidationPipe } from '../../core/validation/zod-validation.pipe';
import { ReportsService } from './reports.service';
import { newReportSchema, type NewReportInput } from './reports.validation';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /** GET /reports/:occurrenceId: the date's open (unverified) reports. */
  @Get(':id')
  list(@Param('id') id: string): Promise<ShiurReports> {
    return this.reportsService.list(id);
  }

  /** POST /reports/:occurrenceId: report that this date isn't happening. */
  @Post(':id')
  @UseGuards(SignedInGuard)
  report(
    @Param('id') id: string,
    @CurrentUser() user: SignedInUser,
    @Body(new ZodValidationPipe(newReportSchema)) input: NewReportInput,
  ): Promise<ShiurReports> {
    return this.reportsService.report(id, user.id, input);
  }
}
