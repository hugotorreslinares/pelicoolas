import { useEffect, useMemo, useState } from "react";
import { fetchPersonData } from "@/lib/movieData";
import { mapWithConcurrency } from "@/lib/concurrency";
import { rankTopPeople, type RankedPerson } from "@/lib/insights";
import type { CompatibilityInput } from "@/lib/compatibility";

// Ranks a user's followed actors/directors by how much of their work the
// user has watched or saved. Needs each person's filmography (TMDB proxy,
// cached in localStorage by fetchPersonData), so it returns null until
// those have loaded.
export function useTopPeople(
  lists: CompatibilityInput | null,
): readonly RankedPerson[] | null {
  const [movieIds, setMovieIds] = useState<ReadonlyMap<
    number,
    readonly number[]
  > | null>(null);

  const people = lists?.followedPeople;
  useEffect(() => {
    if (!people) return;
    if (people.length === 0) {
      setMovieIds(new Map());
      return;
    }
    let cancelled = false;
    const found = new Map<number, readonly number[]>();
    void mapWithConcurrency(people, 6, async (person) => {
      try {
        const data = await fetchPersonData(person.tmdbId);
        if (data) {
          found.set(
            person.tmdbId,
            data.movies.map((m) => m.tmdbMovieId),
          );
        }
      } catch (error) {
        // One person failing shouldn't hide the rest; they just don't rank.
        console.error(
          "useTopPeople: person fetch failed",
          person.tmdbId,
          error,
        );
      }
    }).then(() => !cancelled && setMovieIds(found));
    return () => {
      cancelled = true;
    };
  }, [people]);

  return useMemo(
    () =>
      lists && movieIds
        ? rankTopPeople(
            lists.followedPeople,
            movieIds,
            lists.seen,
            lists.watchlist,
          )
        : null,
    [lists, movieIds],
  );
}
