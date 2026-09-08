import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MovieDetailsDialog } from "@/components/filmography/MovieDetailsDialog";
import { useAuth } from "@/lib/hooks/useAuth";
import { subscribeToFollowedPeople } from "@/lib/firebase/firestore";
import { tmdbImageUrl, tmdbDensitySrcSet } from "@/lib/tmdb/image";
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

function MoviePoster({
  movie,
  onClick,
}: {
  readonly movie: FilmographyMovie;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring w-20 shrink-0 text-left"
    >
      {movie.posterPath ? (
        <img
          src={tmdbImageUrl(movie.posterPath, 92)}
          srcSet={tmdbDensitySrcSet(movie.posterPath, 92, 185)}
          alt=""
          loading="lazy"
          className="aspect-[2/3] w-full rounded-lg object-cover"
        />
      ) : (
        <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
          No poster
        </div>
      )}
      <p className="mt-1 truncate text-xs font-medium">{movie.title}</p>
    </button>
  );
}

export function ConnectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [followed, setFollowed] = useState<readonly FollowedPerson[] | null>(
    null,
  );
  const [byPerson, setByPerson] = useState<readonly PersonMovies[]>([]);
  const [loadingFilmographies, setLoadingFilmographies] = useState(false);
  const fetchedPersonRef = useRef<Set<number>>(new Set());

  const [openMovieId, setOpenMovieId] = useState<number | null>(null);

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

  useEffect(() => {
    if (!followed) return;
    const toFetch = followed.filter(
      (p) => !fetchedPersonRef.current.has(p.tmdbId),
    );
    if (toFetch.length === 0) return;

    setLoadingFilmographies(true);
    let cancelled = false;

    (async () => {
      const results: PersonMovies[] = [];
      for (const person of toFetch) {
        fetchedPersonRef.current.add(person.tmdbId);
        try {
          const res = await fetch(`/api/person/${person.tmdbId}`);
          if (!res.ok) continue;
          const data = (await res.json()) as {
            movies: readonly FilmographyMovie[];
          };
          results.push({ person, movies: data.movies });
        } catch {
          // Skip this person rather than failing the whole page.
        }
      }
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
          const res = await fetch(`/api/movie/${movie.tmdbMovieId}`);
          if (res.ok) {
            const data = (await res.json()) as {
              movie: { cast: readonly CastMember[] };
            };
            for (const member of data.movie.cast) {
              const entry = castByMember.get(member.personId);
              if (entry) entry.movies.push(movie);
              else
                castByMember.set(member.personId, { member, movies: [movie] });
            }
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
    setScanning(false);
  }

  const heading = "Connections";

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
        <p className="text-muted-foreground">
          Sign in to see how your filmographies connect.
        </p>
      </div>
    );
  }

  if (!followed || followed.length === 0) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">{heading}</h1>
        <p className="text-muted-foreground">
          Follow a few actors or directors to see how their movies connect.
        </p>
        <Button render={<a href="/search" />}>Search actors & directors</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">{heading}</h1>
        <p className="text-sm text-muted-foreground">
          How the people you follow — and the movies they're in — overlap.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">People who worked together</h2>

        {loadingFilmographies && byPerson.length === 0 && (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {!loadingFilmographies && coStarGroups.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No overlaps yet — the people you follow haven't shared a movie
            (that's in their tracked filmography).
          </p>
        )}

        {coStarGroups.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {coStarGroups.map(({ movie, people }) => (
              <button
                key={movie.tmdbMovieId}
                type="button"
                onClick={() => setOpenMovieId(movie.tmdbMovieId)}
                className="focus-ring space-y-1 text-left"
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
                    No poster
                  </div>
                )}
                <p className="truncate text-sm font-medium">{movie.title}</p>
                <p className="text-xs text-muted-foreground">
                  {movie.releaseYear ?? "Unknown"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {people.map((p) => p.name).join(", ")}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">Shared cast across your filmography</h2>
          <Button
            size="sm"
            variant="outline"
            disabled={scanning || allMovies.length === 0}
            onClick={() => void runScan()}
          >
            {scanning
              ? `Scanning ${scanProgress}/${scanTotal}…`
              : sharedCastGroups
                ? "Re-scan"
                : "Find shared actors"}
          </Button>
        </div>

        {!sharedCastGroups && !scanning && (
          <p className="text-sm text-muted-foreground">
            Checks the full cast of every movie in your filmography for actors
            who show up more than once — not just the people you follow.
            {allMovies.length > MAX_SCAN_MOVIES &&
              ` Limited to the first ${MAX_SCAN_MOVIES} movies.`}
          </p>
        )}

        {sharedCastGroups && sharedCastGroups.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No actor appears in more than one of these movies.
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
                    <AvatarFallback>{member.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium hover:underline">
                    {member.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    — {movies.length} movies
                  </span>
                </a>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {movies.map((movie) => (
                    <MoviePoster
                      key={movie.tmdbMovieId}
                      movie={movie}
                      onClick={() => setOpenMovieId(movie.tmdbMovieId)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
