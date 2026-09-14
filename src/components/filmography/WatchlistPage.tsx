import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClockIcon, LayoutGridIcon, ListIcon, ShuffleIcon } from "lucide-react";
import { MovieDetailsDialog } from "./MovieDetailsDialog";
import { FilmographyProgress } from "./FilmographyProgress";
import { MovieActions } from "@/components/movies/MovieActions";
import { useAuth } from "@/lib/hooks/useAuth";
import { announce } from "@/lib/a11y";
import {
  markMovieSeen,
  removeFromWatchlist,
  setWatchlistDetails,
  subscribeToSeenMovies,
  subscribeToWatchlist,
  unmarkMovieSeen,
} from "@/lib/firebase/firestore";
import { awardBadgeOnce } from "@/lib/firebase/badges";
import { mapWithConcurrency } from "@/lib/concurrency";
import { fetchMovieDetails } from "@/lib/movieData";
import { tmdbImageUrl, tmdbWidthSrcSet } from "@/lib/tmdb/image";
import { genreName } from "@/lib/tmdb/genres";
import { formatDuration } from "@/lib/format";
import engagement from "@/config/engagement.json";
import type { WatchlistMovie } from "@/types/filmography";

const POSTER_WIDTHS = [185, 342, 500];
const POSTER_SIZES = "(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw";
const WATCHLIST_MILESTONES = [10, 25, 50];
const VIEW_MODE_KEY = "watchlist-view-mode";

type SortOrder = "newest" | "oldest" | "rating" | "alphabetical";
type WatchedFilter = "all" | "unwatched" | "watched";
type ViewMode = "grid" | "list";

const ALL_GENRES = "all";

function sortMovies(
  movies: readonly WatchlistMovie[],
  order: SortOrder,
): readonly WatchlistMovie[] {
  if (order === "alphabetical") {
    return [...movies].sort((a, b) => a.title.localeCompare(b.title));
  }
  if (order === "rating") {
    return [...movies].sort(
      (a, b) => (b.voteAverage ?? -1) - (a.voteAverage ?? -1),
    );
  }
  const withYear = movies.filter((m) => m.releaseYear !== null);
  const withoutYear = movies.filter((m) => m.releaseYear === null);
  const sorted = [...withYear].sort((a, b) =>
    order === "newest"
      ? b.releaseYear! - a.releaseYear!
      : a.releaseYear! - b.releaseYear!,
  );
  return [...sorted, ...withoutYear];
}

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

