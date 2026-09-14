import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MovieDetailsDialog } from "./MovieDetailsDialog";
import { MovieActions } from "@/components/movies/MovieActions";
import { cn } from "@/lib/utils";
import { tmdbImageUrl, tmdbWidthSrcSet } from "@/lib/tmdb/image";
import type { FilmographyMovie } from "@/types/movie";

const POSTER_WIDTHS = [185, 342, 500];
const POSTER_SIZES = "(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw";

interface MovieItemProps {
  readonly movie: FilmographyMovie;
  readonly watched: boolean;
  readonly onToggle: (watched: boolean) => void;
  readonly inWatchlist: boolean;
  readonly onToggleWatchlist: () => void;
  /** True while watched/watchlist status is still loading — the checkbox
   *  and bookmark would otherwise confidently show "no" before it's known. */
  readonly statusLoading?: boolean;
}

// A poster card, not a checklist row — same visual language as the
// watchlist grid (rating badge top-left, watched/watchlist actions
// top-right, masonry columns), so a filmography reads as a browsable
// gallery. A watched movie dims to make progress legible at a glance
// across the whole grid, not just per-item.
export function MovieItem({
  movie,
  watched,
  onToggle,
  inWatchlist,
  onToggleWatchlist,
  statusLoading = false,
}: MovieItemProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="mb-3 break-inside-avoid">
      <div className="card-elevated group relative overflow-hidden rounded-lg border">
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="focus-ring block w-full"
          aria-label={`View details for ${movie.title}`}
        >
          {movie.posterPath ? (
            <img
              src={tmdbImageUrl(movie.posterPath, 185)}
              srcSet={tmdbWidthSrcSet(movie.posterPath, POSTER_WIDTHS)}
              sizes={POSTER_SIZES}
              alt=""
              loading="lazy"
              className={cn(
                "w-full object-cover transition-opacity",
                watched && "opacity-40",
              )}
            />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center bg-muted text-xs text-muted-foreground">
              No poster
            </div>
          )}
        </button>

        {typeof movie.voteAverage === "number" && (
          <span className="absolute top-2 left-2 rounded-full bg-background/90 px-1.5 py-0.5 text-xs font-semibold shadow">
            {Math.round(movie.voteAverage * 10)}%
          </span>
        )}

        {statusLoading ? (
          <Skeleton className="absolute top-2 right-2 h-11 w-22 rounded-full" />
        ) : (
          <MovieActions
            movie={movie}
            watched={watched}
            inWatchlist={inWatchlist}
            onToggleWatched={() => onToggle(!watched)}
            onToggleWatchlist={onToggleWatchlist}
          />
        )}
      </div>

      <p className="mt-1 truncate font-medium">{movie.title}</p>
      <p className="text-sm text-muted-foreground">
        {movie.releaseYear ?? "Release date: Unknown"}
      </p>

      <MovieDetailsDialog
        movieId={movie.tmdbMovieId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
