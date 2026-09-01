import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookmarkIcon } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { removeFromWatchlist, subscribeToWatchlist } from "@/lib/firebase/firestore";
import type { WatchlistMovie } from "@/types/filmography";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w92";

export function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const [movies, setMovies] = useState<readonly WatchlistMovie[] | null>(null);

  useEffect(() => {
    if (!user) {
      setMovies(null);
      return;
    }
    return subscribeToWatchlist(user.uid, setMovies);
  }, [user]);

  if (authLoading || (user && movies === null)) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">Watchlist</h1>
        <p className="text-muted-foreground">Sign in to keep movies on your radar.</p>
      </div>
    );
  }

  if (!movies || movies.length === 0) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">Your watchlist is empty.</h1>
        <p className="text-muted-foreground">
          While exploring a filmography, tap the bookmark icon on a movie to add it here.
        </p>
        <Button render={<a href="/search" />}>Search actors & directors</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Watchlist</h1>
      <p className="text-sm text-muted-foreground">{movies.length} movies on your radar</p>

      <div className="space-y-2">
        {movies.map((movie) => (
          <div key={movie.tmdbId} className="flex items-center gap-3 rounded-lg border p-2">
            {movie.posterPath && (
              <img
                src={`${TMDB_IMAGE_BASE}${movie.posterPath}`}
                alt=""
                loading="lazy"
                className="h-14 w-10 rounded object-cover"
              />
            )}
            <div className="flex-1">
              <p className="font-medium">{movie.title}</p>
              <p className="text-sm text-muted-foreground">
                {movie.releaseYear ?? "Unknown"} · via{" "}
                <a href={`/person/${movie.sourcePersonId}`} className="hover:underline">
                  {movie.sourcePersonName}
                </a>
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove from watchlist"
              onClick={() => void removeFromWatchlist(user.uid, movie.tmdbId)}
            >
              <BookmarkIcon className="fill-current" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
