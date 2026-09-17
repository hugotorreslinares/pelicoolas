import { useEffect, useMemo, useRef, useState } from "react";
import {
  TrophyIcon,
  FilmIcon,
  BookmarkIcon,
  NetworkIcon,
  LayoutGridIcon,
  ListIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FollowedPersonCard } from "./FollowedPersonCard";
import { HomeHeroSlider } from "./HomeHeroSlider";
import { TrendingSlider } from "./TrendingSlider";
import { ShareBadgeButton } from "./ShareBadgeButton";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getLegacyWatchedIds,
  migrateWatchedToSeen,
  subscribeToFollowedPeople,
  subscribeToSeenMovies,
  subscribeToWatchlist,
} from "@/lib/firebase/firestore";
import { awardBadgeOnce, subscribeToBadges } from "@/lib/firebase/badges";
import { calculateAge } from "@/lib/age";
import { mapWithConcurrency } from "@/lib/concurrency";
import { fetchPersonData } from "@/lib/movieData";
import { getDictionary, type Locale } from "@/i18n";
import engagement from "@/config/engagement.json";
import type { FollowedPerson } from "@/types/filmography";
import type { TrendingMovie } from "@/types/movie";
import type { Badge as BadgeRecord } from "@/types/badges";

const FILMOGRAPHY_MILESTONES = [3, 10, 25];
const ALMOST_THERE_MAX_REMAINING = 3;
const HERO_MAX_PEOPLE = 15;

const VIEW_MODE_KEY = "filmographies-view-mode";
type ViewMode = "grid" | "list";

function readStoredViewMode(): ViewMode {
  if (typeof window === "undefined") return "grid";
  try {
    return window.localStorage.getItem(VIEW_MODE_KEY) === "list"
      ? "list"
      : "grid";
  } catch {
    return "grid";
  }
}

// Icons for dashboard.features (title/description come from the i18n
// dictionary, order-matched) — see t.dashboard.features.
const HOME_FEATURE_ICONS = [
  FilmIcon,
  BookmarkIcon,
  NetworkIcon,
  TrophyIcon,
] as const;

type SortMode = "recent" | "age" | "watched" | "watchlist";

interface PersonStats {
  readonly totalCount: number | null;
  readonly age: number | null;
  /** This person's full movie id list — needed to intersect against the
   *  global `seen` set for watchedCount. Null until fetchPersonData resolves. */
  readonly movieIds: readonly number[] | null;
}

interface DashboardProps {
  readonly locale: Locale;
  readonly trendingMovies?: readonly TrendingMovie[];
  readonly trendingTV?: readonly TrendingMovie[];
  /** Caps the followed-people grid (home uses this to stay short; /filmographies shows everyone). */
  readonly limit?: number;
}

