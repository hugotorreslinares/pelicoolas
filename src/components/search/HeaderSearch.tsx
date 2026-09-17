import { useEffect, useRef, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonCard } from "@/components/people/PersonCard";
import { MovieResultRow } from "@/components/movies/MovieResultRow";
import { MovieDetailsDialog } from "@/components/filmography/MovieDetailsDialog";
import { addRecentSearch } from "@/lib/recentSearches";
import { cn } from "@/lib/utils";
import { getDictionary, type Locale } from "@/i18n";
import type { PersonSearchResult } from "@/types/person";
import type { TrendingMovie } from "@/types/movie";

const DEBOUNCE_MS = 350;

type ResultTab = "people" | "movies" | "tv";

interface HeaderSearchProps {
  readonly locale: Locale;
  /** Matches the other nav items' active/inactive pill styling. */
  readonly className?: string;
}

// Quick search dropdown from the header's search icon — searches people and
// movies in parallel from a single query, shown in tabs so results never
// mix. /search (PersonSearch/MovieSearch/SearchTabs) stays as its own page
// for recent searches and as a plain fallback; this is the fast path.
export function HeaderSearch({ locale, className }: HeaderSearchProps) {
  const t = getDictionary(locale);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ResultTab>("people");
  const [people, setPeople] = useState<readonly PersonSearchResult[]>([]);
  const [movies, setMovies] = useState<readonly TrendingMovie[]>([]);
  const [tv, setTV] = useState<readonly TrendingMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Full result object, not just an id — needs mediaType to open the right
  // MovieDetailsDialog fetch (movie vs tv).
  const [openMovie, setOpenMovie] = useState<TrendingMovie | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    function handlePointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setPeople([]);
      setMovies([]);
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
        setError(t.search.somethingWentWrong);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  function close() {
    setOpen(false);
    setQuery("");
    setPeople([]);
    setMovies([]);
    setTV([]);
    setTab("people");
  }

  function selectPerson(person: PersonSearchResult) {
    addRecentSearch(person);
    window.location.href = `/person/${person.id}`;
  }

  const trimmed = query.trim();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t.search.searchAria}
        title={t.search.searchAria}
        className={cn(
          "focus-ring flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          className,
        )}
      >
        <SearchIcon className="size-4" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg sm:w-96">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              placeholder={t.search.searchPlaceholderAll}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              aria-label={t.search.closeSearch}
              onClick={close}
            >
              <XIcon />
            </Button>
          </div>

          {trimmed && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={tab === "people" ? "default" : "outline"}
                onClick={() => setTab("people")}
              >
                {t.search.people(people.length, loading)}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tab === "movies" ? "default" : "outline"}
                onClick={() => setTab("movies")}
              >
                {t.search.moviesTab(movies.length, loading)}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tab === "tv" ? "default" : "outline"}
                onClick={() => setTab("tv")}
              >
                {t.search.tvTab(tv.length, loading)}
              </Button>
            </div>
          )}

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

            {!loading && !error && trimmed && tab === "people" && (
              <>
                {people.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t.search.noPeopleFoundShort}
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

            {!loading && !error && trimmed && tab === "movies" && (
              <>
                {movies.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t.search.noMoviesFoundShort}
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

            {!loading && !error && trimmed && tab === "tv" && (
              <>
                {tv.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t.search.noShowsFoundShort}
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
