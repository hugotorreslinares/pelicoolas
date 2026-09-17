import { Button } from "@/components/ui/button";
import { getDictionary, type Locale } from "@/i18n";
import type { FilmographyFilter } from "@/types/filmography";

interface FilmographyFiltersProps {
  readonly locale: Locale;
  readonly value: FilmographyFilter;
  readonly onChange: (filter: FilmographyFilter) => void;
}

export function FilmographyFilters({
  locale,
  value,
  onChange,
}: FilmographyFiltersProps) {
  const t = getDictionary(locale);
  const FILTERS: readonly { value: FilmographyFilter; label: string }[] = [
    { value: "all", label: t.filmography.filterAll },
    { value: "unwatched", label: t.filmography.filterUnwatched },
    { value: "watched", label: t.filmography.filterWatched },
  ];

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
