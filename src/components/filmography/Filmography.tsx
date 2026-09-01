import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MovieItem } from "./MovieItem";
import { FilmographyFilters } from "./FilmographyFilters";
import { FilmographyProgress } from "./FilmographyProgress";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  markMovieWatched,
  subscribeToWatchedMovies,
  unmarkMovieWatched,
} from "@/lib/firebase/firestore";
import type { FilmographyMovie } from "@/types/movie";
import type { FilmographyFilter } from "@/types/filmography";

interface FilmographyProps {
  readonly personId: number;
  readonly movies: readonly FilmographyMovie[];
}

type SortOrder = "newest" | "oldest";

function sortMovies(movies: readonly FilmographyMovie[], order: SortOrder) {
  const withYear = movies.filter((m) => m.releaseYear !== null);
  const withoutYear = movies.filter((m) => m.releaseYear === null);
  const sorted = [...withYear].sort((a, b) =>
    order === "newest" ? b.releaseYear! - a.releaseYear! : a.releaseYear! - b.releaseYear!,
  );
  return [...sorted, ...withoutYear];
}

function groupByYear(movies: readonly FilmographyMovie[]): readonly [string, FilmographyMovie[]][] {
  const groups = new Map<string, FilmographyMovie[]>();
  for (const movie of movies) {
    const key = movie.releaseYear !== null ? String(movie.releaseYear) : "Unknown";
    const list = groups.get(key) ?? [];
    list.push(movie);
    groups.set(key, list);
  }
  return Array.from(groups.entries());
}

export function Filmography({ personId, movies }: FilmographyProps) {
  const { user } = useAuth();
  const [watched, setWatched] = useState<ReadonlySet<number>>(new Set());
  const [filter, setFilter] = useState<FilmographyFilter>("all");
  const [order, setOrder] = useState<SortOrder>("newest");
  const [showSignInHint, setShowSignInHint] = useState(false);

  useEffect(() => {
    if (!user) {
      setWatched(new Set());
      return;
    }
    return subscribeToWatchedMovies(user.uid, personId, setWatched);
  }, [user, personId]);

  const sorted = useMemo(() => sortMovies(movies, order), [movies, order]);

  const filtered = useMemo(() => {
    if (filter === "watched") return sorted.filter((m) => watched.has(m.tmdbMovieId));
    if (filter === "unwatched") return sorted.filter((m) => !watched.has(m.tmdbMovieId));
    return sorted;
  }, [sorted, filter, watched]);

  const grouped = useMemo(() => groupByYear(filtered), [filtered]);

  async function toggleWatched(movieId: number, next: boolean) {
    if (!user) {
      setShowSignInHint(true);
      return;
    }
    if (next) {
      await markMovieWatched(user.uid, personId, movieId);
    } else {
      await unmarkMovieWatched(user.uid, personId, movieId);
    }
  }

  return (
    <div className="space-y-4">
      <FilmographyProgress watchedCount={watched.size} totalCount={movies.length} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilmographyFilters value={filter} onChange={setFilter} />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOrder(order === "newest" ? "oldest" : "newest")}
        >
          {order === "newest" ? "Most recent" : "Oldest"}
        </Button>
      </div>

      {showSignInHint && (
        <p className="text-sm text-muted-foreground">Sign in to track watched movies.</p>
      )}

      <div className="space-y-6">
        {grouped.map(([year, yearMovies]) => (
          <div key={year} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{year}</h2>
            {yearMovies.map((movie) => (
              <MovieItem
                key={movie.tmdbMovieId}
                movie={movie}
                watched={watched.has(movie.tmdbMovieId)}
                onToggle={(next) => void toggleWatched(movie.tmdbMovieId, next)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
