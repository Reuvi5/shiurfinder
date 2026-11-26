// AccountService with fake queries (FR-4): what the settings page gets, what
// a change saves, and deleting. The SQL is tested in account.db.test.ts.

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { AccountQueries, SettingsRow, SettingsUpdate } from '../account.queries';
import { AccountService } from '../account.service';

const ROW: SettingsRow = {
  name: 'Dovid',
  email: 'dovid@example.com',
  darkMode: false,
  alertNewShiur: true,
  alertChanged: true,
  alertCancelled: false,
  alertReminders: true,
};

const TOPICS = [
  { id: 'gemara', name: 'Gemara' },
  { id: 'halacha', name: 'Halacha' },
];

/** A fake database with one user. `saved` shows what update() was given. */
function serviceWith(world: { row?: SettingsRow | null; picked?: string[] } = {}) {
  const saved: { columns?: SettingsUpdate; topicIds?: string[] }[] = [];
  let deleted = false;
  const queries = {
    findSettings: async () => (world.row === undefined ? ROW : world.row),
    findPickedTopicIds: async () => world.picked ?? ['gemara'],
    findTopics: async () => TOPICS,
    countTopics: async (ids: string[]) =>
      ids.filter((id) => TOPICS.some((topic) => topic.id === id)).length,
    update: async (_userId: string, columns: SettingsUpdate, topicIds?: string[]) => {
      saved.push({ columns, topicIds });
    },
    deleteUser: async () => {
      if (world.row === null || deleted) return false;
      deleted = true;
      return true;
    },
  } as unknown as AccountQueries;
  return { service: new AccountService(queries), saved };
}

describe('FR-4 showing the settings', () => {
  it('gives the settings, the picked topics and every topic to pick from', async () => {
    const { service } = serviceWith();

    expect(await service.settings('user-1')).toEqual({
      name: 'Dovid',
      email: 'dovid@example.com',
      darkMode: false,
      alerts: { newShiur: true, changed: true, cancelled: false, reminders: true },
      topicIds: ['gemara'],
      topicChoices: TOPICS,
    });
  });

  it('leaves out picked topics that no longer exist', async () => {
    const { service } = serviceWith({ picked: ['gemara', 'removed-topic'] });

    expect((await service.settings('user-1')).topicIds).toEqual(['gemara']);
  });

  it('works with nothing picked', async () => {
    const { service } = serviceWith({ picked: [] });

    expect((await service.settings('user-1')).topicIds).toEqual([]);
  });

  it('refuses when the account no longer exists', async () => {
    const { service } = serviceWith({ row: null });

    await expect(service.settings('gone')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('FR-4 changing the settings', () => {
  it('saves only the fields that were sent', async () => {
    const { service, saved } = serviceWith();

    await service.change('user-1', { darkMode: true, alerts: { reminders: false } });

    expect(saved).toEqual([
      { columns: { darkMode: true, alertReminders: false }, topicIds: undefined },
    ]);
  });

  it('saves the name and every alert choice', async () => {
    const { service, saved } = serviceWith();

    await service.change('user-1', {
      name: 'Dovid Cohen',
      alerts: { newShiur: false, changed: false, cancelled: true, reminders: true },
    });

    expect(saved[0].columns).toEqual({
      name: 'Dovid Cohen',
      alertNewShiur: false,
      alertChanged: false,
      alertCancelled: true,
      alertReminders: true,
    });
  });

  it('replaces the topics with the new list, even an empty one', async () => {
    const { service, saved } = serviceWith();

    await service.change('user-1', { topicIds: ['halacha'] });
    await service.change('user-1', { topicIds: [] });

    expect(saved.map((save) => save.topicIds)).toEqual([['halacha'], []]);
  });

  it("refuses a topic that doesn't exist, and saves nothing", async () => {
    const { service, saved } = serviceWith();

    const error = await service
      .change('user-1', { darkMode: true, topicIds: ['gemara', 'made-up'] })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'INVALID_REQUEST',
    });
    expect(saved).toEqual([]);
  });

  it('returns the settings after the change', async () => {
    const { service } = serviceWith();

    expect(await service.change('user-1', {})).toMatchObject({ email: 'dovid@example.com' });
  });
});

describe('FR-4 deleting the account', () => {
  it('deletes it', async () => {
    const { service } = serviceWith();

    await expect(service.delete('user-1')).resolves.toBeUndefined();
  });

  it('refuses when there is no such account (already deleted)', async () => {
    const { service } = serviceWith();
    await service.delete('user-1');

    await expect(service.delete('user-1')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
