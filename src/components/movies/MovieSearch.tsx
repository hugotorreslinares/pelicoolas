import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MovieResultRow } from "./MovieResultRow";
import { MovieDetailsDialog } from "@/components/filmography/MovieDetailsDialog";
import { TrendingSlider } from "@/components/filmography/TrendingSlider";
import type { TrendingMovie } from "@/types/movie";

const DEBOUNCE_MS = 350;

type MediaType = "movie" | "tv";

interface MovieSearchProps {
  readonly mediaType?: MediaType;
  readonly trendingMovies?: readonly TrendingMovie[];
}

const SEARCH_ENDPOINT: Record<MediaType, string> = {
  movie: "/api/search-movie",
  tv: "/api/search-tv",
};

export function MovieSearch({
  mediaType = "movie",
  trendingMovies = [],
}: MovieSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly TrendingMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Full result object, not just an id — MovieDetailsDialog needs mediaType
  // to fetch the right endpoint (see the dialog's own mediaType prop).
  const [openMovie, setOpenMovie] = useState<TrendingMovie | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${SEARCH_ENDPOINT[mediaType]}?q=${encodeURIComponent(trimmed)}`,
        );
        if (!res.ok) throw new Error("request failed");
        const data = (await res.json()) as {
          results: readonly TrendingMovie[];
        };
        setResults(data.results);
        setError(null);
      } catch {
        setError(
          mediaType === "tv"
            ? "We couldn't load shows. Please try again."
            : "We couldn't load movies. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, mediaType]);

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <Input
        placeholder={
          mediaType === "tv"
            ? "Search TV show title..."
            : "Search movie title..."
        }
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!loading && error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && query.trim() && results.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {mediaType === "tv"
            ? "No shows found. Try another title."
            : "No movies found. Try another title."}
        </p>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2 text-left">
          {results.map((movie) => (
            <MovieResultRow
              key={movie.tmdbMovieId}
              movie={movie}
              onClick={() => setOpenMovie(movie)}
            />
          ))}
        </div>
      )}

      {!query.trim() && trendingMovies.length > 0 && (
        <TrendingSlider
          items={trendingMovies}
          mediaType={mediaType}
          heading="Trending this week"
        />
      )}

      {openMovie && (
        <MovieDetailsDialog
          movieId={openMovie.tmdbMovieId}
          mediaType={mediaType}
          open={openMovie !== null}
          onOpenChange={(open) => !open && setOpenMovie(null)}
        />
      )}
    </div>
  );
}
