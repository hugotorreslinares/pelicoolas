import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { MovieDetailsDialog } from "./MovieDetailsDialog";
import { BookmarkIcon } from "lucide-react";
import type { FilmographyMovie } from "@/types/movie";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w92";

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
      />
      <button
        type="button"
        onClick={() => setDetailsOpen(true)}
        className="flex flex-1 items-center gap-3 text-left"
      >
        {movie.posterPath && (
          <img
            src={`${TMDB_IMAGE_BASE}${movie.posterPath}`}
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
