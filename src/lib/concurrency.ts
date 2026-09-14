/**
 * Runs `fn` over `items` with at most `limit` in flight at once, instead of
 * either firing all of them simultaneously (a burst that can trip the
 * server's per-IP rate limit when there are 50+ items — see design.md,
 * Performance) or awaiting them one at a time (correct but needlessly slow:
 * wall-clock time becomes the sum of every request instead of the max of
 * a handful). Each result lands via `onResult` as soon as it's ready, so
 * callers can render progressively instead of waiting for the whole batch.
 */
export async function mapWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const item = items[index++];
      await fn(item);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
}
