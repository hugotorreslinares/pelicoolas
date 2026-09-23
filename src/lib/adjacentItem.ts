/**
 * Finds the item before/after `current` in `items`, by reference — for
 * wiring MovieDetailsDialog's swipe navigation to whatever ordered list a
 * page is showing (already-filtered/sorted/grouped, whatever's on screen).
 * `current` must be the exact object instance from `items` (e.g. the one
 * passed to `setOpenMovie`), not a copy — works because every list page
 * already does that (`onClick={() => setOpenMovie(movie)}`).
 */
export function adjacentItem<T>(
  items: readonly T[],
  current: T | null,
): { readonly previous: T | null; readonly next: T | null } {
  if (!current) return { previous: null, next: null };
  const index = items.indexOf(current);
  if (index === -1) return { previous: null, next: null };
  return { previous: items[index - 1] ?? null, next: items[index + 1] ?? null };
}
