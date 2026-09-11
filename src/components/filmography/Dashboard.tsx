import { useEffect, useMemo, useRef, useState } from "react";
import { TrophyIcon, FilmIcon, BookmarkIcon, NetworkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FollowedPersonCard } from "./FollowedPersonCard";
import { FollowedPeopleHero } from "./FollowedPeopleHero";
import { TrendingMovies } from "./TrendingMovies";
import { ShareBadgeButton } from "./ShareBadgeButton";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  subscribeToFollowedPeople,
  subscribeToWatchedMovies,
  subscribeToWatchlist,
} from "@/lib/firebase/firestore";
import { awardBadgeOnce, subscribeToBadges } from "@/lib/firebase/badges";
import { calculateAge } from "@/lib/age";
import { fetchPersonData } from "@/lib/movieData";
import engagement from "@/config/engagement.json";
import type { FollowedPerson } from "@/types/filmography";
import type { TrendingMovie } from "@/types/movie";
import type { Badge as BadgeRecord } from "@/types/badges";

const FILMOGRAPHY_MILESTONES = [3, 10, 25];
const ALMOST_THERE_MAX_REMAINING = 3;

const HOME_FEATURES = [
  {
    icon: FilmIcon,
    title: "Filmographies",
    description: "Track movie-by-movie progress for every person you follow.",
  },
  {
    icon: BookmarkIcon,
    title: "Watchlist",
    description: "Save what you want to see, filterable by genre.",
  },
  {
    icon: NetworkIcon,
    title: "Connections",
    description: "Explore how movies and people relate to each other.",
  },
  {
    icon: TrophyIcon,
    title: "Badges",
    description: "Earn and share badges as you complete filmographies.",
  },
] as const;

type SortMode = "recent" | "age" | "watched" | "watchlist";

const SORT_OPTIONS: readonly { value: SortMode; label: string }[] = [
  { value: "recent", label: "Recently followed" },
  { value: "age", label: "Age" },
  { value: "watched", label: "Most watched" },
  { value: "watchlist", label: "Watchlist size" },
];

interface PersonStats {
  readonly watchedCount: number;
  readonly totalCount: number | null;
  readonly age: number | null;
}

interface DashboardProps {
  readonly trendingMovies?: readonly TrendingMovie[];
  /** Caps the followed-people grid (home uses this to stay short; /filmographies shows everyone). */
  readonly limit?: number;
}

