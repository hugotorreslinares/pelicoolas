import type { PersonSearchResult } from "@/types/person";

const STORAGE_KEY = "filmo:recentSearches";
const MAX_ENTRIES = 8;

export function getRecentSearches(): readonly PersonSearchResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as readonly PersonSearchResult[]) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(person: PersonSearchResult): void {
  try {
    const existing = getRecentSearches().filter((p) => p.id !== person.id);
    const next = [person, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode, etc.) — recent searches just won't persist
  }
}

export function removeRecentSearch(personId: number): void {
  try {
    const next = getRecentSearches().filter((p) => p.id !== personId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable — nothing to remove from
  }
}
