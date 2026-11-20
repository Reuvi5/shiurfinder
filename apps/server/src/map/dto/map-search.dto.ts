import { z } from 'zod';

/**
 * SDD: Zod checks requests on the server and form input in the website.
 *
 * Validation lives here, not in the controller and not in the service: the
 * controller shouldn't know the rules and the service should be able to trust
 * what it's handed.
 */
const timeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must look like 19:30');

export const mapSearchSchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    // Capped so one request can't ask the database for the whole country.
    radiusMiles: z.coerce.number().positive().max(100).optional(),
    q: z.string().trim().min(1).max(100).optional(),
    topic: z.string().trim().max(50).optional(),
    language: z.string().trim().max(50).optional(),
    audience: z.string().trim().max(50).optional(),
    dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
    afterTime: timeOfDay.optional(),
    beforeTime: timeOfDay.optional(),
  })
  .refine(
    // "HH:mm" strings compare correctly as text.
    (dto) => !dto.afterTime || !dto.beforeTime || dto.afterTime < dto.beforeTime,
    { message: 'afterTime must be earlier than beforeTime', path: ['beforeTime'] },
  );

export type MapSearchDto = z.infer<typeof mapSearchSchema>;

export const shulTodaySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export type ShulTodayDto = z.infer<typeof shulTodaySchema>;
