// Checks the settings in ../vitest.config.ts really reach the tests.

import { describe, expect, it } from 'vitest';

describe('test settings', () => {
  it('run in UTC, not the computer’s own time zone', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC');
    // July: New York would be 240 minutes behind here.
    expect(new Date('2026-07-01T12:00:00Z').getTimezoneOffset()).toBe(0);
  });

  it('give unit tests no real database', () => {
    expect(process.env.DATABASE_URL).toContain('no-database-in-unit-tests');
  });
});
