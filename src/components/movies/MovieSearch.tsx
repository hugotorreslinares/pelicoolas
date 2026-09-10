import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MovieResultRow } from "./MovieResultRow";
import { MovieDetailsDialog } from "@/components/filmography/MovieDetailsDialog";
import { TrendingMovies } from "@/components/filmography/TrendingMovies";
import type { TrendingMovie } from "@/types/movie";

const DEBOUNCE_MS = 350;

interface MovieSearchProps {
  readonly trendingMovies?: readonly TrendingMovie[];
}

export function MovieSearch({ trendingMovies = [] }: MovieSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly TrendingMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMovieId, setOpenMovieId] = useState<number | null>(null);

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
          `/api/search-movie?q=${encodeURIComponent(trimmed)}`,
        );
        if (!res.ok) throw new Error("request failed");
        const data = (await res.json()) as {
          results: readonly TrendingMovie[];
        };
        setResults(data.results);
        setError(null);
      } catch {
        setError("We couldn't load movies. Please try again.");
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <Input
        placeholder="Search movie title..."
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
          No movies found. Try another title.
        </p>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2 text-left">
          {results.map((movie) => (
            <MovieResultRow
              key={movie.tmdbMovieId}
              movie={movie}
              onClick={() => setOpenMovieId(movie.tmdbMovieId)}
            />
          ))}
        </div>
      )}

      {!query.trim() && trendingMovies.length > 0 && (
        <TrendingMovies movies={trendingMovies} />
      )}

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
