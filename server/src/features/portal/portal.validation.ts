// The rules for what a new shiur is allowed to contain (FR-20).
//
// Checks the shape only. Whether a picked shul, room, topic etc. really
// exists is checked in portal.service.ts, since that needs the database.

import { z } from 'zod';

/** 24-hour "HH:mm", e.g. "07:30" or "19:30". */
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must look like 19:30');

const id = z.string().trim().min(1).max(50);
const name = z.string().trim().min(1).max(80);

/** An existing one by id, or a typed name to add. `strict` so { id, name } is rejected. */
const pickOrNew = z.union([z.object({ id }).strict(), z.object({ name }).strict()]);

/** A shul that isn't in the list yet. The point comes from the website's address search. */
const newShul = z
  .object({
    name,
    address: z.string().trim().min(1, 'Pick the new shul’s address').max(200),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .strict();

/** "" from an empty field means "not set". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

const base = {
  title: z.string().trim().min(1, 'Give the shiur a title').max(120),
  description: optionalText(2000),
  shul: z.union([z.object({ id }).strict(), newShul]),
  maggidShiur: pickOrNew.optional(),
  room: pickOrNew.optional(),
  topic: pickOrNew.optional(),
  language: pickOrNew.optional(),
  audienceId: optionalText(50),
  startTime: timeOfDay,
  durationMinutes: z.number().int().min(5).max(600).optional(),
};

/** POST /portal/shiurim */
export const newShiurSchema = z.discriminatedUnion('kind', [
  z.object({
    ...base,
    kind: z.literal('WEEKLY'),
    // 0 = Sunday. Duplicates are dropped, so [1, 1] is just Monday.
    daysOfWeek: z
      .array(z.number().int().min(0).max(6))
      .min(1, 'Pick at least one day')
      .transform((days) => [...new Set(days)].sort()),
  }),
  z.object({
    ...base,
    kind: z.literal('FEATURED'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must look like 2026-12-01'),
  }),
]);

export type NewShiurInput = z.infer<typeof newShiurSchema>;

/** The `pickOrNew` shape, for the service and queries. */
export type PickOrNewInput = z.infer<typeof pickOrNew>;
