import { useState } from "react";
import { MovieActions } from "./MovieActions";
import { LoginButton } from "@/components/auth/LoginButton";
import { useMovieActionState } from "@/lib/hooks/useMovieActionState";
import { tmdbImageUrl, tmdbDensitySrcSet } from "@/lib/tmdb/image";
import type { TrendingMovie } from "@/types/movie";

interface MovieResultRowProps {
  readonly movie: TrendingMovie;
  readonly onClick: () => void;
}

// Shared by MovieSearch and HeaderSearch — same poster+title+year+watched/
// watchlist actions row, just a different container around it.
export function MovieResultRow({ movie, onClick }: MovieResultRowProps) {
  const [showSignInHint, setShowSignInHint] = useState(false);
  const { watched, inWatchlist, ready, toggleWatched, toggleWatchlist } =
    useMovieActionState(movie, () => setShowSignInHint(true));

  return (
    <div className="card-elevated flex items-center gap-3 rounded-lg border p-2">
      <button
        type="button"
        onClick={onClick}
        className="focus-ring flex flex-1 items-center gap-3 text-left"
      >
        {movie.posterPath ? (
          <img
            src={tmdbImageUrl(movie.posterPath, 45)}
            srcSet={tmdbDensitySrcSet(movie.posterPath, 45, 92)}
            alt=""
            loading="lazy"
            className="h-14 w-10 rounded object-cover"
          />
        ) : (
          <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
            N/A
          </div>
        )}
        <div>
          <p className="font-medium">{movie.title}</p>
          <p className="text-sm text-muted-foreground">
            {movie.releaseYear ?? "Release date: Unknown"}
          </p>
        </div>
      </button>

      {showSignInHint ? (
        <LoginButton size="sm" />
      ) : (
        <MovieActions
          movie={movie}
          watched={watched}
          inWatchlist={inWatchlist}
          onToggleWatched={toggleWatched}
          onToggleWatchlist={toggleWatchlist}
          disabled={!ready}
          size="sm"
          placement="inline"
        />
      )}
    </div>
  );
}
