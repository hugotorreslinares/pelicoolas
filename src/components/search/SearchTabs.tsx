import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PersonSearch } from "@/components/people/PersonSearch";
import { MovieSearch } from "@/components/movies/MovieSearch";

type SearchMode = "people" | "movies";

export function SearchTabs() {
  const [mode, setMode] = useState<SearchMode>("people");

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-2">
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
      </div>

      {mode === "people" ? <PersonSearch /> : <MovieSearch />}
    </div>
  );
}
