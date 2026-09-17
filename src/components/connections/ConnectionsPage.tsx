import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MovieDetailsDialog } from "@/components/filmography/MovieDetailsDialog";
import { MovieActions } from "@/components/movies/MovieActions";
import { MovieMap } from "./MovieMap";
import { PosterCarousel } from "./PosterCarousel";
import { useAuth } from "@/lib/hooks/useAuth";
import { useMovieActionState } from "@/lib/hooks/useMovieActionState";
import { subscribeToFollowedPeople } from "@/lib/firebase/firestore";
import { tmdbImageUrl, tmdbDensitySrcSet } from "@/lib/tmdb/image";
import { fetchMovieDetails, fetchPersonData } from "@/lib/movieData";
import { mapWithConcurrency } from "@/lib/concurrency";
import { readCache, writeCache } from "@/lib/clientCache";
import { getDictionary, type Locale } from "@/i18n";
import type { FollowedPerson } from "@/types/filmography";
import type { CastMember, FilmographyMovie } from "@/types/movie";

interface PersonMovies {
  readonly person: FollowedPerson;
  readonly movies: readonly FilmographyMovie[];
}

interface CoStarGroup {
  readonly movie: FilmographyMovie;
  readonly people: readonly FollowedPerson[];
}

interface SharedCastGroup {
  readonly member: CastMember;
  readonly movies: readonly FilmographyMovie[];
}

// A full cast-overlap scan means one /api/movie/{id} fetch per distinct
// movie across every followed person's filmography — for someone following
// a lot of people that's a lot of requests. Capped and throttled so it
// can't run away, and gated behind an explicit button rather than firing on
// page load.
const MAX_SCAN_MOVIES = 150;
const SCAN_CONCURRENCY = 4;
const SCAN_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // matches fetchMovieDetails' own cache — no point outliving the data it's built from

type ConnectionsTab = "people" | "cast" | "map";

interface ConnectionsPageProps {
  readonly locale: Locale;
}

