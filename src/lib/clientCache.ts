// Generic TTL cache over localStorage, for API responses this app's own
// server already caches at the CDN (see each /api/* route's Cache-Control)
// but that still costs a real network round trip on every page load —
// following 30-50 people means 30-50 requests just to render their avatars'
// progress. This skips the network entirely while the cache is fresh.
interface CacheRecord<T> {
  readonly data: T;
  readonly cachedAt: number;
}

const PREFIX = "filmo:cache:";

export function readCache<T>(key: string, maxAgeMs: number): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const record = JSON.parse(raw) as CacheRecord<T>;
    if (Date.now() - record.cachedAt > maxAgeMs) return null;
    return record.data;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  try {
    const record: CacheRecord<T> = { data, cachedAt: Date.now() };
    localStorage.setItem(PREFIX + key, JSON.stringify(record));
  } catch {
    // localStorage unavailable (private mode) or quota exceeded — the
    // network fetch already returned its data, so nothing is lost, this
    // page load just won't be any faster next time.
  }
}
