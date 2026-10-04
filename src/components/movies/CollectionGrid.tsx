import { useEffect, useState } from "react";
import { MovieActions } from "./MovieActions";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/hooks/useAuth";
import { useMovieActionState } from "@/lib/hooks/useMovieActionState";
import { subscribeToSeenMovies } from "@/lib/firebase/firestore";
import { awardBadgeOnce } from "@/lib/firebase/badges";
import { todayIso } from "@/lib/releaseChallenge";
import { tmdbImageUrl, tmdbWidthSrcSet } from "@/lib/tmdb/image";
import { getDictionary, type Locale } from "@/i18n";
import engagement from "@/config/engagement.json";
import type { CollectionPart } from "@/lib/tmdb/collections";

interface CollectionGridProps {
  readonly locale: Locale;
  readonly collectionId: number;
  readonly collectionName: string;
  readonly parts: readonly CollectionPart[];
}

function PartCard({
  part,
  locale,
  released,
}: {
  readonly part: CollectionPart;
  readonly locale: Locale;
  readonly released: boolean;
}) {
  const t = getDictionary(locale).collection;
  const { watched, inWatchlist, ready, toggleWatched, toggleWatchlist } =
    useMovieActionState(part);
  return (
    <div>
      <div className="card-elevated relative overflow-hidden rounded-lg border">
        <a href={`/movie/${part.tmdbMovieId}`} className="focus-ring block">
          {part.posterPath ? (
            <img
              src={tmdbImageUrl(part.posterPath, 342)}
              srcSet={tmdbWidthSrcSet(part.posterPath, [185, 342])}
              sizes="(min-width: 768px) 16vw, (min-width: 640px) 25vw, 33vw"
              alt=""
              loading="lazy"
              className={`aspect-[2/3] w-full bg-muted object-cover ${watched ? "opacity-50" : ""}`}
            />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center bg-muted p-2 text-center text-xs text-muted-foreground">
              {part.title}
            </div>
          )}
        </a>
        {released && (
          <MovieActions
            movie={part}
            watched={watched}
            inWatchlist={inWatchlist}
            onToggleWatched={toggleWatched}
            onToggleWatchlist={toggleWatchlist}
            disabled={!ready}
          />
        )}
        {!released && (
          <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-semibold shadow">
            {t.comingSoon}
          </span>
        )}
      </div>
      <p className="mt-1 line-clamp-2 text-sm leading-tight font-medium">
        {part.title}
      </p>
      <p className="text-xs text-muted-foreground">
        {part.releaseYear ?? t.unknownYear}
      </p>
    </div>
  );
}

export function CollectionGrid({
  locale,
  collectionId,
  collectionName,
  parts,
}: CollectionGridProps) {
  const t = getDictionary(locale).collection;
  const { user } = useAuth();
  const [seenIds, setSeenIds] = useState<ReadonlySet<number> | null>(null);
  const today = todayIso();

  useEffect(() => {
    if (!user) {
      setSeenIds(null);
      return;
    }
    return subscribeToSeenMovies(user.uid, setSeenIds);
  }, [user]);

  const releasedParts = parts.filter(
    (p) => p.releaseDate !== null && p.releaseDate <= today,
  );
  const watchedCount = seenIds
    ? releasedParts.filter((p) => seenIds.has(p.tmdbMovieId)).length
    : 0;
  const complete =
    releasedParts.length >= 2 && watchedCount === releasedParts.length;

  useEffect(() => {
    if (!user || !complete || !engagement.badges.collectionComplete) return;
    void awardBadgeOnce(user.uid, {
      id: `collection-complete-${collectionId}`,
      type: "collection-complete",
      label: `Completed ${collectionName}`,
      description: `Watched every movie in the ${collectionName}.`,
      collectionName,
    });
  }, [user, complete, collectionId, collectionName]);

  return (
    <div className="space-y-6">
      {user && seenIds && releasedParts.length > 0 && (
        <div className="space-y-1.5 rounded-lg border bg-muted/40 p-3">
          <p className="text-sm font-medium">
            {t.progress(watchedCount, releasedParts.length)}
          </p>
          <Progress value={(watchedCount / releasedParts.length) * 100} />
          {complete && <p className="text-sm text-primary">{t.complete}</p>}
        </div>
      )}
      <div className="stagger-in grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {parts.map((p) => (
          <PartCard
            key={p.tmdbMovieId}
            part={p}
            locale={locale}
            released={p.releaseDate !== null && p.releaseDate <= today}
          />
        ))}
      </div>
    </div>
  );
}
