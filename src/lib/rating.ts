export const MIN_RATING = 1;
export const MAX_RATING = 5;

/** Clamps and rounds to a valid 1-5 "crispetas" rating. */
export function clampRating(value: number): number {
  return Math.min(MAX_RATING, Math.max(MIN_RATING, Math.round(value)));
}
