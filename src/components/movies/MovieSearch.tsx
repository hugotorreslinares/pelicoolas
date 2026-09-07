import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MovieWatchlistButton } from "./MovieWatchlistButton";
import { MovieDetailsDialog } from "@/components/filmography/MovieDetailsDialog";
import { tmdbImageUrl, tmdbDensitySrcSet } from "@/lib/tmdb/image";
import type { TrendingMovie } from "@/types/movie";

const DEBOUNCE_MS = 350;

export function MovieSearch() {
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
            <div
              key={movie.tmdbMovieId}
              className="flex items-center gap-3 rounded-lg border p-2"
            >
              <button
                type="button"
                onClick={() => setOpenMovieId(movie.tmdbMovieId)}
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

              <MovieWatchlistButton movie={movie} />
            </div>
          ))}
        </div>
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
