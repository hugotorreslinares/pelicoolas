import { Button } from "@/components/ui/button";
import type { FilmographyFilter } from "@/types/filmography";

interface FilmographyFiltersProps {
  readonly value: FilmographyFilter;
  readonly onChange: (filter: FilmographyFilter) => void;
}

const FILTERS: readonly { value: FilmographyFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unwatched", label: "Unwatched" },
  { value: "watched", label: "Watched" },
];

export function FilmographyFilters({ value, onChange }: FilmographyFiltersProps) {
  return (
    <div className="flex gap-2">
      {FILTERS.map((f) => (
        <Button
          key={f.value}
          size="sm"
          variant={value === f.value ? "default" : "outline"}
          onClick={() => onChange(f.value)}
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}
