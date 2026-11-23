// What the map's web address remembers: which shul pin and which shiur are
// open, e.g. /?shul=abc&shiur=xyz (FR-9).
//
// Each click adds a step to the browser's history, so Back goes back through
// the pins and shiurim the user opened. MapScreen reads and writes these;
// routes.tsx uses parseMapSearch to check them.

/** The map's search params. Both missing means nothing is open. */
export interface MapSearch {
  /** publisherId of the selected shul pin */
  shul?: string;
  /** occurrenceId of the open shiur popup */
  shiur?: string;
}

/** Keeps only the params we know, so a bad link (?shul[]=x) opens nothing instead of crashing. */
export function parseMapSearch(search: Record<string, unknown>): MapSearch {
  return {
    shul: typeof search.shul === 'string' ? search.shul : undefined,
    shiur: typeof search.shiur === 'string' ? search.shiur : undefined,
  };
}
