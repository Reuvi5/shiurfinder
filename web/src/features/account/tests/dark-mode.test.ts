// Which mode a page shows (FR-4): the saved choice, or the device's setting.

import { describe, expect, it } from 'vitest';
import { parseStored, pickDarkMode } from '../dark-mode';

describe('FR-4 dark mode', () => {
  it('reads the saved choice', () => {
    expect(parseStored('true')).toBe(true);
    expect(parseStored('false')).toBe(false);
  });

  it('has no choice when nothing was saved, or the value is junk', () => {
    expect(parseStored(null)).toBeNull();
    expect(parseStored('')).toBeNull();
    expect(parseStored('yes')).toBeNull();
    expect(parseStored('TRUE')).toBeNull();
  });

  it('uses the saved choice over the device', () => {
    expect(pickDarkMode(false, true)).toBe(false);
    expect(pickDarkMode(true, false)).toBe(true);
  });

  it("follows the device when there's no choice", () => {
    expect(pickDarkMode(null, true)).toBe(true);
    expect(pickDarkMode(null, false)).toBe(false);
  });
});
