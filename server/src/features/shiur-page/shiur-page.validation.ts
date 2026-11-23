// The rules for what a shiur page request is allowed to contain.
//
// Same idea as map.validation.ts: URL values arrive as text, so
// `z.coerce.number()` turns "40.9" into 40.9.

import { z } from 'zod';

/** GET /shiur-page/:occurrenceId. lat/lng are optional; they're only used to show distance. */
export const shiurDetailsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

export type ShiurDetailsInput = z.infer<typeof shiurDetailsSchema>;
