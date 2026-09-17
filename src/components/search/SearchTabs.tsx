import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PersonSearch } from "@/components/people/PersonSearch";
import { MovieSearch } from "@/components/movies/MovieSearch";
import { getDictionary, type Locale } from "@/i18n";
import type { TrendingMovie } from "@/types/movie";

type SearchMode = "people" | "movies" | "tv";

interface SearchTabsProps {
  readonly locale: Locale;
  readonly trendingMovies?: readonly TrendingMovie[];
  readonly trendingTV?: readonly TrendingMovie[];
}

export function SearchTabs({
  locale,
  trendingMovies = [],
  trendingTV = [],
}: SearchTabsProps) {
  const t = getDictionary(locale);
  const [mode, setMode] = useState<SearchMode>("people");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "people" ? "default" : "outline"}
          onClick={() => setMode("people")}
        >
          {t.search.actorsDirectors}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "movies" ? "default" : "outline"}
          onClick={() => setMode("movies")}
        >
          {t.search.movies}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "tv" ? "default" : "outline"}
          onClick={() => setMode("tv")}
        >
          {t.search.tvShows}
        </Button>
      </div>

      {mode === "people" && (
        <PersonSearch locale={locale} trendingMovies={trendingMovies} />
      )}
      {mode === "movies" && (
        <MovieSearch
          locale={locale}
          mediaType="movie"
          trendingMovies={trendingMovies}
        />
      )}
      {mode === "tv" && (
        <MovieSearch
          locale={locale}
          mediaType="tv"
          trendingMovies={trendingTV}
        />
      )}
    </div>
  );
}
