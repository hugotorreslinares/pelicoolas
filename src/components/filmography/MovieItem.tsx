import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { MovieDetailsDialog } from "./MovieDetailsDialog";
import { BookmarkIcon } from "lucide-react";
import { tmdbImageUrl, tmdbDensitySrcSet } from "@/lib/tmdb/image";
import type { FilmographyMovie } from "@/types/movie";

interface MovieItemProps {
  readonly movie: FilmographyMovie;
  readonly watched: boolean;
  readonly onToggle: (watched: boolean) => void;
  readonly inWatchlist: boolean;
  readonly onToggleWatchlist: () => void;
}

export function MovieItem({
  movie,
  watched,
  onToggle,
  inWatchlist,
  onToggleWatchlist,
}: MovieItemProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-lg border p-2">
      <Checkbox
        checked={watched}
        onCheckedChange={(v) => onToggle(v === true)}
        aria-label={`Mark ${movie.title} as ${watched ? "unwatched" : "watched"}`}
      />
      <button
        type="button"
        onClick={() => setDetailsOpen(true)}
        className="focus-ring flex flex-1 items-center gap-3 text-left"
      >
        {movie.posterPath && (
          <img
            src={tmdbImageUrl(movie.posterPath, 45)}
            srcSet={tmdbDensitySrcSet(movie.posterPath, 45, 92)}
            alt=""
            loading="lazy"
            className="h-14 w-10 rounded object-cover"
          />
        )}
        <div>
          <p className="font-medium">{movie.title}</p>
          <p className="text-sm text-muted-foreground">
            {movie.releaseYear ?? "Release date: Unknown"}
          </p>
        </div>
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
        onClick={(e) => {
          e.stopPropagation();
          onToggleWatchlist();
        }}
      >
        <BookmarkIcon className={inWatchlist ? "fill-current" : ""} />
      </Button>

      <MovieDetailsDialog
        movieId={movie.tmdbMovieId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
