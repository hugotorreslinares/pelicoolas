import { useEffect, useMemo, useState } from "react";
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
      <div>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {name}'s cinematic identity
        </p>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>🎬 {lists.seen.length} watched</span>
          <span>🔖 {lists.watchlist.length} watchlist</span>
          <span>❤️ {recommendations.length} favorites</span>
        </div>
      </div>

      {dna.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Movie DNA</p>
          {dna.map((g) => (
            <div key={g.genreId} className="flex items-center gap-2">
              <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">
                {genreName(g.genreId) ?? "Other"}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${maxCount === 0 ? 0 : (g.count / maxCount) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Favorites</p>
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
