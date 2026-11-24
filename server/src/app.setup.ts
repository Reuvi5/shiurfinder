// Settings every copy of the server gets: the real one (main.ts) and the one
// the API tests start (core/testing/test-app.ts). Add a setting here, not in
// main.ts, or the tests run a server that differs from the real one.

import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AUTH_PATH } from './core/auth/auth.config';
import { AuthService } from './core/auth/auth.service';
import { webOrigins } from './core/config/web-origins';
import { ErrorFilter } from './core/errors/error.filter';

export function setUpApp(app: INestApplication): void {
  // The website runs on a different port (5173) than the server, so the
  // browser needs permission to call us, with its login cookie. First, so
  // the login requests below get it too.
  app.enableCors({ origin: webOrigins(), credentials: true });

  // Login requests (/auth/...) go straight to Better Auth. It reads the request
  // body itself, so this must run before NestJS reads it, which only starts
  // at app.init(). Otherwise sign-up waits forever for a body already read.
  const { handler } = app.get(AuthService);
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.url.startsWith(`${AUTH_PATH}/`)) handler(request, response).catch(next);
    else next();
  });

  // Every error the server sends back goes through ErrorFilter, so they all
  // have the same { code, message } shape.
  app.useGlobalFilters(new ErrorFilter());
}
