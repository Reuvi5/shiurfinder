// The logic behind posting a shiur (FR-20).
//
// Checks that everything the form picked really exists and fits together,
// works out the dates, then saves. No SQL in this file.
//
// A shul, maggid shiur, room, topic or language can be picked from the form's
// lists or typed in as new; new ones are added in the same save.
//
// No sign-in yet, so anyone can post at any approved shul, and new shuls and
// maggidei shiur are approved straight away. Once accounts are built, only the
// shul's team may post for it (TeamMember), and new ones wait for a moderator (NFR-4).

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { NewShiurResult, PortalOptions } from '@shiurfinder/shared';
import { DEFAULT_DURATION_MINUTES, WEEKLY_WEEKS_AHEAD } from './portal.constants';
import { PortalQueries } from './portal.queries';
import type { NewShiurInput } from './portal.validation';

@Injectable()
export class PortalService {
  constructor(private readonly queries: PortalQueries) {}

  /** The choices for the form's dropdowns. Each shul comes with its own rooms. */
  async options(): Promise<PortalOptions> {
    const [shuls, { rooms, ...lists }] = await Promise.all([
      this.queries.findShuls(),
      this.queries.findOptions(),
    ]);

    return {
      shuls: shuls.map((shul) => ({
        ...shul,
        rooms: rooms
          .filter((room) => room.publisherId === shul.id)
          .map(({ id, name }) => ({ id, name })),
      })),
      ...lists,
    };
  }

  /**
   * Saves a new shiur and its dates. It is on the map as soon as this
   * returns: the map reads the same tables, and the shul is already approved.
   */
  async create(input: NewShiurInput): Promise<NewShiurResult> {
    await this.check(input);

    const durationMinutes = input.durationMinutes ?? DEFAULT_DURATION_MINUTES;
    const starts =
      input.kind === 'WEEKLY'
        ? await this.queries.weeklyStarts(input.daysOfWeek, input.startTime, WEEKLY_WEEKS_AHEAD * 7)
        : [await this.queries.featuredStart(input.date, input.startTime)];

    // A featured date already gone, or (rarely) a weekly one with no time left.
    if (starts.length === 0 || starts[0].getTime() <= Date.now()) {
      throw invalid('DATE_PASSED', 'That date and time have already passed.');
    }

    const { shiurId, occurrenceIds } = await this.queries.create(
      {
        shul: input.shul,
        maggidShiur: input.maggidShiur,
        room: input.room,
        topic: input.topic,
        language: input.language,
        fields: {
          kind: input.kind,
          title: input.title,
          description: input.description ?? null,
          audienceId: input.audienceId ?? null,
          // Featured: no days or usual time, its one date is on its Occurrence (schema.prisma).
          daysOfWeek: input.kind === 'WEEKLY' ? input.daysOfWeek : [],
          startTime: input.kind === 'WEEKLY' ? input.startTime : null,
          durationMinutes,
        },
      },
      starts,
      durationMinutes,
    );

    return { shiurId, firstOccurrenceId: occurrenceIds[0], occurrenceCount: occurrenceIds.length };
  }

  /**
   * Everything picked from a list exists, is approved, and fits together.
   * Typed-in names need no check; queries.create adds them.
   */
  private async check(input: NewShiurInput): Promise<void> {
    const shulId = 'id' in input.shul ? input.shul.id : null;
    const picked = (pick?: { id: string } | { name: string }) =>
      pick && 'id' in pick ? pick.id : null;
    const ravId = picked(input.maggidShiur);
    const roomId = picked(input.room);
    const topicId = picked(input.topic);
    const languageId = picked(input.language);

    // A picked room has to be in a picked shul: a new shul has no rooms yet.
    if (roomId && !shulId) {
      throw invalid('INVALID_REQUEST', 'room: a new shul has no rooms yet. Type the room’s name.');
    }

    const [shulOk, ravOk, roomOk, topicOk, languageOk, audienceOk] = await Promise.all([
      shulId ? this.queries.findShuls(shulId).then((rows) => rows.length > 0) : true,
      ravId ? this.queries.maggidShiurExists(ravId) : true,
      roomId && shulId ? this.queries.roomBelongsTo(roomId, shulId) : true,
      topicId ? this.queries.topicExists(topicId) : true,
      languageId ? this.queries.languageExists(languageId) : true,
      input.audienceId ? this.queries.audienceExists(input.audienceId) : true,
    ]);

    // Same "not found" for missing and unapproved (NFR-4).
    if (!shulOk) {
      throw new NotFoundException({ code: 'SHUL_NOT_FOUND', message: 'That shul was not found.' });
    }
    if (!ravOk) throw invalid('INVALID_REQUEST', 'maggidShiur: that maggid shiur was not found.');
    if (!roomOk) throw invalid('INVALID_REQUEST', 'room: that room is not in this shul.');
    if (!topicOk || !languageOk || !audienceOk) {
      throw invalid('INVALID_REQUEST', 'A topic, language or audience was not found.');
    }
  }
}

function invalid(code: string, message: string) {
  return new BadRequestException({ code, message });
}
