import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookmarkIcon } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  removeFromWatchlist,
  subscribeToWatchlist,
} from "@/lib/firebase/firestore";
import { tmdbImageUrl, tmdbWidthSrcSet } from "@/lib/tmdb/image";
import type { WatchlistMovie } from "@/types/filmography";

const POSTER_WIDTHS = [185, 342, 500];
const POSTER_SIZES = "(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw";

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

  useEffect(() => {
    if (!user) {
      setMovies(null);
      return;
    }
    return subscribeToWatchlist(user.uid, setMovies);
  }, [user]);

  if (authLoading || (user && movies === null)) {
    return (
      <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
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

              {typeof movie.voteAverage === "number" && (
                <span className="absolute top-2 left-2 rounded-full bg-background/90 px-1.5 py-0.5 text-xs font-semibold shadow">
                  {Math.round(movie.voteAverage * 10)}%
                </span>
              )}

              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Remove from watchlist"
                className="absolute top-2 right-2 size-8 rounded-full shadow"
                onClick={() => void removeFromWatchlist(user.uid, movie.tmdbId)}
              >
                <BookmarkIcon className="fill-current" />
              </Button>
            </div>

            <p className="mt-1 truncate font-medium">{movie.title}</p>
            <p className="text-sm text-muted-foreground">
              {movie.releaseYear ?? "Unknown"} · via{" "}
              <a
                href={`/person/${movie.sourcePersonId}`}
                className="hover:underline"
              >
                {movie.sourcePersonName}
              </a>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
