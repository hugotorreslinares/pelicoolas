import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { MovieDetailsDialog } from "./MovieDetailsDialog";
import { BookmarkIcon } from "lucide-react";
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
}

// A poster card, not a checklist row — same visual language as the
// watchlist grid (rating badge top-left, watchlist toggle top-right,
// masonry columns), so a filmography reads as a browsable gallery. The
// watched checkbox sits bottom-left over the poster, and a watched movie
// dims to make progress legible at a glance across the whole grid, not just
// per-item.
export function MovieItem({
  movie,
  watched,
  onToggle,
  inWatchlist,
  onToggleWatchlist,
}: MovieItemProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="mb-3 break-inside-avoid">
      <div className="group relative overflow-hidden rounded-lg border">
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

        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={
            inWatchlist ? "Remove from watchlist" : "Add to watchlist"
          }
          className="absolute top-2 right-2 size-11 rounded-full shadow"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatchlist();
          }}
        >
          <BookmarkIcon className={inWatchlist ? "fill-current" : ""} />
        </Button>

        <div className="absolute bottom-2 left-2 flex size-11 items-center justify-center rounded-full bg-background/90 shadow">
          <Checkbox
            checked={watched}
            onCheckedChange={(v) => onToggle(v === true)}
            onClick={(e) => e.stopPropagation()}
            className="size-5"
            aria-label={`Mark ${movie.title} as ${watched ? "unwatched" : "watched"}`}
          />
        </div>
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
