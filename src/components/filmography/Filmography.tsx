import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MovieItem } from "./MovieItem";
import { FilmographyFilters } from "./FilmographyFilters";
import { FilmographyProgress } from "./FilmographyProgress";
import { useAuth } from "@/lib/hooks/useAuth";
import { announce } from "@/lib/a11y";
import {
  addToWatchlist,
  markMovieWatched,
  removeFromWatchlist,
  subscribeToWatchedMovies,
  subscribeToWatchlist,
  unmarkMovieWatched,
} from "@/lib/firebase/firestore";
import { awardBadgeOnce } from "@/lib/firebase/badges";
import engagement from "@/config/engagement.json";
import type { FilmographyMovie } from "@/types/movie";
import type { FilmographyFilter } from "@/types/filmography";

const DECADE_SPAN_THRESHOLD = 5;

interface FilmographyProps {
  readonly personId: number;
  readonly personName: string;
  readonly movies: readonly FilmographyMovie[];
}

type SortOrder = "newest" | "oldest";

function sortMovies(movies: readonly FilmographyMovie[], order: SortOrder) {
  const withYear = movies.filter((m) => m.releaseYear !== null);
  const withoutYear = movies.filter((m) => m.releaseYear === null);
  const sorted = [...withYear].sort((a, b) =>
    order === "newest"
      ? b.releaseYear! - a.releaseYear!
      : a.releaseYear! - b.releaseYear!,
  );
  return [...sorted, ...withoutYear];
}

function groupByYear(
  movies: readonly FilmographyMovie[],
): readonly [string, FilmographyMovie[]][] {
  const groups = new Map<string, FilmographyMovie[]>();
  for (const movie of movies) {
    const key =
      movie.releaseYear !== null ? String(movie.releaseYear) : "Unknown";
    const list = groups.get(key) ?? [];
    list.push(movie);
    groups.set(key, list);
  }
  return Array.from(groups.entries());
}

export function Filmography({
  personId,
  personName,
  movies,
}: FilmographyProps) {
  const { user } = useAuth();
  const [watched, setWatched] = useState<ReadonlySet<number>>(new Set());
  const [watchlist, setWatchlist] = useState<ReadonlySet<number>>(new Set());
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

  useEffect(() => {
    if (!user) {
      setWatchlist(new Set());
      return;
    }
    return subscribeToWatchlist(user.uid, (movies) =>
      setWatchlist(new Set(movies.map((m) => m.tmdbId))),
    );
  }, [user]);

  const sorted = useMemo(() => sortMovies(movies, order), [movies, order]);

  const filtered = useMemo(() => {
    if (filter === "watched")
      return sorted.filter((m) => watched.has(m.tmdbMovieId));
    if (filter === "unwatched")
      return sorted.filter((m) => !watched.has(m.tmdbMovieId));
    return sorted;
  }, [sorted, filter, watched]);

  const grouped = useMemo(() => groupByYear(filtered), [filtered]);

  // Badge conditions re-evaluate on every `watched` change (any check/
  // uncheck), but awardBadgeOnce is a no-op past the first time each
  // condition is met — see its own comment for why that matters.
  useEffect(() => {
    if (!user || movies.length === 0) return;

    if (
      engagement.badges.personFilmographyComplete &&
      watched.size === movies.length
    ) {
      void awardBadgeOnce(user.uid, {
        id: `person-complete-${personId}`,
        type: "person-complete",
        label: `Completed ${personName}`,
        description: `Watched all ${movies.length} movies in ${personName}'s filmography.`,
        personId,
        personName,
      });
    }

    if (engagement.badges.decadeSpan) {
      const decades = new Set(
        movies
          .filter((m) => watched.has(m.tmdbMovieId) && m.releaseYear !== null)
          .map((m) => Math.floor(m.releaseYear! / 10) * 10),
      );
      if (decades.size >= DECADE_SPAN_THRESHOLD) {
        void awardBadgeOnce(user.uid, {
          id: `decade-span-${personId}`,
          type: "decade-span",
          label: `${personName}: Full Retrospective`,
          description: `Watched ${personName}'s movies across ${decades.size} different decades.`,
          personId,
          personName,
        });
      }
    }
  }, [user, movies, watched, personId, personName]);

  async function toggleWatched(movie: FilmographyMovie, next: boolean) {
    if (!user) {
      setShowSignInHint(true);
      return;
    }
    if (next) {
      await markMovieWatched(user.uid, personId, movie.tmdbMovieId);
      announce(`Marked ${movie.title} as watched`);
    } else {
      await unmarkMovieWatched(user.uid, personId, movie.tmdbMovieId);
      announce(`Marked ${movie.title} as unwatched`);
    }
  }

  async function toggleWatchlist(movie: FilmographyMovie) {
    if (!user) {
      setShowSignInHint(true);
      return;
    }
    if (watchlist.has(movie.tmdbMovieId)) {
      await removeFromWatchlist(user.uid, movie.tmdbMovieId);
      announce(`Removed ${movie.title} from watchlist`);
    } else {
      await addToWatchlist(user.uid, {
        tmdbId: movie.tmdbMovieId,
        title: movie.title,
        posterPath: movie.posterPath,
        releaseYear: movie.releaseYear,
        voteAverage: movie.voteAverage,
        sourcePersonId: personId,
        sourcePersonName: personName,
      });
      announce(`Added ${movie.title} to watchlist`);
    }
  }

  return (
    <div className="space-y-4">
      <FilmographyProgress
        watchedCount={watched.size}
        totalCount={movies.length}
      />

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
        <p className="text-sm text-muted-foreground">
          Sign in to track and save movies.
        </p>
      )}

      <div className="space-y-6">
        {grouped.map(([year, yearMovies]) => (
          <div key={year} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {year}
            </h2>
            {yearMovies.map((movie) => (
              <MovieItem
                key={movie.tmdbMovieId}
                movie={movie}
                watched={watched.has(movie.tmdbMovieId)}
                onToggle={(next) => void toggleWatched(movie, next)}
                inWatchlist={watchlist.has(movie.tmdbMovieId)}
                onToggleWatchlist={() => void toggleWatchlist(movie)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
