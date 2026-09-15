import { useState } from "react";
import { MovieDetailsDialog } from "./MovieDetailsDialog";
import { MovieActions } from "@/components/movies/MovieActions";
import { useMovieActionState } from "@/lib/hooks/useMovieActionState";
import { tmdbImageUrl, tmdbWidthSrcSet } from "@/lib/tmdb/image";
import type { TrendingMovie } from "@/types/movie";

const POSTER_WIDTHS = [185, 342, 500];

interface TrendingSliderProps {
  readonly items: readonly TrendingMovie[];
  readonly mediaType: "movie" | "tv";
  readonly heading: string;
}

export function TrendingSlider({
  items,
  mediaType,
  heading,
}: TrendingSliderProps) {
  const [openId, setOpenId] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="space-y-2 text-left">
      <p className="text-sm font-medium text-muted-foreground">{heading}</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((item, index) => (
          <TrendingCard
            key={item.tmdbMovieId}
            item={item}
            eager={index === 0}
            onOpen={() => setOpenId(item.tmdbMovieId)}
          />
        ))}
      </div>

      {openId !== null && (
        <MovieDetailsDialog
          movieId={openId}
          mediaType={mediaType}
          open={openId !== null}
          onOpenChange={(open) => !open && setOpenId(null)}
        />
      )}
    </div>
  );
}

interface TrendingCardProps {
  readonly item: TrendingMovie;
  readonly eager: boolean;
  readonly onOpen: () => void;
}

function TrendingCard({ item, eager, onOpen }: TrendingCardProps) {
  // A signed-out click just opens the dialog, which has its own sign-in
  // prompt — no room for an inline hint in a dense slider.
  const { watched, inWatchlist, ready, toggleWatched, toggleWatchlist } =
    useMovieActionState(item, onOpen);

  return (
    <div className="group w-28 shrink-0 text-left sm:w-32">
      <div className="card-elevated relative overflow-hidden rounded-lg border">
        <button
          type="button"
          onClick={onOpen}
          className="focus-ring block w-full"
          aria-label={`View details for ${item.title}`}
        >
          {item.posterPath ? (
            <img
              src={tmdbImageUrl(item.posterPath, 185)}
              srcSet={tmdbWidthSrcSet(item.posterPath, POSTER_WIDTHS)}
              sizes="128px"
              alt=""
              // First poster of each slider is a plausible LCP element for a
              // signed-out visitor — eager + high priority, rest stay lazy.
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : undefined}
              className="aspect-[2/3] w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center bg-muted text-xs text-muted-foreground">
              No poster
            </div>
          )}
        </button>

        <MovieActions
          movie={item}
          watched={watched}
          inWatchlist={inWatchlist}
          onToggleWatched={toggleWatched}
          onToggleWatchlist={toggleWatchlist}
          disabled={!ready}
          size="sm"
        />
      </div>
      <p className="mt-1 truncate text-sm font-medium">{item.title}</p>
      {typeof item.voteAverage === "number" && (
        <p className="text-xs text-muted-foreground">
          {Math.round(item.voteAverage * 10)}%
        </p>
      )}
    </div>
  );
}
