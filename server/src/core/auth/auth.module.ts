// Makes login available to the whole server.
//
// @Global, like DatabaseModule: any feature can use SignedInGuard and
// @CurrentUser() without importing this module.

import { Global, Module } from '@nestjs/common';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaService } from '../database/prisma.service';
import { createAuth } from './auth.config';
import { ConsoleEmails } from './auth.email';
import { AUTH, AuthService } from './auth.service';

@Global()
@Module({
  providers: [
    {
      provide: AUTH,
      // Users, sessions and passwords go in the User, Session and Account tables.
      // Emails are printed in the console until SES is set up (auth.email.ts).
      useFactory: (prisma: PrismaService) =>
        createAuth(prismaAdapter(prisma, { provider: 'postgresql' }), new ConsoleEmails()),
      inject: [PrismaService],
    },
    AuthService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