export function Dashboard({ trendingMovies = [], limit }: DashboardProps) {
  const { user, loading: authLoading } = useAuth();
  const [people, setPeople] = useState<readonly FollowedPerson[] | null>(null);
  const [statsById, setStatsById] = useState<Record<number, PersonStats>>({});
  const [watchlistCountById, setWatchlistCountById] = useState<
    Record<number, number>
  >({});
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [badges, setBadges] = useState<readonly BadgeRecord[]>([]);
  // Firestore's onSnapshot can re-emit the followed-people list with a new
  // array reference on metadata-only changes (not just real add/remove),
  // re-running the totalCount/age effect below on every emission. Without
  // this, that meant re-fetching /api/person/{id} for every already-known
  // person each time — easily enough requests to hit the endpoint's rate
  // limit for anyone following more than a handful of people.
  const fetchedPersonIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!user) {
      setPeople(null);
      return;
    }
    return subscribeToFollowedPeople(user.uid, setPeople);
  }, [user]);

  // One watched-movies listener per followed person — same data
  // FollowedPersonCard used to fetch on its own, lifted up here so the
  // parent can sort by it instead of every card resolving independently.
  useEffect(() => {
    if (!user || !people) return;
    const unsubscribers = people.map((person) =>
      subscribeToWatchedMovies(user.uid, person.tmdbId, (watched) => {
        setStatsById((prev) => ({
          ...prev,
          [person.tmdbId]: {
            totalCount: prev[person.tmdbId]?.totalCount ?? null,
            age: prev[person.tmdbId]?.age ?? null,
            watchedCount: watched.size,
          },
        }));
      }),
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [user, people]);

  // Total filmography size + age both come from the same TMDB proxy call
  // already used to render each person's progress bar. fetchPersonData
  // caches per person in localStorage (6h, matching the server's own
  // cache) — following 30-50 people otherwise means 30-50 real requests
  // on every single page load.
  useEffect(() => {
    if (!people) return;
    people.forEach((person) => {
      if (fetchedPersonIdsRef.current.has(person.tmdbId)) return;
      fetchedPersonIdsRef.current.add(person.tmdbId);
      fetchPersonData(person.tmdbId)
        .then((data) => {
          if (!data) throw new Error("request failed");
          const age = data.profile.birthday
            ? calculateAge(data.profile.birthday)
            : null;
          setStatsById((prev) => ({
            ...prev,
            [person.tmdbId]: {
              watchedCount: prev[person.tmdbId]?.watchedCount ?? 0,
              totalCount: data.movies.length,
              age,
            },
          }));
        })
        .catch(() => {
          setStatsById((prev) => ({
            ...prev,
            [person.tmdbId]: {
              watchedCount: prev[person.tmdbId]?.watchedCount ?? 0,
              totalCount: 0,
              age: null,
            },
          }));
        });
    });
  }, [people]);

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
          stats.watchedCount === stats.totalCount
        );
      }),
    [people, statsById],
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
        const remaining = stats.totalCount - stats.watchedCount;
        if (remaining <= 0 || remaining > ALMOST_THERE_MAX_REMAINING)
          return null;
        return { person, remaining };
      })
      .filter((entry) => entry !== null)
      .sort((a, b) => a.remaining - b.remaining);
  }, [people, statsById]);

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
          (statsById[b.tmdbId]?.watchedCount ?? 0) -
          (statsById[a.tmdbId]?.watchedCount ?? 0)
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
  }, [people, sortMode, statsById, watchlistCountById]);

  // A page-level h1 that renders in every state (including the loading
  // skeleton, which is what search engines and pre-hydration crawlers see)
  // rather than only in a client-resolved branch — axe-core's
  // page-has-heading-one flagged this when it scanned before Firebase's
  // async auth check resolved.
  const heading = "My Filmographies";

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
        <div className="space-y-4 text-center">
          <img
            src="/logo.png"
            alt=""
            width={96}
            height={96}
            className="mx-auto size-20 sm:size-24"
          />
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Pelicoolas
          </h1>
          <p className="mx-auto max-w-md text-muted-foreground">
            Follow your favorite actors and directors, track what you've already
            watched, and never miss what they release next.
          </p>
          <Button render={<a href="/search" />}>
            Search actors & directors
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOME_FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card-elevated rounded-lg border p-4">
              <Icon className="mb-2 size-5 text-primary" />
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>

        <TrendingMovies movies={trendingMovies} />
      </div>
    );
  }

  if (!people || people.length === 0) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">
          You aren&apos;t following anyone yet.
        </h1>
        <p className="text-muted-foreground">
          Find an actor or director whose movies you want to explore.
        </p>
        <Button render={<a href="/search" />}>Search</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FollowedPeopleHero people={people} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{heading}</h1>
        {engagement.wrapped && (
          <Button size="sm" variant="outline" render={<a href="/wrapped" />}>
            Your Year in Film
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
          <p className="mb-2 text-sm font-medium">Almost there</p>
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
                  — {remaining} {remaining === 1 ? "movie" : "movies"} to
                  complete
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {people.length} people you're following
        </p>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {(limit ? sortedPeople!.slice(0, limit) : sortedPeople!).map(
          (person) => (
            <FollowedPersonCard
              key={person.tmdbId}
              person={person}
              watchedCount={statsById[person.tmdbId]?.watchedCount ?? 0}
              totalCount={statsById[person.tmdbId]?.totalCount ?? null}
              age={statsById[person.tmdbId]?.age ?? null}
            />
          ),
        )}
      </div>

      {limit && people.length > limit && (
        <div className="text-center">
          <Button variant="outline" render={<a href="/filmographies" />}>
            View all {people.length}
          </Button>
        </div>
      )}
    </div>
  );
}
