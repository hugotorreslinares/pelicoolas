import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tmdbImageUrl, tmdbDensitySrcSet } from "@/lib/tmdb/image";
import type { FilmographyMovie } from "@/types/movie";

interface PosterCarouselProps {
  readonly movies: readonly FilmographyMovie[];
  readonly onSelect: (movieId: number) => void;
}

// A plain overflow-x-auto strip works, but gives no hint there's more to
// see past the edge of the screen and no way to move it besides a raw
// swipe/scroll. This adds snap-to-poster scrolling, arrow buttons that page
// by a screenful, and edge fades that only show when there's actually more
// content in that direction.
export function PosterCarousel({ movies, onSelect }: PosterCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function updateEdges() {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  useEffect(() => {
    updateEdges();
  }, [movies.length]);

  function page(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="relative">
      {!atStart && (
        <>
          <div className="pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent" />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Scroll left"
            onClick={() => page(-1)}
            className="absolute top-1/2 left-0 z-20 size-8 -translate-y-1/2 rounded-full shadow"
          >
            <ChevronLeftIcon />
          </Button>
        </>
      )}

      <div
        ref={scrollerRef}
        onScroll={updateEdges}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1"
      >
        {movies.map((movie) => (
          <button
            key={movie.tmdbMovieId}
            type="button"
            onClick={() => onSelect(movie.tmdbMovieId)}
            className="focus-ring w-20 shrink-0 snap-start text-left"
          >
            {movie.posterPath ? (
              <img
                src={tmdbImageUrl(movie.posterPath, 92)}
                srcSet={tmdbDensitySrcSet(movie.posterPath, 92, 185)}
                alt=""
                loading="lazy"
                className="aspect-[2/3] w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                No poster
              </div>
            )}
            <p className="mt-1 truncate text-xs font-medium">{movie.title}</p>
          </button>
        ))}
      </div>

      {!atEnd && (
        <>
          <div className="pointer-events-none absolute top-0 bottom-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Scroll right"
            onClick={() => page(1)}
            className="absolute top-1/2 right-0 z-20 size-8 -translate-y-1/2 rounded-full shadow"
          >
            <ChevronRightIcon />
          </Button>
        </>
      )}
    </div>
  );
}
