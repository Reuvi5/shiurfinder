// The logic behind account settings (FR-4): what GET /account shows, what a
// change may contain, and deleting the account. No SQL in this file.
//
// Every route works on the signed-in user's own account only: the user id
// comes from the login (@CurrentUser()), never from the request, so nobody
// can read or change someone else's.

import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AccountSettings } from '@shiurfinder/shared';
import { AccountQueries, type SettingsRow, type SettingsUpdate } from './account.queries';
import type { AccountChangesInput } from './account.validation';

@Injectable()
export class AccountService {
  constructor(private readonly queries: AccountQueries) {}

  /** The user's settings and the topics they can pick from. */
  async settings(userId: string): Promise<AccountSettings> {
    const [row, pickedIds, topicChoices] = await Promise.all([
      this.queries.findSettings(userId),
      this.queries.findPickedTopicIds(userId),
      this.queries.findTopics(),
    ]);
    // Only if the account was deleted while this request was on its way.
    if (!row) throw notSignedIn();

    // A topic removed since they picked it would show as a tick on nothing.
    const exists = new Set(topicChoices.map((topic) => topic.id));
    return {
      name: row.name,
      email: row.email,
      darkMode: row.darkMode,
      alerts: alertsFrom(row),
      topicIds: pickedIds.filter((id) => exists.has(id)),
      topicChoices,
    };
  }

  /** Saves the changes and returns the settings as they are now. */
  async change(userId: string, changes: AccountChangesInput): Promise<AccountSettings> {
    const { topicIds } = changes;
    if (topicIds && (await this.queries.countTopics(topicIds)) !== topicIds.length) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: 'topicIds: one of the topics does not exist',
      });
    }

    await this.queries.update(userId, columnsFrom(changes), topicIds);
    return this.settings(userId);
  }

  /** Deletes the account and all its personal data (FR-4). */
  async delete(userId: string): Promise<void> {
    if (!(await this.queries.deleteUser(userId))) throw notSignedIn();
  }
}

// ------------- helpers

/** The alert columns, as the website sees them. */
function alertsFrom(row: SettingsRow): AccountSettings['alerts'] {
  return {
    newShiur: row.alertNewShiur,
    changed: row.alertChanged,
    cancelled: row.alertCancelled,
    reminders: row.alertReminders,
  };
}

/** The columns to change. Left-out fields aren't in it, so they stay as they are. */
function columnsFrom({ name, darkMode, alerts }: AccountChangesInput): SettingsUpdate {
  const columns: SettingsUpdate = {};
  if (name !== undefined) columns.name = name;
  if (darkMode !== undefined) columns.darkMode = darkMode;
  if (alerts?.newShiur !== undefined) columns.alertNewShiur = alerts.newShiur;
  if (alerts?.changed !== undefined) columns.alertChanged = alerts.changed;
  if (alerts?.cancelled !== undefined) columns.alertCancelled = alerts.cancelled;
  if (alerts?.reminders !== undefined) columns.alertReminders = alerts.reminders;
  return columns;
}

/** The account is gone, so the login is too. */
function notSignedIn() {
  return new UnauthorizedException({ code: 'NOT_SIGNED_IN', message: 'No such account' });
}