export function ConnectionsPage({ locale }: ConnectionsPageProps) {
  const t = getDictionary(locale);
  const TABS: readonly { value: ConnectionsTab; label: string }[] = [
    { value: "people", label: t.connections.tabPeople },
    { value: "cast", label: t.connections.tabCast },
    { value: "map", label: t.connections.tabMap },
  ];
  const { user, loading: authLoading } = useAuth();
  const [followed, setFollowed] = useState<readonly FollowedPerson[] | null>(
    null,
  );
  const [byPerson, setByPerson] = useState<readonly PersonMovies[]>([]);
  const [loadingFilmographies, setLoadingFilmographies] = useState(false);
  const fetchedPersonRef = useRef<Set<number>>(new Set());

  const [openMovieId, setOpenMovieId] = useState<number | null>(null);
  const [tab, setTab] = useState<ConnectionsTab>("people");

  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanTotal, setScanTotal] = useState(0);
  const [sharedCastGroups, setSharedCastGroups] = useState<
    readonly SharedCastGroup[] | null
  >(null);

  useEffect(() => {
    if (!user) {
      setFollowed(null);
      return;
    }
    return subscribeToFollowedPeople(user.uid, setFollowed);
  }, [user]);

  // Restore a previous deep scan instead of making the user click "Find
  // shared actors" again on every visit — the scan itself isn't cheap, so
  // this is on top of (not instead of) fetchMovieDetails' own cache.
  useEffect(() => {
    if (!user) return;
    const cached = readCache<readonly SharedCastGroup[]>(
      `connections:sharedCast:${user.uid}`,
      SCAN_CACHE_MAX_AGE_MS,
    );
    if (cached) setSharedCastGroups(cached);
  }, [user]);

  useEffect(() => {
    if (!followed) return;
    const toFetch = followed.filter(
      (p) => !fetchedPersonRef.current.has(p.tmdbId),
    );
    if (toFetch.length === 0) return;

    setLoadingFilmographies(true);
    let cancelled = false;
    for (const person of toFetch) fetchedPersonRef.current.add(person.tmdbId);

    (async () => {
      const results: PersonMovies[] = [];
      // Capped concurrency, not sequential — awaiting 50 people one at a
      // time made this page's load time scale with follow-list size
      // instead of staying roughly constant. See mapWithConcurrency's doc.
      await mapWithConcurrency(toFetch, 6, async (person) => {
        try {
          const data = await fetchPersonData(person.tmdbId);
          if (!data) return;
          results.push({ person, movies: data.movies });
        } catch {
          // Skip this person rather than failing the whole page.
        }
      });
      if (!cancelled) {
        setByPerson((prev) => [...prev, ...results]);
        setLoadingFilmographies(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [followed]);

  const byMovie = new Map<
    number,
    { movie: FilmographyMovie; people: FollowedPerson[] }
  >();
  for (const { person, movies } of byPerson) {
    for (const movie of movies) {
      const entry = byMovie.get(movie.tmdbMovieId);
      if (entry) {
        entry.people.push(person);
      } else {
        byMovie.set(movie.tmdbMovieId, { movie, people: [person] });
      }
    }
  }

  const coStarGroups: readonly CoStarGroup[] = [...byMovie.values()]
    .filter((g) => g.people.length >= 2)
    .sort((a, b) => b.people.length - a.people.length);

  const allMovies = [...byMovie.values()].map((g) => g.movie);

  async function runScan() {
    setScanning(true);
    setSharedCastGroups(null);
    const targets = allMovies.slice(0, MAX_SCAN_MOVIES);
    setScanTotal(targets.length);
    setScanProgress(0);

    const castByMember = new Map<
      number,
      { member: CastMember; movies: FilmographyMovie[] }
    >();
    let index = 0;

    async function worker() {
      while (index < targets.length) {
        const movie = targets[index++];
        try {
          const details = await fetchMovieDetails(movie.tmdbMovieId);
          for (const member of details?.cast ?? []) {
            const entry = castByMember.get(member.personId);
            if (entry) entry.movies.push(movie);
            else castByMember.set(member.personId, { member, movies: [movie] });
          }
        } catch {
          // Skip this movie's cast, keep scanning the rest.
        }
        setScanProgress((p) => p + 1);
      }
    }

    await Promise.all(Array.from({ length: SCAN_CONCURRENCY }, () => worker()));

    const groups = [...castByMember.values()]
      .filter((g) => g.movies.length >= 2)
      .sort((a, b) => b.movies.length - a.movies.length)
      .slice(0, 30);
    setSharedCastGroups(groups);
    if (user) writeCache(`connections:sharedCast:${user.uid}`, groups);
    setScanning(false);
  }

  const heading = t.connections.heading;

  if (authLoading || (user && followed === null)) {
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
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">{heading}</h1>
        <p className="text-muted-foreground">{t.connections.signInPrompt}</p>
      </div>
    );
  }

  const hasFollowed = !!followed && followed.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">{heading}</h1>
        <p className="text-sm text-muted-foreground">
          {t.connections.subtitle}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <Button
            key={t.value}
            type="button"
            size="sm"
            variant={tab === t.value ? "default" : "outline"}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {!hasFollowed && tab !== "map" && (
        <div className="space-y-3 text-center">
          <p className="text-muted-foreground">
            {t.connections.followSomePeople}
          </p>
          <Button render={<a href="/search" />}>
            {t.connections.searchActorsDirectors}
          </Button>
        </div>
      )}

      {hasFollowed && tab === "people" && (
        <>
          <section className="space-y-3">
            {loadingFilmographies && byPerson.length === 0 && (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}

            {!loadingFilmographies && coStarGroups.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t.connections.noOverlapsYet}
              </p>
            )}

            {coStarGroups.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {coStarGroups.map(({ movie, people }) => (
                  <CoStarCard
                    key={movie.tmdbMovieId}
                    movie={movie}
                    people={people}
                    onOpen={() => setOpenMovieId(movie.tmdbMovieId)}
                    t={t}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {hasFollowed && tab === "cast" && (
        <>
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {t.connections.scanDescription}
                {allMovies.length > MAX_SCAN_MOVIES &&
                  t.connections.limitedToFirst(MAX_SCAN_MOVIES)}
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={scanning || allMovies.length === 0}
                onClick={() => void runScan()}
              >
                {scanning
                  ? t.connections.scanning(scanProgress, scanTotal)
                  : sharedCastGroups
                    ? t.connections.rescan
                    : t.connections.findSharedActors}
              </Button>
            </div>

            {sharedCastGroups && sharedCastGroups.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t.connections.noSharedActor}
              </p>
            )}

            {sharedCastGroups && sharedCastGroups.length > 0 && (
              <div className="space-y-4">
                {sharedCastGroups.map(({ member, movies }) => (
                  <div key={member.personId} className="space-y-2">
                    <a
                      href={`/person/${member.personId}`}
                      className="focus-ring flex items-center gap-2"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={
                            member.profilePath
                              ? tmdbImageUrl(member.profilePath, 45)
                              : undefined
                          }
                          alt=""
                        />
                        <AvatarFallback>
                          {member.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium hover:underline">
                        {member.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {t.connections.movies(movies.length)}
                      </span>
                    </a>
                    <PosterCarousel movies={movies} onSelect={setOpenMovieId} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {tab === "map" && (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t.connections.exploreNeighborhood}{" "}
            <a
              href="https://www.movie-map.com"
              target="_blank"
              rel="noreferrer"
              className="focus-ring underline"
            >
              movie-map.com
            </a>
            {t.connections.withPostersLayout}
          </p>
          <MovieMap locale={locale} />
        </section>
      )}

      {openMovieId !== null && (
        <MovieDetailsDialog
          movieId={openMovieId}
          open={openMovieId !== null}
          onOpenChange={(open) => !open && setOpenMovieId(null)}
        />
      )}
    </div>
  );
}

interface CoStarCardProps {
  readonly movie: FilmographyMovie;
  readonly people: readonly FollowedPerson[];
  readonly onOpen: () => void;
  readonly t: ReturnType<typeof getDictionary>;
}

function CoStarCard({ movie, people, onOpen, t }: CoStarCardProps) {
  // A signed-out click just opens the dialog, which has its own sign-in
  // prompt — no room for an inline hint in this grid.
  const { watched, inWatchlist, ready, toggleWatched, toggleWatchlist } =
    useMovieActionState(movie, onOpen);

  return (
    <div className="card-elevated space-y-1 rounded-lg">
      <div className="relative">
        <button
          type="button"
          onClick={onOpen}
          className="focus-ring block w-full"
          aria-label={t.connections.viewDetailsFor(movie.title)}
        >
          {movie.posterPath ? (
            <img
              src={tmdbImageUrl(movie.posterPath, 185)}
              srcSet={tmdbDensitySrcSet(movie.posterPath, 185, 342)}
              alt=""
              loading="lazy"
              className="aspect-[2/3] w-full rounded-lg border object-cover"
            />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
              {t.connections.noPoster}
            </div>
          )}
        </button>
        <MovieActions
          movie={movie}
          watched={watched}
          inWatchlist={inWatchlist}
          onToggleWatched={toggleWatched}
          onToggleWatchlist={toggleWatchlist}
          disabled={!ready}
        />
      </div>
      <p className="truncate text-sm font-medium">{movie.title}</p>
      <p className="text-xs text-muted-foreground">
        {movie.releaseYear ?? t.connections.unknown}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {people.map((p) => p.name).join(", ")}
      </p>
    </div>
  );
}
