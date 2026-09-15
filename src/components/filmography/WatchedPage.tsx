import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDownIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  LayoutGridIcon,
  ListIcon,
} from "lucide-react";
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
const VIEW_MODE_KEY = "watched-view-mode";

type GroupMode = "year" | "person";
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

// Groups watched movies by which followed person's filmography they belong
// to — a movie can (rarely) belong to more than one, so it can legitimately
// show up under more than one person's section. Anything not in any
// followed person's filmography (marked watched from search, or a person
// you've since unfollowed) lands in one "Other" group instead of
// disappearing. Hoisted out of the component (rather than computed inline
// in PersonGroups) so WatchedPage can derive the group keys it needs for
// the expand/collapse-all control without duplicating this logic.
function groupByPerson(
  movies: readonly SeenMovie[],
  people: readonly FollowedPerson[],
  personMovieIds: Record<number, readonly number[]>,
): {
  readonly stillLoading: boolean;
  readonly groups: readonly {
    person: FollowedPerson;
    movies: readonly SeenMovie[];
  }[];
  readonly other: readonly SeenMovie[];
} {
  const stillLoading = people.some(
    (p) => personMovieIds[p.tmdbId] === undefined,
  );

  const groups = people
    .map((person) => {
      const ids = new Set(personMovieIds[person.tmdbId] ?? []);
      return { person, movies: movies.filter((m) => ids.has(m.tmdbId)) };
    })
    .filter((g) => g.movies.length > 0)
    .sort((a, b) => b.movies.length - a.movies.length);

  const grouped = new Set(groups.flatMap((g) => g.movies.map((m) => m.tmdbId)));
  const other = movies.filter((m) => !grouped.has(m.tmdbId));

  return { stillLoading, groups, other };
}

