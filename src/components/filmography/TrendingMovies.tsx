import { useState } from "react";
import { MovieDetailsDialog } from "./MovieDetailsDialog";
import { tmdbImageUrl, tmdbWidthSrcSet } from "@/lib/tmdb/image";
import type { TrendingMovie } from "@/types/movie";

const POSTER_WIDTHS = [185, 342, 500];
const POSTER_SIZES = "(min-width: 768px) 16vw, (min-width: 640px) 20vw, 33vw";

interface TrendingMoviesProps {
  readonly movies: readonly TrendingMovie[];
}

export function TrendingMovies({ movies }: TrendingMoviesProps) {
  const [openMovieId, setOpenMovieId] = useState<number | null>(null);

  if (movies.length === 0) return null;

  return (
    <div className="space-y-2 text-left">
      <p className="text-sm font-medium text-muted-foreground">
        Trending this week
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {movies.map((movie, index) => (
          <button
            key={movie.tmdbMovieId}
            type="button"
            onClick={() => setOpenMovieId(movie.tmdbMovieId)}
            className="focus-ring group text-left"
          >
            <div className="overflow-hidden rounded-lg border">
              {movie.posterPath ? (
                <img
                  src={tmdbImageUrl(movie.posterPath, 185)}
                  srcSet={tmdbWidthSrcSet(movie.posterPath, POSTER_WIDTHS)}
                  sizes={POSTER_SIZES}
                  alt=""
                  // First poster is the likely LCP element for a signed-out
                  // visitor (top of the fold, no auth/JS gating) — eager +
                  // high priority instead of lazy like the rest of the row.
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : undefined}
                  className="aspect-[2/3] w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex aspect-[2/3] w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                  No poster
                </div>
              )}
            </div>
            <p className="mt-1 truncate text-sm font-medium">{movie.title}</p>
            {typeof movie.voteAverage === "number" && (
              <p className="text-xs text-muted-foreground">
                {Math.round(movie.voteAverage * 10)}%
              </p>
            )}
          </button>
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
