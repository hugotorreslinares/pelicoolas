import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PersonSearch } from "@/components/people/PersonSearch";
import { MovieSearch } from "@/components/movies/MovieSearch";
import type { TrendingMovie } from "@/types/movie";

type SearchMode = "people" | "movies" | "tv";

interface SearchTabsProps {
  readonly trendingMovies?: readonly TrendingMovie[];
  readonly trendingTV?: readonly TrendingMovie[];
}

export function SearchTabs({
  trendingMovies = [],
  trendingTV = [],
}: SearchTabsProps) {
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
          Actors & directors
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "movies" ? "default" : "outline"}
          onClick={() => setMode("movies")}
        >
          Movies
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "tv" ? "default" : "outline"}
          onClick={() => setMode("tv")}
        >
          TV shows
        </Button>
      </div>

      {mode === "people" && <PersonSearch trendingMovies={trendingMovies} />}
      {mode === "movies" && (
        <MovieSearch mediaType="movie" trendingMovies={trendingMovies} />
      )}
      {mode === "tv" && (
        <MovieSearch mediaType="tv" trendingMovies={trendingTV} />
      )}
    </div>
  );
}
