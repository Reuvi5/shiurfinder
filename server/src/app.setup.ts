// Settings every copy of the server gets: the real one (main.ts) and the one
// the API tests start (core/testing/test-app.ts). Add a setting here, not in
// main.ts, or the tests run a server that differs from the real one.

import type { INestApplication } from '@nestjs/common';
import { ErrorFilter } from './core/errors/error.filter';

export function setUpApp(app: INestApplication): void {
  // Every error the server sends back goes through ErrorFilter, so they all
  // have the same { code, message } shape.
  app.useGlobalFilters(new ErrorFilter());
}
