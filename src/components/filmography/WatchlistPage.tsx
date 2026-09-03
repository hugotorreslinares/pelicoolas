import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookmarkIcon } from "lucide-react";
import { MovieDetailsDialog } from "./MovieDetailsDialog";
import { useAuth } from "@/lib/hooks/useAuth";
import { announce } from "@/lib/a11y";
import {
  removeFromWatchlist,
  subscribeToWatchlist,
} from "@/lib/firebase/firestore";
import { awardBadgeOnce } from "@/lib/firebase/badges";
import { tmdbImageUrl, tmdbWidthSrcSet } from "@/lib/tmdb/image";
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

export function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const [movies, setMovies] = useState<readonly WatchlistMovie[] | null>(null);
  const [order, setOrder] = useState<SortOrder>("newest");
  const [openMovieId, setOpenMovieId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setMovies(null);
      return;
    }
    return subscribeToWatchlist(user.uid, setMovies);
  }, [user]);

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

  const sorted = sortMovies(movies, order);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Watchlist</h1>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {movies.length} movies on your radar
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setOrder(order === "newest" ? "oldest" : "newest")}
        >
          {order === "newest" ? "Most recent" : "Oldest"}
        </Button>
      </div>

      <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
        {sorted.map((movie) => (
          <div key={movie.tmdbId} className="mb-3 break-inside-avoid">
            <div className="group relative overflow-hidden rounded-lg border">
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
                className="absolute top-2 right-2 size-8 rounded-full shadow"
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
              {movie.releaseYear ?? "Unknown"} · via{" "}
              <a
                href={`/person/${movie.sourcePersonId}`}
                className="focus-ring hover:underline"
              >
                {movie.sourcePersonName}
              </a>
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
