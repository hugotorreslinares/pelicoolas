import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonCard } from "@/components/people/PersonCard";
import { MovieResultRow } from "@/components/movies/MovieResultRow";
import { MovieDetailsDialog } from "@/components/filmography/MovieDetailsDialog";
import { addRecentSearch } from "@/lib/recentSearches";
import type { PersonSearchResult } from "@/types/person";
import type { TrendingMovie } from "@/types/movie";

const DEBOUNCE_MS = 350;

type ResultTab = "people" | "movies" | "tv";

// Desktop sidebar's search — same three endpoints as HeaderSearch (the
// mobile header's popup version), but rendered inline in normal document
// flow instead of an absolutely-positioned floating panel: the sidebar
// itself scrolls (overflow-y-auto, see Layout.astro), which clips any
// absolute-positioned child that would overflow it, so a floating dropdown
// here gets cut off. Results just push the nav below it down instead.
export function SidebarSearch() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ResultTab>("people");
  const [people, setPeople] = useState<readonly PersonSearchResult[]>([]);
  const [movies, setMovies] = useState<readonly TrendingMovie[]>([]);
  const [tv, setTV] = useState<readonly TrendingMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMovie, setOpenMovie] = useState<TrendingMovie | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setPeople([]);
      setMovies([]);
      setTV([]);
      setError(null);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [peopleRes, moviesRes, tvRes] = await Promise.all([
          fetch(`/api/search-person?q=${encodeURIComponent(trimmed)}`),
          fetch(`/api/search-movie?q=${encodeURIComponent(trimmed)}`),
          fetch(`/api/search-tv?q=${encodeURIComponent(trimmed)}`),
        ]);
        if (!peopleRes.ok || !moviesRes.ok || !tvRes.ok) {
          throw new Error("request failed");
        }
        const peopleData = (await peopleRes.json()) as {
          results: readonly PersonSearchResult[];
        };
        const moviesData = (await moviesRes.json()) as {
          results: readonly TrendingMovie[];
        };
        const tvData = (await tvRes.json()) as {
          results: readonly TrendingMovie[];
        };
        setPeople(peopleData.results);
        setMovies(moviesData.results);
        setTV(tvData.results);
        setError(null);
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  function selectPerson(person: PersonSearchResult) {
    addRecentSearch(person);
    window.location.href = `/person/${person.id}`;
  }

  const trimmed = query.trim();

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search actors, movies, TV..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search actors, directors, movies, TV shows"
      />

      {trimmed && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant={tab === "people" ? "default" : "outline"}
              onClick={() => setTab("people")}
            >
              People{!loading && ` (${people.length})`}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "movies" ? "default" : "outline"}
              onClick={() => setTab("movies")}
            >
              Movies{!loading && ` (${movies.length})`}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "tv" ? "default" : "outline"}
              onClick={() => setTab("tv")}
            >
              TV{!loading && ` (${tv.length})`}
            </Button>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {loading && (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            )}

            {!loading && error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {!loading && !error && tab === "people" && (
              <>
                {people.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No people found.
                  </p>
                )}
                {people.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    onClick={() => selectPerson(person)}
                  />
                ))}
              </>
            )}

            {!loading && !error && tab === "movies" && (
              <>
                {movies.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No movies found.
                  </p>
                )}
                {movies.map((movie) => (
                  <MovieResultRow
                    key={movie.tmdbMovieId}
                    movie={movie}
                    onClick={() => setOpenMovie(movie)}
                  />
                ))}
              </>
            )}

            {!loading && !error && tab === "tv" && (
              <>
                {tv.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No TV shows found.
                  </p>
                )}
                {tv.map((show) => (
                  <MovieResultRow
                    key={show.tmdbMovieId}
                    movie={show}
                    onClick={() => setOpenMovie(show)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {openMovie && (
        <MovieDetailsDialog
          movieId={openMovie.tmdbMovieId}
          mediaType={openMovie.mediaType}
          open={openMovie !== null}
          onOpenChange={(o) => !o && setOpenMovie(null)}
        />
      )}
    </div>
  );
}
