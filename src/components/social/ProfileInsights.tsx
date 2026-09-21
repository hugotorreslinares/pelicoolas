import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarIcon,
  FlameIcon,
  ShareIcon,
  SparklesIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfileLists } from "@/lib/hooks/useProfileLists";
import { useTopPeople } from "@/lib/hooks/useTopPeople";
import { subscribeToRecommendations } from "@/lib/firebase/firestore";
import {
  computeInsights,
  latestRecommendation,
  MIN_MOVIES_FOR_INSIGHTS,
} from "@/lib/insights";
import { profileUrl, shareContent } from "@/lib/shareProfile";
import { tmdbImageUrl } from "@/lib/tmdb/image";
import { getDictionary, type Locale } from "@/i18n";
import type { RecommendedMovie } from "@/types/filmography";

interface ProfileInsightsProps {
  readonly locale: Locale;
  readonly userId: string;
  readonly displayName: string | null;
  /** Owner sees "your" copy and the share button; followers see a read-only view. */
  readonly isOwner: boolean;
  readonly onOpenMovie: (movie: {
    tmdbId: number;
    mediaType?: "movie" | "tv";
  }) => void;
}

const MEDAL_CLASSES = [
  "bg-amber-400 text-amber-950",
  "bg-zinc-300 text-zinc-800",
  "bg-orange-400 text-orange-950",
] as const;

