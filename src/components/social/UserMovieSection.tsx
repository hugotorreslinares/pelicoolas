import { useEffect, useState } from "react";
import { BookmarkIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { tmdbImageUrl } from "@/lib/tmdb/image";

export interface ProfileMovie {
  readonly tmdbId: number;
  readonly title: string;
  readonly posterPath: string | null;
  readonly mediaType?: "movie" | "tv";
}

interface UserMovieSectionProps<M extends ProfileMovie> {
  readonly title: string;
  readonly userId: string;
  readonly subscribeFn: (
    userId: string,
    callback: (movies: readonly M[]) => void,
  ) => () => void;
  readonly onOpen: (movie: ProfileMovie) => void;
  /** Closed sections don't subscribe at all until opened — keeps the
   *  page's initial load cheap when a list is big and not the main draw
   *  (e.g. Watched). Favorites stays open — it's usually short and is the
   *  whole point of a shared profile. */
  readonly defaultOpen?: boolean;
  /** Row style (icon left, chevron-right, bordered divider) for grouping
   *  under a card heading (e.g. "X's Lists") instead of the plain
   *  chevron-down label used standalone (e.g. Favorites). */
  readonly icon?: typeof BookmarkIcon;
  readonly emptyLabel: string;
  readonly noPosterLabel: string;
}

export function UserMovieSection<M extends ProfileMovie>({
  title,
  userId,
  subscribeFn,
  onOpen,
  defaultOpen = false,
  icon: Icon,
  emptyLabel,
  noPosterLabel,
}: UserMovieSectionProps<M>) {
  const [open, setOpen] = useState(defaultOpen);
  const [movies, setMovies] = useState<readonly M[] | null>(null);

  useEffect(() => {
    if (!open) return;
    return subscribeFn(userId, setMovies);
  }, [subscribeFn, userId, open]);

  return (
    <div className={Icon ? "border-b last:border-b-0" : "space-y-2"}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={
          Icon
            ? "focus-ring flex w-full items-center gap-3 py-3 text-left"
            : "focus-ring flex w-full items-center gap-1.5 text-left text-sm font-semibold text-muted-foreground"
        }
        aria-expanded={open}
      >
        {Icon ? (
          <>
            <Icon className="size-5 shrink-0 text-primary" />
            <span className="flex-1 text-sm text-muted-foreground">
              {title}
              {movies !== null && ` (${movies.length})`}
            </span>
            <ChevronRightIcon
              className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
            />
          </>
        ) : (
          <>
            <ChevronDownIcon
              className={`size-4 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
            />
            {title}
            {movies !== null && ` (${movies.length})`}
          </>
        )}
      </button>

      {open && movies === null && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg" />
          ))}
        </div>
      )}

      {open && movies !== null && movies.length === 0 && (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}

      {open && movies !== null && movies.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {movies.map((movie) => (
            <button
              key={movie.tmdbId}
              type="button"
              onClick={() => onOpen(movie)}
              className="focus-ring card-elevated text-left"
              aria-label={`View details for ${movie.title}`}
            >
              {movie.posterPath ? (
                <img
                  src={tmdbImageUrl(movie.posterPath, 185)}
                  alt=""
                  loading="lazy"
                  className="aspect-[2/3] w-full rounded-lg border object-cover"
                />
              ) : (
                <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
                  {noPosterLabel}
                </div>
              )}
              <p className="mt-1 truncate text-xs font-medium">{movie.title}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
