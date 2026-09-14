import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MovieDetailsDialog } from "./MovieDetailsDialog";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  setSeenGenres,
  subscribeToFollowedPeople,
  subscribeToSeenMoviesFull,
} from "@/lib/firebase/firestore";
import { mapWithConcurrency } from "@/lib/concurrency";
import { fetchMovieDetails, fetchPersonData } from "@/lib/movieData";
import { tmdbImageUrl, tmdbWidthSrcSet } from "@/lib/tmdb/image";
import { genreName } from "@/lib/tmdb/genres";
import type { FollowedPerson, SeenMovie } from "@/types/filmography";

const POSTER_WIDTHS = [185, 342, 500];
const POSTER_SIZES = "(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw";
const ALL_GENRES = "all";

type GroupMode = "year" | "person";

function groupByYear(
  movies: readonly SeenMovie[],
): readonly [string, readonly SeenMovie[]][] {
  const groups = new Map<string, SeenMovie[]>();
  for (const movie of movies) {
    const key =
      movie.releaseYear !== null ? String(movie.releaseYear) : "Unknown";
    const list = groups.get(key) ?? [];
    list.push(movie);
    groups.set(key, list);
  }
  return [...groups.entries()].sort(([a], [b]) => {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    return Number(b) - Number(a);
  });
}

function MovieCard({
  movie,
  onOpen,
}: {
  readonly movie: SeenMovie;
  readonly onOpen: () => void;
}) {
  return (
    <div className="mb-3 break-inside-avoid">
      <button
        type="button"
        onClick={onOpen}
        className="focus-ring card-elevated block w-full overflow-hidden rounded-lg border text-left"
        aria-label={`View details for ${movie.title}`}
      >
        {movie.posterPath ? (
          <img
            src={tmdbImageUrl(movie.posterPath, 342)}
            srcSet={tmdbWidthSrcSet(movie.posterPath, POSTER_WIDTHS)}
            sizes={POSTER_SIZES}
            alt=""
            loading="lazy"
            className="w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[2/3] w-full items-center justify-center bg-muted text-sm text-muted-foreground">
            No poster
          </div>
        )}
      </button>
      <p className="mt-1 truncate font-medium">{movie.title}</p>
      <p className="text-sm text-muted-foreground">
        {movie.releaseYear ?? "Unknown"}
      </p>
    </div>
  );
}

