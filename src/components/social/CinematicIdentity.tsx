import { useEffect, useMemo, useState } from "react";
import { FilmIcon, BookmarkIcon, HeartIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfileLists } from "@/lib/hooks/useProfileLists";
import { subscribeToRecommendations } from "@/lib/firebase/firestore";
import { computeGenreDNA } from "@/lib/compatibility";
import { genreName } from "@/lib/tmdb/genres";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import type { RecommendedMovie } from "@/types/filmography";

const FAVORITES_LIMIT = 4;

interface CinematicIdentityProps {
  readonly userId: string;
  readonly displayName: string | null;
  readonly onOpenMovie: (movie: {
    tmdbId: number;
    mediaType?: "movie" | "tv";
  }) => void;
}

// A shareable "cinematic identity" card for a profile — total
// watched/watchlist/favorites, a genre-DNA bar chart, and a favorites
// poster row. Shown only where the viewer can already see watched/watchlist
// (same gate as CompatibilitySection), since watched/watchlist counts feed
// straight into it.
export function CinematicIdentity({
  userId,
  displayName,
  onOpenMovie,
}: CinematicIdentityProps) {
  const lists = useProfileLists(userId);
  const [recommendations, setRecommendations] = useState<
    readonly RecommendedMovie[] | null
  >(null);

  useEffect(
    () => subscribeToRecommendations(userId, setRecommendations),
    [userId],
  );

  const dna = useMemo(() => (lists ? computeGenreDNA(lists, 5) : []), [lists]);
  const maxCount = dna[0]?.count ?? 0;

  if (!lists || recommendations === null) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  const name = displayName ?? "This user";
  const hasAnything =
    lists.seen.length > 0 ||
    lists.watchlist.length > 0 ||
    recommendations.length > 0;
  if (!hasAnything) return null;

  return (
    <div className="card-elevated space-y-4 rounded-lg border p-4">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {name}'s cinematic identity
      </p>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-2 rounded-lg border p-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <FilmIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-lg leading-tight font-bold">
              {lists.seen.length}
            </p>
            <p className="truncate text-xs text-muted-foreground">watched</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <BookmarkIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-lg leading-tight font-bold">
              {lists.watchlist.length}
            </p>
            <p className="truncate text-xs text-muted-foreground">watchlist</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
            <HeartIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-lg leading-tight font-bold">
              {recommendations.length}
            </p>
            <p className="truncate text-xs text-muted-foreground">favorites</p>
          </div>
        </div>
      </div>

      {dna.length > 0 && (
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium">Movie DNA</p>
            <p className="text-xs text-muted-foreground">
              Based on your {lists.seen.length + lists.watchlist.length} movies
            </p>
          </div>
          {dna.map((g) => {
            const pct =
              maxCount === 0 ? 0 : Math.round((g.count / maxCount) * 100);
            return (
              <div key={g.genreId} className="flex items-center gap-2">
                <span className="w-20 shrink-0 truncate text-xs text-muted-foreground">
                  {genreName(g.genreId) ?? "Other"}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-9 shrink-0 text-right text-xs text-muted-foreground">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Favorites</p>
            <a
              href={`/board/${userId}`}
              className="focus-ring text-xs font-medium text-primary hover:underline"
            >
              See all
            </a>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {recommendations.slice(0, FAVORITES_LIMIT).map((m) => (
              <button
                key={`${m.mediaType ?? "movie"}-${m.tmdbId}`}
                type="button"
                onClick={() => onOpenMovie(m)}
                className="focus-ring"
                aria-label={`View details for ${m.title}`}
              >
                {m.posterPath ? (
                  <img
                    src={tmdbImageUrl(m.posterPath, 185)}
                    alt=""
                    loading="lazy"
                    className="aspect-[2/3] w-full rounded-lg border object-cover"
                  />
                ) : (
                  <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
                    No image
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