export function Dashboard({
  locale,
  trendingMovies = [],
  trendingTV = [],
  limit,
}: DashboardProps) {
  const t = getDictionary(locale);
  const SORT_OPTIONS: readonly { value: SortMode; label: string }[] = [
    { value: "recent", label: t.dashboard.sortRecent },
    { value: "age", label: t.dashboard.sortAge },
    { value: "watched", label: t.dashboard.sortWatched },
    { value: "watchlist", label: t.dashboard.sortWatchlist },
  ];
  const { user, loading: authLoading } = useAuth();
  const [people, setPeople] = useState<readonly FollowedPerson[] | null>(null);
  const [statsById, setStatsById] = useState<Record<number, PersonStats>>({});
  const [seenIds, setSeenIds] = useState<ReadonlySet<number>>(new Set());
  const [watchlistCountById, setWatchlistCountById] = useState<
    Record<number, number>
  >({});
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode);
  const [badges, setBadges] = useState<readonly BadgeRecord[]>([]);
  // Firestore's onSnapshot can re-emit the followed-people list with a new
  // array reference on metadata-only changes (not just real add/remove),
  // re-running the totalCount/age effect below on every emission. Without
  // this, that meant re-fetching /api/person/{id} for every already-known
  // person each time — easily enough requests to hit the endpoint's rate
  // limit for anyone following more than a handful of people.
  const fetchedPersonIdsRef = useRef<Set<number>>(new Set());
  // Same idea, for the legacy watchedMovies → seen backfill (see
  // migrateWatchedToSeen) — once attempted per person, never again.
  const migratedPersonIdsRef = useRef<Set<number>>(new Set());
  const seenIdsRef = useRef(seenIds);
  seenIdsRef.current = seenIds;

  useEffect(() => {
    if (!user) {
      setPeople(null);
      return;
    }
    return subscribeToFollowedPeople(user.uid, setPeople);
  }, [user]);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // Best-effort persistence only.
    }
  }, [viewMode]);

  // The single "have I watched this" listener — each person's watchedCount
  // is this intersected with their own movieIds (see the useMemo below),
  // rather than a separate per-person subscription.
  useEffect(() => {
    if (!user) {
      setSeenIds(new Set());
      return;
    }
    return subscribeToSeenMovies(user.uid, setSeenIds);
  }, [user]);

  // Total filmography size + movie ids + age all come from the same TMDB
  // proxy call already used to render each person's progress bar.
  // fetchPersonData caches per person in localStorage (6h, matching the
  // server's own cache) — following 30-50 people otherwise means 30-50 real
  // requests on every single page load. Capped concurrency (not all at
  // once, not one at a time): a burst of 50+ simultaneous requests could
  // trip the server's per-IP rate limit, but awaiting them one by one would
  // make a big follow list load proportionally to its size instead of a
  // roughly constant handful of round-trips. Each card still fills in via
  // its own setStatsById call as soon as its request lands, so the page
  // renders progressively either way.
  useEffect(() => {
    if (!user || !people) return;
    const toFetch = people.filter(
      (person) => !fetchedPersonIdsRef.current.has(person.tmdbId),
    );
    for (const person of toFetch)
      fetchedPersonIdsRef.current.add(person.tmdbId);

    void mapWithConcurrency(toFetch, 6, async (person) => {
      try {
        const data = await fetchPersonData(person.tmdbId);
        if (!data) throw new Error("request failed");
        const age = data.profile.birthday
          ? calculateAge(data.profile.birthday)
          : null;
        const movieIds = data.movies.map((m) => m.tmdbMovieId);
        setStatsById((prev) => ({
          ...prev,
          [person.tmdbId]: { totalCount: data.movies.length, age, movieIds },
        }));

        if (!migratedPersonIdsRef.current.has(person.tmdbId)) {
          migratedPersonIdsRef.current.add(person.tmdbId);
          void getLegacyWatchedIds(user.uid, person.tmdbId).then(
            (legacyIds) => {
              if (legacyIds.length === 0) return;
              void migrateWatchedToSeen(
                user.uid,
                legacyIds,
                data.movies,
                seenIdsRef.current,
              );
            },
          );
        }
      } catch {
        setStatsById((prev) => ({
          ...prev,
          [person.tmdbId]: {
            totalCount: prev[person.tmdbId]?.totalCount ?? 0,
            age: null,
            movieIds: prev[person.tmdbId]?.movieIds ?? [],
          },
        }));
      }
    });
  }, [user, people]);

  const watchedCountById = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const person of people ?? []) {
      const movieIds = statsById[person.tmdbId]?.movieIds;
      if (!movieIds) continue;
      counts[person.tmdbId] = movieIds.filter((id) => seenIds.has(id)).length;
    }
    return counts;
  }, [people, statsById, seenIds]);

  useEffect(() => {
    if (!user) return;
    return subscribeToWatchlist(user.uid, (movies) => {
      const counts: Record<number, number> = {};
      for (const movie of movies) {
        if (movie.sourcePersonId == null) continue;
        counts[movie.sourcePersonId] = (counts[movie.sourcePersonId] ?? 0) + 1;
      }
      setWatchlistCountById(counts);
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setBadges([]);
      return;
    }
    return subscribeToBadges(user.uid, setBadges);
  }, [user]);

  const completedPeople = useMemo(
    () =>
      (people ?? []).filter((person) => {
        const stats = statsById[person.tmdbId];
        return (
          stats?.totalCount != null &&
          stats.totalCount > 0 &&
          watchedCountById[person.tmdbId] === stats.totalCount
        );
      }),
    [people, statsById, watchedCountById],
  );

  // Re-checks on every stats change, but awardBadgeOnce is a no-op past the
  // first time each one is earned, so this is cheap to call unconditionally.
  useEffect(() => {
    if (!user || completedPeople.length === 0) return;

    if (engagement.badges.filmographyMilestones) {
      for (const threshold of FILMOGRAPHY_MILESTONES) {
        if (completedPeople.length < threshold) continue;
        void awardBadgeOnce(user.uid, {
          id: `filmography-milestone-${threshold}`,
          type: "filmography-milestone",
          label: `${threshold} Filmographies Complete`,
          description: `Completed ${threshold} followed filmographies.`,
        });
      }
    }

    if (engagement.badges.actorDirectorMilestones) {
      const hasCompletedActor = completedPeople.some(
        (p) => p.knownForDepartment !== "Directing",
      );
      const hasCompletedDirector = completedPeople.some(
        (p) => p.knownForDepartment === "Directing",
      );
      if (hasCompletedActor) {
        void awardBadgeOnce(user.uid, {
          id: "actor-first-complete",
          type: "actor-milestone",
          label: "Leading Role",
          description: "Completed your first actor's filmography.",
        });
      }
      if (hasCompletedDirector) {
        void awardBadgeOnce(user.uid, {
          id: "director-first-complete",
          type: "director-milestone",
          label: "Director's Cut",
          description: "Completed your first director's filmography.",
        });
      }
    }
  }, [user, completedPeople]);

  const almostThere = useMemo(() => {
    if (!people) return [];
    return people
      .map((person) => {
        const stats = statsById[person.tmdbId];
        if (stats?.totalCount == null || stats.totalCount === 0) return null;
        const remaining =
          stats.totalCount - (watchedCountById[person.tmdbId] ?? 0);
        if (remaining <= 0 || remaining > ALMOST_THERE_MAX_REMAINING)
          return null;
        return { person, remaining };
      })
      .filter((entry) => entry !== null)
      .sort((a, b) => a.remaining - b.remaining);
  }, [people, statsById, watchedCountById]);

  const sortedPeople = useMemo(() => {
    if (!people || sortMode === "recent") return people;
    return [...people].sort((a, b) => {
      if (sortMode === "watchlist") {
        return (
          (watchlistCountById[b.tmdbId] ?? 0) -
          (watchlistCountById[a.tmdbId] ?? 0)
        );
      }
      if (sortMode === "watched") {
        return (
          (watchedCountById[b.tmdbId] ?? 0) - (watchedCountById[a.tmdbId] ?? 0)
        );
      }
      // age: people without a known birthday sort to the end, regardless of direction.
      const ageA = statsById[a.tmdbId]?.age;
      const ageB = statsById[b.tmdbId]?.age;
      if (ageA == null && ageB == null) return 0;
      if (ageA == null) return 1;
      if (ageB == null) return -1;
      return ageB - ageA;
    });
  }, [people, sortMode, statsById, watchlistCountById, watchedCountById]);

  // The photo-wall hero: most-completed filmographies first, capped short —
  // it's a showcase, not the full list (that's the grid below it).
  const heroPeople = useMemo(() => {
    if (!people) return [];
    return [...people]
      .sort((a, b) => {
        const totalA = statsById[a.tmdbId]?.totalCount;
        const totalB = statsById[b.tmdbId]?.totalCount;
        const ratioA = totalA ? (watchedCountById[a.tmdbId] ?? 0) / totalA : 0;
        const ratioB = totalB ? (watchedCountById[b.tmdbId] ?? 0) / totalB : 0;
        return ratioB - ratioA;
      })
      .slice(0, HERO_MAX_PEOPLE);
  }, [people, statsById, watchedCountById]);

  // A page-level h1 that renders in every state (including the loading
  // skeleton, which is what search engines and pre-hydration crawlers see)
  // rather than only in a client-resolved branch — axe-core's
  // page-has-heading-one flagged this when it scanned before Firebase's
  // async auth check resolved.
  const heading = t.dashboard.heading;

  // Shown in every state (signed out, no follows yet, full dashboard) —
  // recommend/watchlist/watched need a signed-in user, so this can't live
  // only in the signed-out WelcomeHero branch the way it used to.
  const trendingSection = (
    <>
      <TrendingSlider
        items={trendingMovies}
        mediaType="movie"
        heading={t.dashboard.trendingMovies}
      />
      <TrendingSlider
        items={trendingTV}
        mediaType="tv"
        heading={t.dashboard.trendingTV}
      />
    </>
  );

  if (authLoading || (user && people === null)) {
    return (
      <div className="space-y-2">
        <h1 className="sr-only">{heading}</h1>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-12">
        <HomeHeroSlider people={[]} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.dashboard.features.map(({ title, description }, i) => {
            const Icon = HOME_FEATURE_ICONS[i];
            return (
              <div key={title} className="card-elevated rounded-lg border p-4">
                <Icon className="mb-2 size-5 text-primary" />
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            );
          })}
        </div>

        {trendingSection}
      </div>
    );
  }

  if (!people) return null;

  if (people.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="sr-only">{heading}</h1>
        <HomeHeroSlider people={heroPeople} />
        <div className="space-y-3 text-center">
          <p className="text-muted-foreground">{t.dashboard.findPerson}</p>
          <Button render={<a href="/search" />}>{t.common.search}</Button>
        </div>
        {trendingSection}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HomeHeroSlider people={heroPeople} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{heading}</h1>
        {engagement.wrapped && (
          <Button size="sm" variant="outline" render={<a href="/wrapped" />}>
            {t.dashboard.yourYearInFilm}
          </Button>
        )}
      </div>

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <div key={badge.id} className="flex items-center gap-0.5">
              <Badge variant="secondary" title={badge.description}>
                <TrophyIcon data-icon="inline-start" />
                {badge.label}
              </Badge>
              <ShareBadgeButton badge={badge} />
            </div>
          ))}
        </div>
      )}

      {engagement.nudges.dashboardAlmostThere && almostThere.length > 0 && (
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="mb-2 text-sm font-medium">{t.dashboard.almostThere}</p>
          <ul className="space-y-1 text-sm">
            {almostThere.map(({ person, remaining }) => (
              <li key={person.tmdbId}>
                <a
                  href={`/person/${person.tmdbId}`}
                  className="focus-ring hover:underline"
                >
                  {person.name}
                </a>{" "}
                <span className="text-muted-foreground">
                  {t.dashboard.moviesToComplete(remaining)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {t.dashboard.peopleFollowing(people.length)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {SORT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={sortMode === option.value ? "default" : "outline"}
              onClick={() => setSortMode(option.value)}
            >
              {option.label}
            </Button>
          ))}
          {!limit && (
            <div className="flex gap-1 rounded-full border p-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon-sm"
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      aria-label={t.common.gridView}
                      aria-pressed={viewMode === "grid"}
                      onClick={() => setViewMode("grid")}
                    />
                  }
                >
                  <LayoutGridIcon />
                </TooltipTrigger>
                <TooltipContent>{t.common.gridView}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="icon-sm"
                      variant={viewMode === "list" ? "default" : "ghost"}
                      aria-label={t.common.listView}
                      aria-pressed={viewMode === "list"}
                      onClick={() => setViewMode("list")}
                    />
                  }
                >
                  <ListIcon />
                </TooltipTrigger>
                <TooltipContent>{t.common.listView}</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      <div
        className={
          !limit && viewMode === "list"
            ? "space-y-2"
            : "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
        }
      >
        {(limit ? sortedPeople!.slice(0, limit) : sortedPeople!).map(
          (person) => (
            <FollowedPersonCard
              key={person.tmdbId}
              person={person}
              watchedCount={watchedCountById[person.tmdbId] ?? 0}
              totalCount={statsById[person.tmdbId]?.totalCount ?? null}
              age={statsById[person.tmdbId]?.age ?? null}
              layout={!limit ? viewMode : "grid"}
            />
          ),
        )}
      </div>

      {limit && people.length > limit && (
        <div className="text-center">
          <Button variant="outline" render={<a href="/filmographies" />}>
            {t.dashboard.viewAll(people.length)}
          </Button>
        </div>
      )}

      {trendingSection}
    </div>
  );
}
