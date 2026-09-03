import { useEffect, useMemo, useRef, useState } from "react";
import { TrophyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FollowedPersonCard } from "./FollowedPersonCard";
import { FollowedPeopleHero } from "./FollowedPeopleHero";
import { TrendingMovies } from "./TrendingMovies";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  subscribeToFollowedPeople,
  subscribeToWatchedMovies,
  subscribeToWatchlist,
} from "@/lib/firebase/firestore";
import { awardBadgeOnce, subscribeToBadges } from "@/lib/firebase/badges";
import { calculateAge } from "@/lib/age";
import engagement from "@/config/engagement.json";
import type { FollowedPerson } from "@/types/filmography";
import type { PersonProfile } from "@/types/person";
import type { TrendingMovie } from "@/types/movie";
import type { Badge as BadgeRecord } from "@/types/badges";

const FILMOGRAPHY_MILESTONES = [3, 10, 25];
const ALMOST_THERE_MAX_REMAINING = 3;

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
}

export function Dashboard({ trendingMovies = [] }: DashboardProps) {
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
  // already used to render each person's progress bar.
  useEffect(() => {
    if (!people) return;
    people.forEach((person) => {
      if (fetchedPersonIdsRef.current.has(person.tmdbId)) return;
      fetchedPersonIdsRef.current.add(person.tmdbId);
      fetch(`/api/person/${person.tmdbId}`)
        .then((r) => r.json())
        .then(
          (data: { profile: PersonProfile; movies: readonly unknown[] }) => {
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
          },
        )
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
      <div className="space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-xl font-semibold">{heading}</h1>
          <p>Follow the people whose movies you want to watch.</p>
          <Button render={<a href="/search" />}>
            Search actors & directors
          </Button>
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
            <Badge key={badge.id} variant="secondary" title={badge.description}>
              <TrophyIcon data-icon="inline-start" />
              {badge.label}
            </Badge>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedPeople!.map((person) => (
          <FollowedPersonCard
            key={person.tmdbId}
            person={person}
            watchedCount={statsById[person.tmdbId]?.watchedCount ?? 0}
            totalCount={statsById[person.tmdbId]?.totalCount ?? null}
            age={statsById[person.tmdbId]?.age ?? null}
          />
        ))}
      </div>
    </div>
  );
}