export function WatchlistPage() {
  const { user, loading: authLoading } = useAuth();
  const [movies, setMovies] = useState<readonly WatchlistMovie[] | null>(null);
  const [seenIds, setSeenIds] = useState<ReadonlySet<number>>(new Set());
  const [order, setOrder] = useState<SortOrder>("newest");
  const [genreFilter, setGenreFilter] = useState<number | typeof ALL_GENRES>(
    ALL_GENRES,
  );
  const [watchedFilter, setWatchedFilter] = useState<WatchedFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode);
  const [openMovieId, setOpenMovieId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setMovies(null);
      return;
    }
    return subscribeToWatchlist(user.uid, setMovies);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSeenIds(new Set());
      return;
    }
    return subscribeToSeenMovies(user.uid, setSeenIds);
  }, [user]);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // Best-effort persistence only.
    }
  }, [viewMode]);

  // Entries added before genreIds/durationMinutes existed have no such
  // fields at all (`undefined`, not an empty array/null — those are real
  // "TMDB has nothing here"). Backfill both together in one write, reusing
  // the same fetchMovieDetails call for both — no extra TMDB requests.
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
          await setWatchlistDetails(user.uid, movie.tmdbId, {
            genreIds: details.genreIds,
            durationMinutes: details.runtimeMinutes,
          });
        }
      } catch {
        // Best-effort backfill — leave this one for next visit.
      }
    });
  }, [user, movies]);

  useEffect(() => {
    if (!user || !movies || !engagement.badges.watchlistMilestones) return;
    for (const threshold of WATCHLIST_MILESTONES) {
      if (movies.length < threshold) continue;
      void awardBadgeOnce(user.uid, {
        id: `watchlist-milestone-${threshold}`,
        type: "watchlist-milestone",
        label: `Watchlist of ${threshold}+`,
        description: `Kept ${threshold} or more movies on your watchlist.`,
      });
    }
  }, [user, movies]);

  // A tall skeleton is right for "fetching a signed-in user's watchlist",
  // but auth resolving to "not signed in" is the common case for a
  // first-time or anonymous visit — collapsing straight from that tall
  // grid down to the one-line sign-in message was the single biggest
  // layout shift on the page (CLS ~0.96 in a Lighthouse run). Keep the
  // auth-pending skeleton the same shape as the sign-in message itself so
  // there's nothing to collapse from in that case.
  if (authLoading) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="sr-only">Watchlist</h1>
        <Skeleton className="mx-auto h-7 w-32" />
        <Skeleton className="mx-auto h-5 w-56" />
      </div>
    );
  }

  if (user && movies === null) {
    return (
      <div className="space-y-4">
        <h1 className="sr-only">Watchlist</h1>
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">Watchlist</h1>
        <p className="text-muted-foreground">
          Sign in to keep movies on your radar.
        </p>
      </div>
    );
  }

  if (!movies || movies.length === 0) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">Your watchlist is empty.</h1>
        <p className="text-muted-foreground">
          While exploring a filmography, tap the bookmark icon on a movie to add
          it here — or start from a followed person's page or a search result.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button render={<a href="/search" />}>
            Search actors & directors
          </Button>
          <Button variant="outline" render={<a href="/filmographies" />}>
            My Filmographies
          </Button>
        </div>
      </div>
    );
  }

  const watchedCount = movies.filter((m) => seenIds.has(m.tmdbId)).length;
  const unwatchedCount = movies.length - watchedCount;

  const byWatchedStatus = movies.filter((m) => {
    if (watchedFilter === "watched") return seenIds.has(m.tmdbId);
    if (watchedFilter === "unwatched") return !seenIds.has(m.tmdbId);
    return true;
  });

  // Genres present in the watchlist, sorted by how many movies carry each —
  // most useful ones first instead of alphabetical noise. Movies added
  // before genreIds existed just don't show up in any genre chip below (but
  // still show under "All").
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
      ? byWatchedStatus
      : byWatchedStatus.filter((m) => m.genreIds?.includes(genreFilter));
  const sorted = sortMovies(filtered, order);

  const unwatchedMovies = movies.filter((m) => !seenIds.has(m.tmdbId));

  const toggleWatched = (movie: WatchlistMovie) => {
    const next = !seenIds.has(movie.tmdbId);
    announce(`${next ? "Marked" : "Unmarked"} ${movie.title} as watched`);
    const write = next
      ? markMovieSeen(user.uid, {
          tmdbId: movie.tmdbId,
          title: movie.title,
          posterPath: movie.posterPath,
          releaseYear: movie.releaseYear,
          voteAverage: movie.voteAverage,
          genreIds: movie.genreIds,
        })
      : unmarkMovieSeen(user.uid, movie.tmdbId);
    write.catch(() =>
      toast.error(`Couldn't update "${movie.title}". Please try again.`),
    );
  };

  function pickRandom() {
    const pool = unwatchedMovies.length > 0 ? unwatchedMovies : movies!;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setOpenMovieId(pick.tmdbId);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">My Watchlist</h1>
        <p className="text-sm text-muted-foreground">
          {movies.length} movies · {watchedCount} watched · {unwatchedCount} to
          watch
        </p>
        <FilmographyProgress
          watchedCount={watchedCount}
          totalCount={movies.length}
        />
      </div>

      <Button
        size="lg"
        className="h-auto w-full flex-col items-start gap-0.5 py-3 sm:w-auto sm:flex-row sm:items-center sm:gap-2"
        onClick={pickRandom}
      >
        <span className="flex items-center gap-2">
          <ShuffleIcon />
          Pick something for me
        </span>
        <span className="text-xs font-normal opacity-80">
          Picks a random movie from your watchlist
        </span>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full border p-1">
          <Button
            size="sm"
            variant={watchedFilter === "all" ? "default" : "ghost"}
            onClick={() => setWatchedFilter("all")}
          >
            All ({movies.length})
          </Button>
          <Button
            size="sm"
            variant={watchedFilter === "unwatched" ? "default" : "ghost"}
            onClick={() => setWatchedFilter("unwatched")}
          >
            To watch ({unwatchedCount})
          </Button>
          <Button
            size="sm"
            variant={watchedFilter === "watched" ? "default" : "ghost"}
            onClick={() => setWatchedFilter("watched")}
          >
            Watched ({watchedCount})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={order}
            onValueChange={(value) => setOrder(value as SortOrder)}
          >
            <SelectTrigger size="sm" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="rating">Highest rated</SelectItem>
              <SelectItem value="alphabetical">A–Z</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1 rounded-full border p-1">
            <Button
              size="icon-sm"
              variant={viewMode === "grid" ? "default" : "ghost"}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGridIcon />
            </Button>
            <Button
              size="icon-sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
            >
              <ListIcon />
            </Button>
          </div>
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

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No movies match these filters.
        </p>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {sorted.map((movie) => (
            <WatchlistGridCard
              key={movie.tmdbId}
              movie={movie}
              watched={seenIds.has(movie.tmdbId)}
              onOpen={() => setOpenMovieId(movie.tmdbId)}
              onToggleWatched={() => toggleWatched(movie)}
              onRemove={() => {
                void removeFromWatchlist(user.uid, movie.tmdbId);
                announce(`Removed ${movie.title} from watchlist`);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((movie) => (
            <WatchlistListRow
              key={movie.tmdbId}
              movie={movie}
              watched={seenIds.has(movie.tmdbId)}
              onOpen={() => setOpenMovieId(movie.tmdbId)}
              onToggleWatched={() => toggleWatched(movie)}
              onRemove={() => {
                void removeFromWatchlist(user.uid, movie.tmdbId);
                announce(`Removed ${movie.title} from watchlist`);
              }}
            />
          ))}
        </div>
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

interface CardProps {
  readonly movie: WatchlistMovie;
  readonly watched: boolean;
  readonly onOpen: () => void;
  readonly onToggleWatched: () => void;
  readonly onRemove: () => void;
}

function WatchlistGridCard({
  movie,
  watched,
  onOpen,
  onToggleWatched,
  onRemove,
}: CardProps) {
  const duration = formatDuration(movie.durationMinutes);
  const genre =
    movie.genreIds?.[0] != null ? genreName(movie.genreIds[0]) : null;

  return (
    <div>
      <div className="card-elevated group relative overflow-hidden rounded-lg border">
        <button
          type="button"
          onClick={onOpen}
          className="focus-ring block w-full"
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

        <MovieActions
          movie={{ tmdbMovieId: movie.tmdbId, title: movie.title }}
          watched={watched}
          inWatchlist={true}
          onToggleWatched={onToggleWatched}
          onToggleWatchlist={onRemove}
        />
      </div>

      <p className="mt-1 truncate font-medium">{movie.title}</p>
      <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
        <span>{movie.releaseYear ?? "Unknown"}</span>
        {typeof movie.voteAverage === "number" && (
          <span>· {Math.round(movie.voteAverage * 10)}%</span>
        )}
        {duration && <span>· {duration}</span>}
        {genre && <span>· {genre}</span>}
      </p>
      {movie.sourcePersonId != null && movie.sourcePersonName && (
        <p className="truncate text-sm text-muted-foreground">
          via{" "}
          <a
            href={`/person/${movie.sourcePersonId}`}
            className="focus-ring hover:underline"
          >
            {movie.sourcePersonName}
          </a>
        </p>
      )}
    </div>
  );
}

function WatchlistListRow({
  movie,
  watched,
  onOpen,
  onToggleWatched,
  onRemove,
}: CardProps) {
  const duration = formatDuration(movie.durationMinutes);
  const genre =
    movie.genreIds?.[0] != null ? genreName(movie.genreIds[0]) : null;

  return (
    <div className="card-elevated flex items-center gap-3 overflow-hidden rounded-lg border p-2">
      <button
        type="button"
        onClick={onOpen}
        className="focus-ring block shrink-0"
        aria-label={`View details for ${movie.title}`}
      >
        {movie.posterPath ? (
          <img
            src={tmdbImageUrl(movie.posterPath, 92)}
            alt=""
            loading="lazy"
            className="h-20 w-14 rounded object-cover"
          />
        ) : (
          <div className="flex h-20 w-14 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
            No poster
          </div>
        )}
      </button>

      <button
        type="button"
        onClick={onOpen}
        className="focus-ring min-w-0 flex-1 text-left"
      >
        <p className="truncate font-medium">{movie.title}</p>
        <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
          <span>{movie.releaseYear ?? "Unknown"}</span>
          {typeof movie.voteAverage === "number" && (
            <span>· {Math.round(movie.voteAverage * 10)}%</span>
          )}
          {duration && (
            <span className="inline-flex items-center gap-0.5">
              · <ClockIcon className="size-3" /> {duration}
            </span>
          )}
          {genre && <span>· {genre}</span>}
        </p>
      </button>

      <MovieActions
        movie={{ tmdbMovieId: movie.tmdbId, title: movie.title }}
        watched={watched}
        inWatchlist={true}
        onToggleWatched={onToggleWatched}
        onToggleWatchlist={onRemove}
        size="sm"
        placement="inline"
      />
    </div>
  );
}
