// The rules for what a map request is allowed to contain.
//
// Every value in a URL arrives as text, so `z.coerce.number()` turns "40.9"
// into 40.9. Anything outside these rules is rejected with a 400 before the
// controller runs (see core/validation/zod-validation.pipe.ts).

import { z } from 'zod';

const latitude = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);

/** 24-hour "HH:mm", e.g. "07:30" or "19:30". */
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must look like 19:30');

/** GET /map/search */
export const mapSearchSchema = z
  .object({
    lat: latitude,
    lng: longitude,
    // Capped so one request can't ask for the whole country.
    radiusMiles: z.coerce.number().positive().max(100).optional(),
    q: z.string().trim().min(1).max(100).optional(),
    topic: z.string().trim().max(50).optional(),
    language: z.string().trim().max(50).optional(),
    audience: z.string().trim().max(50).optional(),
    dayOfWeek: z.coerce.number().int().min(0).max(6).optional(), // 0 = Sunday
    afterTime: timeOfDay.optional(),
    beforeTime: timeOfDay.optional(),
  })
  .refine(
    // "HH:mm" strings sort correctly as plain text, so < works.
    (input) => !input.afterTime || !input.beforeTime || input.afterTime < input.beforeTime,
    { message: 'afterTime must be earlier than beforeTime', path: ['beforeTime'] },
  );

export type MapSearchInput = z.infer<typeof mapSearchSchema>;

/** GET /map/shul/:id/today. lat/lng are optional; they're only used to show distance. */
export const shulTodaySchema = z.object({
  lat: latitude.optional(),
  lng: longitude.optional(),
});

export type ShulTodayInput = z.infer<typeof shulTodaySchema>;
