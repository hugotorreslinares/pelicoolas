import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PersonCard } from "./PersonCard";
import { addRecentSearch, getRecentSearches } from "@/lib/recentSearches";
import type { PersonSearchResult } from "@/types/person";

const DEBOUNCE_MS = 350;

interface PersonSearchProps {
  readonly className?: string;
  readonly showRecent?: boolean;
}

export function PersonSearch({
  className = "mx-auto w-full max-w-xl space-y-4",
  showRecent: showRecentProp = true,
}: PersonSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly PersonSearchResult[]>([]);
  const [recent, setRecent] = useState<readonly PersonSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

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
        const res = await fetch(`/api/search-person?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) throw new Error("request failed");
        const data = (await res.json()) as { results: readonly PersonSearchResult[] };
        setResults(data.results);
        setError(null);
      } catch {
        setError("We couldn't load this filmography. Please try again.");
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

  const showRecent = showRecentProp && !query.trim() && recent.length > 0;

  return (
    <div className={className}>
      <Input
        placeholder="Search actor or director..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {!loading && error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && query.trim() && results.length === 0 && (
        <p className="text-sm text-muted-foreground">No people found. Try another name.</p>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((person) => (
            <PersonCard key={person.id} person={person} onClick={() => selectPerson(person)} />
          ))}
        </div>
      )}

      {showRecent && (
        <div className="text-left">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Recent searches</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {recent.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                variant="grid"
                onClick={() => selectPerson(person)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
