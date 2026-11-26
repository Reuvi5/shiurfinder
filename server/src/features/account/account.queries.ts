// The SQL for account settings (FR-4): reads and writes one user's own row
// and their picked topics, and deletes the account.
//
// This file only reads and writes. What's allowed (topics that exist) is
// decided in account.service.ts.

import { Injectable } from '@nestjs/common';
import type { TopicChoice } from '@shiurfinder/shared';
import { PrismaService } from '../../core/database/prisma.service';

/** The settings columns of a user's row. */
export interface SettingsRow {
  name: string | null;
  email: string;
  darkMode: boolean;
  alertNewShiur: boolean;
  alertChanged: boolean;
  alertCancelled: boolean;
  alertReminders: boolean;
}

/** The columns PATCH /account may change. */
export type SettingsUpdate = Partial<Omit<SettingsRow, 'email'>>;

@Injectable()
export class AccountQueries {
  constructor(private readonly prisma: PrismaService) {}

  /** The user's settings, or null if there's no such user. */
  findSettings(userId: string): Promise<SettingsRow | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        darkMode: true,
        alertNewShiur: true,
        alertChanged: true,
        alertCancelled: true,
        alertReminders: true,
      },
    });
  }

  /** Ids of the topics the user picked. May include topics since removed (no foreign key). */
  async findPickedTopicIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.userTopic.findMany({
      where: { userId },
      select: { topicId: true },
    });
    return rows.map((row) => row.topicId);
  }

  /** Every topic, in the same order as the map's and portal's lists. */
  findTopics(): Promise<TopicChoice[]> {
    return this.prisma.topic.findMany({
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
    });
  }

  /** How many of these topic ids exist. */
  countTopics(ids: string[]): Promise<number> {
    return this.prisma.topic.count({ where: { id: { in: ids } } });
  }

  /**
   * Saves the changed columns and, if given, replaces the picked topics with
   * `topicIds`. One transaction, so a failure changes nothing.
   */
  async update(userId: string, columns: SettingsUpdate, topicIds?: string[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(columns).length > 0) {
        await tx.user.update({ where: { id: userId }, data: columns });
      }
      if (topicIds) {
        await tx.userTopic.deleteMany({ where: { userId } });
        await tx.userTopic.createMany({
          data: topicIds.map((topicId) => ({ userId, topicId })),
        });
      }
    });
  }

  /**
   * Deletes the user. The database removes everything else of theirs with it
   * (schema.prisma, onDelete: Cascade): sessions, logins, saves, follows,
   * topics, reports, alerts, team places. Change history keeps the change but
   * forgets who made it. Unused password reset links go too: they hold the
   * user's id but aren't linked to the row. False if there was no such user.
   */
  async deleteUser(userId: string): Promise<boolean> {
    const [, { count }] = await this.prisma.$transaction([
      this.prisma.verification.deleteMany({
        where: { value: userId, identifier: { startsWith: 'reset-password:' } },
      }),
      this.prisma.user.deleteMany({ where: { id: userId } }),
    ]);
    return count > 0;
  }
}
