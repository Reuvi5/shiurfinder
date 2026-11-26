// Account settings' web addresses (FR-4). All need an account, and all work
// on the signed-in user's own account. Checks the input, calls
// AccountService, returns the result. No logic here.

import { Body, Controller, Delete, Get, HttpCode, Patch, UseGuards } from '@nestjs/common';
import type { AccountSettings } from '@shiurfinder/shared';
import type { SignedInUser } from '../../core/auth/auth.service';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { SignedInGuard } from '../../core/auth/signed-in.guard';
import { ZodValidationPipe } from '../../core/validation/zod-validation.pipe';
import { AccountService } from './account.service';
import { accountChangesSchema, type AccountChangesInput } from './account.validation';

@Controller('account')
@UseGuards(SignedInGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /** GET /account: the user's settings. */
  @Get()
  settings(@CurrentUser() user: SignedInUser): Promise<AccountSettings> {
    return this.accountService.settings(user.id);
  }

  /** PATCH /account: change some settings. Returns all of them. */
  @Patch()
  change(
    @CurrentUser() user: SignedInUser,
    @Body(new ZodValidationPipe(accountChangesSchema)) changes: AccountChangesInput,
  ): Promise<AccountSettings> {
    return this.accountService.change(user.id, changes);
  }

  /** DELETE /account: delete the account and its personal data. Signs them out too. */
  @Delete()
  @HttpCode(204)
  delete(@CurrentUser() user: SignedInUser): Promise<void> {
    return this.accountService.delete(user.id);
  }
}
