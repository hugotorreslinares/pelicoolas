import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  subscribeToFollowedPeople,
  subscribeToWatchedMovies,
} from "@/lib/firebase/firestore";
import type { FollowedPerson } from "@/types/filmography";
import type { FilmographyMovie } from "@/types/movie";

interface PersonData {
  readonly person: FollowedPerson;
  readonly watched: ReadonlySet<number>;
  readonly movies: readonly FilmographyMovie[] | null;
}

function decadeOf(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}

export function WrappedStats() {
  const { user, loading: authLoading } = useAuth();
  const [people, setPeople] = useState<readonly FollowedPerson[] | null>(null);
  const [dataById, setDataById] = useState<Record<number, PersonData>>({});
  const fetchedMoviesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!user) {
      setPeople(null);
      return;
    }
    return subscribeToFollowedPeople(user.uid, setPeople);
  }, [user]);

  useEffect(() => {
    if (!user || !people) return;
    const unsubscribers = people.map((person) =>
      subscribeToWatchedMovies(user.uid, person.tmdbId, (watched) => {
        setDataById((prev) => ({
          ...prev,
          [person.tmdbId]: {
            person,
            watched,
            movies: prev[person.tmdbId]?.movies ?? null,
          },
        }));
      }),
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [user, people]);

  // Movie list (with release years) is the same TMDB proxy response
  // FollowedPersonCard/Dashboard already fetch — CDN-cached, so re-fetching
  // here for the same people isn't wasted quota.
  useEffect(() => {
    if (!people) return;
    people.forEach((person) => {
      if (fetchedMoviesRef.current.has(person.tmdbId)) return;
      fetchedMoviesRef.current.add(person.tmdbId);
      fetch(`/api/person/${person.tmdbId}`)
        .then((r) => r.json())
        .then((data: { movies: readonly FilmographyMovie[] }) => {
          setDataById((prev) => ({
            ...prev,
            [person.tmdbId]: {
              person,
              watched: prev[person.tmdbId]?.watched ?? new Set(),
              movies: data.movies,
            },
          }));
        })
        .catch(() => {
          setDataById((prev) => ({
            ...prev,
            [person.tmdbId]: {
              person,
              watched: prev[person.tmdbId]?.watched ?? new Set(),
              movies: [],
            },
          }));
        });
    });
  }, [people]);

  if (authLoading || (user && people === null)) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <p className="text-center text-muted-foreground">
        Sign in to see your stats.
      </p>
    );
  }

  if (!people || people.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        Follow someone and mark a few movies watched to see your stats here.
      </p>
    );
  }

  const entries = Object.values(dataById);
  const stillLoading =
    entries.length < people.length || entries.some((e) => e.movies === null);

  if (stillLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const totalWatched = entries.reduce((sum, e) => sum + e.watched.size, 0);

  const personWithMost = entries.reduce<PersonData | null>((best, e) => {
    if (!best || e.watched.size > best.watched.size) return e;
    return best;
  }, null);

  const decadeCounts: Record<string, number> = {};
  for (const entry of entries) {
    for (const movie of entry.movies ?? []) {
      if (!entry.watched.has(movie.tmdbMovieId) || movie.releaseYear === null) {
        continue;
      }
      const decade = decadeOf(movie.releaseYear);
      decadeCounts[decade] = (decadeCounts[decade] ?? 0) + 1;
    }
  }
  const topDecade =
    Object.entries(decadeCounts).sort((a, b) => b[1] - a[1])[0] ?? null;

  if (totalWatched === 0) {
    return (
      <p className="text-center text-muted-foreground">
        Mark a few movies as watched to see your stats here.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            Movies watched
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{totalWatched}</p>
        </CardContent>
      </Card>

      {personWithMost && personWithMost.watched.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Most watched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={`/person/${personWithMost.person.tmdbId}`}
              className="focus-ring text-lg font-semibold hover:underline"
            >
              {personWithMost.person.name}
            </a>
            <p className="text-sm text-muted-foreground">
              {personWithMost.watched.size} movies
            </p>
          </CardContent>
        </Card>
      )}

      {topDecade && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Favorite decade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{topDecade[0]}</p>
            <p className="text-sm text-muted-foreground">
              {topDecade[1]} movies from then
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
