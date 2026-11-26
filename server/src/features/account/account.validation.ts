// What PATCH /account may contain (FR-4). Shape only: whether the picked
// topics exist is checked in account.service.ts, since that needs the database.

import { z } from 'zod';
import { MAX_NAME_LENGTH, MAX_TOPICS } from './account.constants';

const alerts = z
  .object({
    newShiur: z.boolean(),
    changed: z.boolean(),
    cancelled: z.boolean(),
    reminders: z.boolean(),
  })
  .partial()
  .strict();

/**
 * Every field is optional: anything left out stays as it is. `strict`, so a
 * typo ("darkmode") is refused instead of silently changing nothing, and
 * nobody can send fields we don't let them change (email, isModerator).
 */
export const accountChangesSchema = z
  .object({
    name: z.string().trim().min(1, 'Name can’t be empty').max(MAX_NAME_LENGTH),
    darkMode: z.boolean(),
    alerts,
    topicIds: z
      .array(z.string().trim().min(1).max(50))
      .max(MAX_TOPICS)
      // The same topic twice counts once.
      .transform((ids) => [...new Set(ids)]),
  })
  .partial()
  .strict();

export type AccountChangesInput = z.infer<typeof accountChangesSchema>;