// "Movie profile": stats derived purely from what's already stored per
// watched movie (year, rating, genres, watchedAt) plus followed people and
// the latest favorite. Sharing sends the profile link, whose preview image
// (see /api/og/profile) carries the numbers to people who haven't joined.
export function ProfileInsights({
  locale,
  userId,
  displayName,
  isOwner,
  onOpenMovie,
}: ProfileInsightsProps) {
  const t = getDictionary(locale).insights;
  const lists = useProfileLists(userId);
  const topPeople = useTopPeople(lists);
  const [sharing, setSharing] = useState(false);
  const [recommendations, setRecommendations] = useState<
    readonly RecommendedMovie[] | null
  >(null);

  useEffect(
    () => subscribeToRecommendations(userId, setRecommendations),
    [userId],
  );

  const insights = useMemo(
    () => (lists ? computeInsights(lists.seen) : null),
    [lists],
  );
  const latest = useMemo(
    () => (recommendations ? latestRecommendation(recommendations) : null),
    [recommendations],
  );

  if (!insights) return null;

  if (insights.total < MIN_MOVIES_FOR_INSIGHTS) {
    if (!isOwner) return null;
    return (
      <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        {t.notEnough(MIN_MOVIES_FOR_INSIGHTS)}
      </div>
    );
  }

  const monthName = (month: number) =>
    new Intl.DateTimeFormat(locale, { month: "long" }).format(
      new Date(2000, month, 1),
    );

  const roleLabel = (department: string | null) =>
    department === "Directing"
      ? t.roleDirecting
      : department === "Acting"
        ? t.roleActing
        : (department ?? "");

  async function share() {
    setSharing(true);
    const result = await shareContent(
      profileUrl(userId),
      "Pelicoolas",
      t.shareText(displayName ?? "Pelicoolas", insights?.total ?? 0),
    );
    setSharing(false);
    if (result === "shared") toast.success(t.shared);
    else if (result === "copied") toast.success(t.copied);
    else if (result === "failed") toast.error(t.shareFailed);
  }

  const personality =
    (insights.topGenreId !== null && t.personality[insights.topGenreId]) ||
    t.personalityDefault;

  return (
    <section className="card-elevated relative overflow-hidden rounded-2xl border">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-primary/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-fuchsia-500/15 blur-3xl"
      />

      <div className="relative space-y-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {isOwner ? t.heading : t.headingOther(displayName ?? t.thisUser)}
            </p>
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-primary-foreground shadow-md">
                <SparklesIcon className="size-5" />
              </div>
              <p className="text-2xl leading-tight font-extrabold tracking-tight">
                <span className="text-base font-medium text-muted-foreground">
                  {isOwner ? t.personalityLabel : t.personalityLabelOther}
                </span>
                <br />
                <span className="capitalize">{personality}</span>
              </p>
            </div>
          </div>
          {isOwner && (
            <Button size="sm" onClick={share} disabled={sharing}>
              <ShareIcon />
              {t.share}
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {insights.averageRating !== null && (
            <div className="rounded-xl border bg-amber-500/10 p-3.5">
              <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500">
                <StarIcon className="size-4" />
              </div>
              <p className="text-3xl leading-none font-extrabold tabular-nums">
                {insights.averageRating.toFixed(1)}
              </p>
              <p className="mt-1 text-xs font-medium">{t.averageRating}</p>
              <p className="text-xs text-muted-foreground">
                {t.averageRatingHint}
              </p>
            </div>
          )}
          {insights.bestYear && (
            <div className="rounded-xl border bg-violet-500/10 p-3.5">
              <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-violet-500/20 text-violet-500">
                <CalendarIcon className="size-4" />
              </div>
              <p className="text-3xl leading-none font-extrabold tabular-nums">
                {insights.bestYear.year}
              </p>
              <p className="mt-1 text-xs font-medium">{t.bestYear}</p>
              <p className="text-xs text-muted-foreground">
                {t.bestYearBody(
                  insights.bestYear.count,
                  insights.bestYear.topTitle,
                )}
              </p>
            </div>
          )}
          {insights.busiestMonth && (
            <div className="rounded-xl border bg-rose-500/10 p-3.5">
              <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-500">
                <FlameIcon className="size-4" />
              </div>
              <p className="text-3xl leading-none font-extrabold capitalize">
                {monthName(insights.busiestMonth.month)}
              </p>
              <p className="mt-1 text-xs font-medium">{t.busiestMonth}</p>
              <p className="text-xs text-muted-foreground">
                {t.busiestMonthBody(insights.busiestMonth.count)}
              </p>
            </div>
          )}
        </div>

        {topPeople === null ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : (
          topPeople.length > 0 && (
            <div className="space-y-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <UsersIcon className="size-4 text-primary" />
                {t.topPeople}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {topPeople.map(({ person, watched, watchlist }, index) => (
                  <a
                    key={person.tmdbId}
                    href={`/person/${person.tmdbId}`}
                    className="focus-ring group flex flex-col items-center gap-1.5 rounded-xl border bg-background/60 p-3 text-center transition-colors hover:bg-muted"
                  >
                    <div className="relative">
                      {person.profilePath ? (
                        <img
                          src={tmdbImageUrl(person.profilePath, 185)}
                          alt=""
                          loading="lazy"
                          className="size-16 rounded-full object-cover ring-2 ring-primary/70 transition-transform group-hover:scale-105 sm:size-20"
                        />
                      ) : (
                        <div className="flex size-16 items-center justify-center rounded-full bg-muted text-xl font-bold ring-2 ring-primary/70 sm:size-20">
                          {person.name.slice(0, 1)}
                        </div>
                      )}
                      <span
                        className={`absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full text-xs font-extrabold shadow ${MEDAL_CLASSES[index]}`}
                      >
                        {index + 1}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-tight font-semibold">
                      {person.name}
                    </p>
                    <p className="text-[11px] tracking-wide text-primary uppercase">
                      {roleLabel(person.knownForDepartment)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.topPeopleCounts(watched, watchlist)}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )
        )}

        {latest && (
          <button
            type="button"
            onClick={() => onOpenMovie(latest)}
            className="focus-ring flex w-full items-center gap-3 rounded-xl border bg-background/60 p-3 text-left transition-colors hover:bg-muted"
          >
            {latest.posterPath ? (
              <img
                src={tmdbImageUrl(latest.posterPath, 185)}
                alt=""
                loading="lazy"
                className="aspect-[2/3] w-14 shrink-0 rounded-lg object-cover shadow-md"
              />
            ) : (
              <div className="aspect-[2/3] w-14 shrink-0 rounded-lg bg-muted" />
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-widest text-primary uppercase">
                {t.latestRecommendation}
              </p>
              <p className="truncate text-base font-bold">{latest.title}</p>
              <p className="text-xs text-muted-foreground">
                {[
                  latest.releaseYear,
                  latest.voteAverage
                    ? `★ ${latest.voteAverage.toFixed(1)}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </button>
        )}
      </div>
    </section>
  );
}