function MovieCard({
  movie,
  onOpen,
}: {
  readonly movie: SeenMovie;
  readonly onOpen: () => void;
}) {
  return (
    <div>
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

function MovieListRow({
  movie,
  onOpen,
}: {
  readonly movie: SeenMovie;
  readonly onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="focus-ring card-elevated flex w-full items-center gap-3 overflow-hidden rounded-lg border p-2 text-left"
      aria-label={`View details for ${movie.title}`}
    >
      {movie.posterPath ? (
        <img
          src={tmdbImageUrl(movie.posterPath, 92)}
          alt=""
          loading="lazy"
          className="h-20 w-14 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
          No poster
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-medium">{movie.title}</p>
        <p className="text-sm text-muted-foreground">
          {movie.releaseYear ?? "Unknown"}
        </p>
      </div>
    </button>
  );
}

function MovieGroup({
  movies,
  viewMode,
  onOpen,
}: {
  readonly movies: readonly SeenMovie[];
  readonly viewMode: ViewMode;
  readonly onOpen: (movie: SeenMovie) => void;
}) {
  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {movies.map((movie) => (
          <MovieListRow
            key={movie.tmdbId}
            movie={movie}
            onOpen={() => onOpen(movie)}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {movies.map((movie) => (
        <MovieCard
          key={movie.tmdbId}
          movie={movie}
          onOpen={() => onOpen(movie)}
        />
      ))}
    </div>
  );
}

function GroupSection({
  groupKey,
  title,
  count,
  collapsed,
  onToggle,
  muted = false,
  children,
}: {
  readonly groupKey: string;
  readonly title: ReactNode;
  readonly count: number;
  readonly collapsed: boolean;
  readonly onToggle: (key: string) => void;
  readonly muted?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onToggle(groupKey)}
        className={`focus-ring flex w-full items-center gap-1.5 text-left text-sm font-semibold ${muted ? "text-muted-foreground" : ""}`}
        aria-expanded={!collapsed}
      >
        <ChevronDownIcon
          className={`size-4 shrink-0 transition-transform ${collapsed ? "-rotate-90" : ""}`}
        />
        {title}
        <span className="font-normal text-muted-foreground">({count})</span>
      </button>
      {!collapsed && children}
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
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode);
  const [openMovie, setOpenMovie] = useState<SeenMovie | null>(null);
  // Keyed by "year:2024" / "person:123" / "person:other" — a single Set
  // covers both group modes since the prefix keeps their keys disjoint, so
  // switching modes doesn't need to reset or namespace anything separately.
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(
    new Set(),
  );

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // Best-effort persistence only.
    }
  }, [viewMode]);

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

  const yearGroups = groupByYear(filtered);
  const personGroups = groupByPerson(filtered, people ?? [], personMovieIds);

  // Keys for whichever grouping is currently shown — drives the
  // expand/collapse-all control (and only that mode's groups, so switching
  // between "By year" and "By person" doesn't carry a stale collapsed set
  // that silently hides groups in the other view).
  const currentGroupKeys =
    groupMode === "year"
      ? yearGroups.map(([year]) => `year:${year}`)
      : [
          ...personGroups.groups.map((g) => `person:${g.person.tmdbId}`),
          ...(personGroups.other.length > 0 ? ["person:other"] : []),
        ];
  const allCollapsed =
    currentGroupKeys.length > 0 &&
    currentGroupKeys.every((k) => collapsedGroups.has(k));

  function toggleAllGroups() {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      for (const key of currentGroupKeys) {
        if (allCollapsed) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Watched</h1>

      <div className="flex flex-wrap items-center justify-end gap-2">
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
        <div className="flex gap-1 rounded-full border p-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-sm"
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                />
              }
            >
              <LayoutGridIcon />
            </TooltipTrigger>
            <TooltipContent>Grid view</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-sm"
                  variant={viewMode === "list" ? "default" : "ghost"}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                />
              }
            >
              <ListIcon />
            </TooltipTrigger>
            <TooltipContent>List view</TooltipContent>
          </Tooltip>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="icon-sm"
                variant="outline"
                aria-label={allCollapsed ? "Expand all" : "Collapse all"}
                onClick={toggleAllGroups}
              />
            }
          >
            {allCollapsed ? <ChevronsUpDownIcon /> : <ChevronsDownUpIcon />}
          </TooltipTrigger>
          <TooltipContent>
            {allCollapsed ? "Expand all" : "Collapse all"}
          </TooltipContent>
        </Tooltip>
      </div>

      {availableGenres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={genreFilter === ALL_GENRES ? "default" : "outline"}
            onClick={() => setGenreFilter(ALL_GENRES)}
          >
            All genres
            <span className="text-xs opacity-70">({movies.length})</span>
          </Button>
          {availableGenres.map((id) => (
            <Button
              key={id}
              size="sm"
              variant={genreFilter === id ? "default" : "outline"}
              onClick={() => setGenreFilter(id)}
            >
              {genreName(id) ?? "Other"}
              <span className="text-xs opacity-70">
                ({genreCounts.get(id)})
              </span>
            </Button>
          ))}
        </div>
      )}

      {groupMode === "year" && (
        <div className="space-y-6">
          {yearGroups.map(([year, yearMovies]) => (
            <GroupSection
              key={year}
              groupKey={`year:${year}`}
              title={year}
              count={yearMovies.length}
              collapsed={collapsedGroups.has(`year:${year}`)}
              onToggle={toggleGroup}
              muted
            >
              <MovieGroup
                movies={yearMovies}
                viewMode={viewMode}
                onOpen={setOpenMovie}
              />
            </GroupSection>
          ))}
        </div>
      )}

      {groupMode === "person" && (
        <PersonGroups
          grouped={personGroups}
          viewMode={viewMode}
          onOpen={setOpenMovie}
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
        />
      )}

      {openMovie !== null && (
        <MovieDetailsDialog
          movieId={openMovie.tmdbId}
          mediaType={openMovie.mediaType}
          open={openMovie !== null}
          onOpenChange={(open) => !open && setOpenMovie(null)}
        />
      )}
    </div>
  );
}

interface PersonGroupsProps {
  readonly grouped: ReturnType<typeof groupByPerson>;
  readonly viewMode: ViewMode;
  readonly onOpen: (movie: SeenMovie) => void;
  readonly collapsedGroups: ReadonlySet<string>;
  readonly onToggleGroup: (key: string) => void;
}

function PersonGroups({
  grouped,
  viewMode,
  onOpen,
  collapsedGroups,
  onToggleGroup,
}: PersonGroupsProps) {
  const { stillLoading, groups, other } = grouped;

  return (
    <div className="space-y-6">
      {stillLoading && (
        <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="mb-3 aspect-[2/3] w-full break-inside-avoid rounded-lg"
            />
          ))}
        </div>
      )}

      {groups.map(({ person, movies: personMovies }) => {
        const key = `person:${person.tmdbId}`;
        return (
          <GroupSection
            key={key}
            groupKey={key}
            title={person.name}
            count={personMovies.length}
            collapsed={collapsedGroups.has(key)}
            onToggle={onToggleGroup}
          >
            <MovieGroup
              movies={personMovies}
              viewMode={viewMode}
              onOpen={onOpen}
            />
          </GroupSection>
        );
      })}

      {!stillLoading && other.length > 0 && (
        <GroupSection
          groupKey="person:other"
          title="Not part of a followed filmography"
          count={other.length}
          collapsed={collapsedGroups.has("person:other")}
          onToggle={onToggleGroup}
          muted
        >
          <MovieGroup movies={other} viewMode={viewMode} onOpen={onOpen} />
        </GroupSection>
      )}
    </div>
  );
}
