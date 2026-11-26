// Ties account settings' pieces together for NestJS (FR-4).
//
// Same layout as map/:
//   account.controller.ts  receives the request and checks it (account.validation.ts)
//   account.service.ts     what's allowed, and what the website gets back
//   account.queries.ts     reads and writes the database
//
// Signing up, in and out is login's job (core/auth/), not this feature's.

import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountQueries } from './account.queries';
import { AccountService } from './account.service';

@Module({
  controllers: [AccountController],
  providers: [AccountService, AccountQueries],
})
export class AccountModule {}
