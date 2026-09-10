import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookmarkIcon } from "lucide-react";
import { MovieDetailsDialog } from "./MovieDetailsDialog";
import { useAuth } from "@/lib/hooks/useAuth";
import { announce } from "@/lib/a11y";
import {
  removeFromWatchlist,
  setWatchlistGenres,
  subscribeToWatchlist,
} from "@/lib/firebase/firestore";
import { awardBadgeOnce } from "@/lib/firebase/badges";
import { fetchMovieDetails } from "@/lib/movieData";
import { tmdbImageUrl, tmdbWidthSrcSet } from "@/lib/tmdb/image";
import { genreName } from "@/lib/tmdb/genres";
import engagement from "@/config/engagement.json";
import type { WatchlistMovie } from "@/types/filmography";

const POSTER_WIDTHS = [185, 342, 500];
const POSTER_SIZES = "(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw";
const WATCHLIST_MILESTONES = [10, 25, 50];

type SortOrder = "newest" | "oldest";

function sortMovies(
  movies: readonly WatchlistMovie[],
  order: SortOrder,
): readonly WatchlistMovie[] {
  const withYear = movies.filter((m) => m.releaseYear !== null);
  const withoutYear = movies.filter((m) => m.releaseYear === null);
  const sorted = [...withYear].sort((a, b) =>
    order === "newest"
      ? b.releaseYear! - a.releaseYear!
      : a.releaseYear! - b.releaseYear!,
  );
  return [...sorted, ...withoutYear];
}

const ALL_GENRES = "all";