export function WatchedPage() {
  const { user, loading: authLoading } = useAuth();
  const [movies, setMovies] = useState<readonly SeenMovie[] | null>(null);
  const [people, setPeople] = useState<readonly FollowedPerson[] | null>(null);
  // personId -> that person's movie ids, only for people who have at least
  // one movie in `movies` (fetched lazily below, not for everyone followed
  // up front — most of a large follow list won't overlap with what's
  // actually been marked watched).
  const [personMovieIds, setPersonMovieIds] = useState<
    Record<number, readonly number[]>
  >({});
  const [groupMode, setGroupMode] = useState<GroupMode>("year");
  const [genreFilter, setGenreFilter] = useState<number | typeof ALL_GENRES>(
    ALL_GENRES,
  );
  const [openMovieId, setOpenMovieId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setMovies(null);
      return;
    }
    return subscribeToSeenMoviesFull(user.uid, setMovies);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setPeople(null);
      return;
    }
    return subscribeToFollowedPeople(user.uid, setPeople);
  }, [user]);

  // Entries marked seen before genreIds existed have no such field at all
  // — backfill them once in the background, same pattern as the watchlist.
  const backfilledRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!user || !movies) return;
    const toBackfill = movies.filter(
      (m) => m.genreIds === undefined && !backfilledRef.current.has(m.tmdbId),
    );
    if (toBackfill.length === 0) return;

    for (const movie of toBackfill) backfilledRef.current.add(movie.tmdbId);
    void mapWithConcurrency(toBackfill, 6, async (movie) => {
      try {
        const details = await fetchMovieDetails(movie.tmdbId);
        if (details) {
          await setSeenGenres(user.uid, movie.tmdbId, details.genreIds);
        }
      } catch {
        // Best-effort backfill — leave this one for next visit.
      }
    });
  }, [user, movies]);

  // "Group by person" needs to know which followed people's filmographies
  // each watched movie belongs to — fetched with capped concurrency so a
  // big follow list doesn't burst past the server's rate limit or block
  // this view from rendering (the "by year" view works without any of
  // this, so it's not gating the page).
  const fetchedForGroupingRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!user || !people || groupMode !== "person") return;
    const toFetch = people.filter(
      (person) => !fetchedForGroupingRef.current.has(person.tmdbId),
    );
    for (const person of toFetch)
      fetchedForGroupingRef.current.add(person.tmdbId);

    void mapWithConcurrency(toFetch, 6, async (person) => {
      const data = await fetchPersonData(person.tmdbId);
      if (!data) return;
      setPersonMovieIds((prev) => ({
        ...prev,
        [person.tmdbId]: data.movies.map((m) => m.tmdbMovieId),
      }));
    });
  }, [user, people, groupMode]);

  if (authLoading) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="sr-only">Watched</h1>
        <Skeleton className="mx-auto h-7 w-32" />
        <Skeleton className="mx-auto h-5 w-56" />
      </div>
    );
  }

  if (user && movies === null) {
    return (
      <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
        <h1 className="sr-only">Watched</h1>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="mb-3 aspect-[2/3] w-full break-inside-avoid rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">Watched</h1>
        <p className="text-muted-foreground">
          Sign in to see everything you've marked watched.
        </p>
      </div>
    );
  }

  if (!movies || movies.length === 0) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">Nothing marked watched yet.</h1>
        <p className="text-muted-foreground">
          Mark movies watched from a filmography, search, or the watchlist —
          they'll all show up here.
        </p>
        <Button render={<a href="/search" />}>Search actors & directors</Button>
      </div>
    );
  }

  const genreCounts = new Map<number, number>();
  for (const movie of movies) {
    for (const id of movie.genreIds ?? []) {
      genreCounts.set(id, (genreCounts.get(id) ?? 0) + 1);
    }
  }
  const availableGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const filtered =
    genreFilter === ALL_GENRES
      ? movies
      : movies.filter((m) => m.genreIds?.includes(genreFilter));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Watched</h1>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {movies.length} movies watched
        </p>
        <div className="flex gap-1 rounded-full border p-1">
          <Button
            size="sm"
            variant={groupMode === "year" ? "default" : "ghost"}
            onClick={() => setGroupMode("year")}
          >
            By year
          </Button>
          <Button
            size="sm"
            variant={groupMode === "person" ? "default" : "ghost"}
            onClick={() => setGroupMode("person")}
          >
            By person
          </Button>
        </div>
      </div>

      {availableGenres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={genreFilter === ALL_GENRES ? "default" : "outline"}
            onClick={() => setGenreFilter(ALL_GENRES)}
          >
            All genres
          </Button>
          {availableGenres.map((id) => (
            <Button
              key={id}
              size="sm"
              variant={genreFilter === id ? "default" : "outline"}
              onClick={() => setGenreFilter(id)}
            >
              {genreName(id) ?? "Other"}
            </Button>
          ))}
        </div>
      )}

      {groupMode === "year" && (
        <div className="space-y-6">
          {groupByYear(filtered).map(([year, yearMovies]) => (
            <div key={year} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {year}
              </h2>
              <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
                {yearMovies.map((movie) => (
                  <MovieCard
                    key={movie.tmdbId}
                    movie={movie}
                    onOpen={() => setOpenMovieId(movie.tmdbId)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {groupMode === "person" && (
        <PersonGroups
          movies={filtered}
          people={people ?? []}
          personMovieIds={personMovieIds}
          onOpen={setOpenMovieId}
        />
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

interface PersonGroupsProps {
  readonly movies: readonly SeenMovie[];
  readonly people: readonly FollowedPerson[];
  readonly personMovieIds: Record<number, readonly number[]>;
  readonly onOpen: (movieId: number) => void;
}

// Groups watched movies by which followed person's filmography they
// belong to — a movie can (rarely) belong to more than one, so it can
// legitimately show up under more than one person's section. Anything not
// in any followed person's filmography (marked watched from search, or a
// person you've since unfollowed) lands in one "Other" section instead of
// disappearing.
function PersonGroups({
  movies,
  people,
  personMovieIds,
  onOpen,
}: PersonGroupsProps) {
  const stillLoadingGroups = people.some(
    (p) => personMovieIds[p.tmdbId] === undefined,
  );

  const groups = people
    .map((person) => {
      const ids = new Set(personMovieIds[person.tmdbId] ?? []);
      return {
        person,
        movies: movies.filter((m) => ids.has(m.tmdbId)),
      };
    })
    .filter((g) => g.movies.length > 0)
    .sort((a, b) => b.movies.length - a.movies.length);

  const grouped = new Set(groups.flatMap((g) => g.movies.map((m) => m.tmdbId)));
  const other = movies.filter((m) => !grouped.has(m.tmdbId));

  return (
    <div className="space-y-6">
      {stillLoadingGroups && (
        <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="mb-3 aspect-[2/3] w-full break-inside-avoid rounded-lg"
            />
          ))}
        </div>
      )}

      {groups.map(({ person, movies: personMovies }) => (
        <div key={person.tmdbId} className="space-y-2">
          <h2 className="text-sm font-semibold">
            <a
              href={`/person/${person.tmdbId}`}
              className="focus-ring hover:underline"
            >
              {person.name}
            </a>
            <span className="ml-1 font-normal text-muted-foreground">
              ({personMovies.length})
            </span>
          </h2>
          <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
            {personMovies.map((movie) => (
              <MovieCard
                key={movie.tmdbId}
                movie={movie}
                onOpen={() => onOpen(movie.tmdbId)}
              />
            ))}
          </div>
        </div>
      ))}

      {!stillLoadingGroups && other.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Not part of a followed filmography
          </h2>
          <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
            {other.map((movie) => (
              <MovieCard
                key={movie.tmdbId}
                movie={movie}
                onOpen={() => onOpen(movie.tmdbId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
