import { useEffect, useState } from "react";
import {
  subscribeToFollowedPeople,
  subscribeToSeenMoviesFull,
  subscribeToWatchlist,
} from "@/lib/firebase/firestore";
import type { CompatibilityInput } from "@/lib/compatibility";
import type {
  FollowedPerson,
  SeenMovie,
  WatchlistMovie,
} from "@/types/filmography";

// Shared by CompatibilitySection and PeopleLikeYou — a user's watchlist +
// seen + followedPeople, the three lists computeCompatibility needs. Null
// until all three have loaded at least once.
export function useProfileLists(userId: string): CompatibilityInput | null {
  const [watchlist, setWatchlist] = useState<readonly WatchlistMovie[] | null>(
    null,
  );
  const [seen, setSeen] = useState<readonly SeenMovie[] | null>(null);
  const [followedPeople, setFollowedPeople] = useState<
    readonly FollowedPerson[] | null
  >(null);

  useEffect(() => subscribeToWatchlist(userId, setWatchlist), [userId]);
  useEffect(() => subscribeToSeenMoviesFull(userId, setSeen), [userId]);
  useEffect(
    () => subscribeToFollowedPeople(userId, setFollowedPeople),
    [userId],
  );

  if (watchlist === null || seen === null || followedPeople === null) {
    return null;
  }
  return { watchlist, seen, followedPeople };
}