export function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const [movies, setMovies] = useState<readonly WatchlistMovie[] | null>(null);
  const [order, setOrder] = useState<SortOrder>("newest");
  const [genreFilter, setGenreFilter] = useState<number | typeof ALL_GENRES>(
    ALL_GENRES,
  );
  const [openMovieId, setOpenMovieId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setMovies(null);
      return;
    }
    return subscribeToWatchlist(user.uid, setMovies);
  }, [user]);

  // Entries added before genreIds existed have no such field at all
  // (`undefined`, not an empty array — that's a real "TMDB has no genres
  // for this movie"). Backfill them once in the background so the genre
  // filter below actually has something to work with; the Firestore
  // listener above picks the update straight back up.
  const backfilledRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!user || !movies) return;
    const toBackfill = movies.filter(
      (m) => m.genreIds === undefined && !backfilledRef.current.has(m.tmdbId),
    );
    if (toBackfill.length === 0) return;

    (async () => {
      for (const movie of toBackfill) {
        backfilledRef.current.add(movie.tmdbId);
        try {
          const details = await fetchMovieDetails(movie.tmdbId);
          if (details) {
            await setWatchlistGenres(user.uid, movie.tmdbId, details.genreIds);
          }
        } catch {
          // Best-effort backfill — leave this one for next visit.
        }
      }
    })();
  }, [user, movies]);

  useEffect(() => {
    if (!user || !movies || !engagement.badges.watchlistMilestones) return;
    for (const threshold of WATCHLIST_MILESTONES) {
      if (movies.length < threshold) continue;
      void awardBadgeOnce(user.uid, {
        id: `watchlist-milestone-${threshold}`,
        type: "watchlist-milestone",
        label: `Watchlist of ${threshold}+`,
        description: `Kept ${threshold} or more movies on your watchlist.`,
      });
    }
  }, [user, movies]);

  // A tall 8-poster skeleton is right for "fetching a signed-in user's
  // watchlist", but auth resolving to "not signed in" is the common case
  // for a first-time or anonymous visit — collapsing straight from that
  // tall grid down to the one-line sign-in message was the single biggest
  // layout shift on the page (CLS ~0.96 in a Lighthouse run). Keep the
  // auth-pending skeleton the same shape as the sign-in message itself so
  // there's nothing to collapse from in that case.
  if (authLoading) {
    return (
      <div className="space-y-3 text-center">
        {/* Visually-hidden but always present — the loading state is what
            axe-core (or any crawler) sees before Firebase's async auth
            check resolves, and a page needs a heading in every state. */}
        <h1 className="sr-only">Watchlist</h1>
        <Skeleton className="mx-auto h-7 w-32" />
        <Skeleton className="mx-auto h-5 w-56" />
      </div>
    );
  }

  if (user && movies === null) {
    return (
      <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
        <h1 className="sr-only">Watchlist</h1>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="mb-3 aspect-[2/3] w-full break-inside-avoid rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">Watchlist</h1>
        <p className="text-muted-foreground">
          Sign in to keep movies on your radar.
        </p>
      </div>
    );
  }

  if (!movies || movies.length === 0) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">Your watchlist is empty.</h1>
        <p className="text-muted-foreground">
          While exploring a filmography, tap the bookmark icon on a movie to add
          it here.
        </p>
        <Button render={<a href="/search" />}>Search actors & directors</Button>
      </div>
    );
  }

  // Genres present in the watchlist, sorted by how many movies carry each —
  // most useful ones first instead of alphabetical noise. Movies added
  // before genreIds existed just don't show up in any genre chip below (but
  // still show under "All").
  const genreCounts = new Map<number, number>();
  for (const movie of movies) {
    for (const id of movie.genreIds ?? []) {
      genreCounts.set(id, (genreCounts.get(id) ?? 0) + 1);
    }
  }
  const availableGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const filtered =
    genreFilter === ALL_GENRES
      ? movies
      : movies.filter((m) => m.genreIds?.includes(genreFilter));
  const sorted = sortMovies(filtered, order);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Watchlist</h1>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {sorted.length} of {movies.length} movies on your radar
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOrder(order === "newest" ? "oldest" : "newest")}
        >
          {order === "newest" ? "Most recent" : "Oldest"}
        </Button>
      </div>

      {availableGenres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={genreFilter === ALL_GENRES ? "default" : "outline"}
            onClick={() => setGenreFilter(ALL_GENRES)}
          >
            All genres
          </Button>
          {availableGenres.map((id) => (
            <Button
              key={id}
              size="sm"
              variant={genreFilter === id ? "default" : "outline"}
              onClick={() => setGenreFilter(id)}
            >
              {genreName(id) ?? "Other"}
            </Button>
          ))}
        </div>
      )}

      <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
        {sorted.map((movie) => (
          <div key={movie.tmdbId} className="mb-3 break-inside-avoid">
            <div className="card-elevated group relative overflow-hidden rounded-lg border">
              <button
                type="button"
                onClick={() => setOpenMovieId(movie.tmdbId)}
                className="focus-ring block w-full"
                aria-label={`View details for ${movie.title}`}
              >
                {movie.posterPath ? (
                  <img
                    src={tmdbImageUrl(movie.posterPath, 342)}
                    srcSet={tmdbWidthSrcSet(movie.posterPath, POSTER_WIDTHS)}
                    sizes={POSTER_SIZES}
                    alt=""
                    loading="lazy"
                    className="w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[2/3] w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                    No poster
                  </div>
                )}
              </button>

              {typeof movie.voteAverage === "number" && (
                <span className="absolute top-2 left-2 rounded-full bg-background/90 px-1.5 py-0.5 text-xs font-semibold shadow">
                  {Math.round(movie.voteAverage * 10)}%
                </span>
              )}

              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label={`Remove ${movie.title} from watchlist`}
                className="absolute top-2 right-2 size-11 rounded-full shadow"
                onClick={() => {
                  void removeFromWatchlist(user.uid, movie.tmdbId);
                  announce(`Removed ${movie.title} from watchlist`);
                }}
              >
                <BookmarkIcon className="fill-current" />
              </Button>
            </div>

            <p className="mt-1 truncate font-medium">{movie.title}</p>
            <p className="text-sm text-muted-foreground">
              {movie.releaseYear ?? "Unknown"}
              {movie.sourcePersonId != null && movie.sourcePersonName && (
                <>
                  {" "}
                  · via{" "}
                  <a
                    href={`/person/${movie.sourcePersonId}`}
                    className="focus-ring hover:underline"
                  >
                    {movie.sourcePersonName}
                  </a>
                </>
              )}
            </p>
          </div>
        ))}
      </div>

      {openMovieId !== null && (
        <MovieDetailsDialog
          movieId={openMovieId}
          open={openMovieId !== null}
          onOpenChange={(open) => !open && setOpenMovieId(null)}
        />
      )}
    </div>
  );
}
