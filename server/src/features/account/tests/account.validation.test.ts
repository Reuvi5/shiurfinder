// What PATCH /account accepts (FR-4), and what it refuses.

import { describe, expect, it } from 'vitest';
import { MAX_NAME_LENGTH, MAX_TOPICS } from '../account.constants';
import { accountChangesSchema } from '../account.validation';

const accepts = (body: unknown) => accountChangesSchema.safeParse(body).success;

describe('FR-4 account changes', () => {
  it('accepts any mix of fields, or none', () => {
    expect(accepts({})).toBe(true);
    expect(accepts({ darkMode: true })).toBe(true);
    expect(accepts({ alerts: { reminders: false } })).toBe(true);
    expect(accepts({ name: 'Dovid', topicIds: ['t1'], alerts: {}, darkMode: false })).toBe(true);
  });

  it('trims the name', () => {
    expect(accountChangesSchema.parse({ name: '  Dovid  ' }).name).toBe('Dovid');
  });

  it('refuses an empty name', () => {
    expect(accepts({ name: '' })).toBe(false);
    expect(accepts({ name: '   ' })).toBe(false);
  });

  it(`takes a ${MAX_NAME_LENGTH}-letter name, not ${MAX_NAME_LENGTH + 1}`, () => {
    expect(accepts({ name: 'a'.repeat(MAX_NAME_LENGTH) })).toBe(true);
    expect(accepts({ name: 'a'.repeat(MAX_NAME_LENGTH + 1) })).toBe(false);
  });

  it('accepts an empty topic list (unpick them all)', () => {
    expect(accountChangesSchema.parse({ topicIds: [] }).topicIds).toEqual([]);
  });

  it('counts the same topic twice once', () => {
    expect(accountChangesSchema.parse({ topicIds: ['t1', 't1', 't2'] }).topicIds).toEqual([
      't1',
      't2',
    ]);
  });

  it(`takes ${MAX_TOPICS} topics, not ${MAX_TOPICS + 1}`, () => {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${i}`);
    expect(accepts({ topicIds: ids(MAX_TOPICS) })).toBe(true);
    expect(accepts({ topicIds: ids(MAX_TOPICS + 1) })).toBe(false);
  });

  it('refuses wrong types', () => {
    expect(accepts({ darkMode: 'yes' })).toBe(false);
    expect(accepts({ alerts: { reminders: 1 } })).toBe(false);
    expect(accepts({ topicIds: 't1' })).toBe(false);
    expect(accepts({ topicIds: [''] })).toBe(false);
  });

  it("refuses fields it doesn't let users change, instead of ignoring them", () => {
    expect(accepts({ email: 'new@example.com' })).toBe(false);
    expect(accepts({ isModerator: true })).toBe(false);
    expect(accepts({ darkmode: true })).toBe(false);
    expect(accepts({ alerts: { everything: true } })).toBe(false);
  });
});
