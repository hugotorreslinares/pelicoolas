import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { adjacentItem } from "@/lib/adjacentItem";
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
import { fetchMovieDetails, fetchTVDetails } from "@/lib/movieData";
import { tmdbImageUrl, tmdbWidthSrcSet } from "@/lib/tmdb/image";
import { genreName } from "@/lib/tmdb/genres";
import { getDictionary, type Locale } from "@/i18n";
import { useLocale } from "@/lib/hooks/useLocale";
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

interface WatchlistPageProps {
  readonly locale: Locale;
}

export function WatchlistPage({ locale }: WatchlistPageProps) {
  const t = getDictionary(locale);
  const { user, loading: authLoading } = useAuth();
  const [movies, setMovies] = useState<readonly WatchlistMovie[] | null>(null);
  const [seenIds, setSeenIds] = useState<ReadonlySet<number>>(new Set());
  const [order, setOrder] = useState<SortOrder>("newest");
  const [genreFilter, setGenreFilter] = useState<number | typeof ALL_GENRES>(
    ALL_GENRES,
  );
  const [watchedFilter, setWatchedFilter] = useState<WatchedFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode);
  const [openMovie, setOpenMovie] = useState<WatchlistMovie | null>(null);

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
  // the same fetchMovieDetails call for both — no extra TMDB requests. TV
  // entries have no runtime, and ones added before real TV genre ids were
  // wired up (see lib/tmdb/tv.ts) stored an explicit empty array rather
  // than `undefined` — caught here too so old shows don't stay ungenred.
  const backfilledRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!user || !movies) return;
    const toBackfill = movies.filter(
      (m) =>
        !backfilledRef.current.has(m.tmdbId) &&
        (m.genreIds === undefined ||
          (m.mediaType === "tv" && m.genreIds.length === 0)),
    );
    if (toBackfill.length === 0) return;

    for (const movie of toBackfill) backfilledRef.current.add(movie.tmdbId);
    void mapWithConcurrency(toBackfill, 6, async (movie) => {
      try {
        if (movie.mediaType === "tv") {
          const details = await fetchTVDetails(movie.tmdbId);
          if (details) {
            await setWatchlistDetails(
              user.uid,
              movie.tmdbId,
              { genreIds: details.genreIds, durationMinutes: null },
              "tv",
            );
          }
          return;
        }
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
        <h1 className="sr-only">{t.watchlist.heading}</h1>
        <Skeleton className="mx-auto h-7 w-32" />
        <Skeleton className="mx-auto h-5 w-56" />
      </div>
    );
  }

  if (user && movies === null) {
    return (
      <div className="space-y-4">
        <h1 className="sr-only">{t.watchlist.heading}</h1>
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
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
        <h1 className="text-xl font-semibold">{t.watchlist.heading}</h1>
        <p className="text-muted-foreground">{t.watchlist.signInPrompt}</p>
      </div>
    );
  }

  if (!movies || movies.length === 0) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold">{t.watchlist.emptyHeading}</h1>
        <p className="text-muted-foreground">{t.watchlist.emptyBody}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button render={<a href="/search" />}>
            {t.watchlist.searchActorsDirectors}
          </Button>
          <Button variant="outline" render={<a href="/filmographies" />}>
            {t.watchlist.myFilmographies}
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
  // Same order as what's rendered below — swiping the dialog's poster
  // steps through this list, respecting the current filter/sort.
  const navNext = adjacentItem(sorted, openMovie);

  const unwatchedMovies = movies.filter((m) => !seenIds.has(m.tmdbId));

  const toggleWatched = (movie: WatchlistMovie) => {
    const next = !seenIds.has(movie.tmdbId);
    announce(t.watchlist.markedWatched(movie.title, next));
    const write = next
      ? markMovieSeen(user.uid, {
          tmdbId: movie.tmdbId,
          title: movie.title,
          posterPath: movie.posterPath,
          releaseYear: movie.releaseYear,
          voteAverage: movie.voteAverage,
          genreIds: movie.genreIds,
          mediaType: movie.mediaType,
        })
      : unmarkMovieSeen(user.uid, movie.tmdbId, movie.mediaType);
    write.catch(() => toast.error(t.watchlist.couldntUpdate(movie.title)));
  };

  function pickRandom() {
    const pool = unwatchedMovies.length > 0 ? unwatchedMovies : movies!;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setOpenMovie(pick);
  }

  const watchedFilterGroup = (
    <div className="flex gap-1 rounded-full border p-1">
      <Button
        size="sm"
        variant={watchedFilter === "all" ? "default" : "ghost"}
        onClick={() => setWatchedFilter("all")}
      >
        {t.watchlist.filterAll(movies.length)}
      </Button>
      <Button
        size="sm"
        variant={watchedFilter === "unwatched" ? "default" : "ghost"}
        onClick={() => setWatchedFilter("unwatched")}
      >
        {t.watchlist.filterToWatch(unwatchedCount)}
      </Button>
      <Button
        size="sm"
        variant={watchedFilter === "watched" ? "default" : "ghost"}
        onClick={() => setWatchedFilter("watched")}
      >
        {t.watchlist.filterWatched(watchedCount)}
      </Button>
    </div>
  );

  const sortSelect = (
    <Select
      value={order}
      onValueChange={(value) => setOrder(value as SortOrder)}
    >
      <SelectTrigger size="sm" aria-label={t.watchlist.sortBy}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">{t.watchlist.sortNewest}</SelectItem>
        <SelectItem value="oldest">{t.watchlist.sortOldest}</SelectItem>
        <SelectItem value="rating">{t.watchlist.sortRating}</SelectItem>
        <SelectItem value="alphabetical">
          {t.watchlist.sortAlphabetical}
        </SelectItem>
      </SelectContent>
    </Select>
  );

  const genreChips = availableGenres.length > 0 && (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant={genreFilter === ALL_GENRES ? "default" : "outline"}
        onClick={() => setGenreFilter(ALL_GENRES)}
      >
        {t.watchlist.allGenres}
      </Button>
      {availableGenres.map((id) => (
        <Button
          key={id}
          size="sm"
          variant={genreFilter === id ? "default" : "outline"}
          onClick={() => setGenreFilter(id)}
        >
          {genreName(id) ?? t.watchlist.otherGenre}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t.watchlist.myWatchlist}</h1>
        <p className="text-sm text-muted-foreground">
          {t.watchlist.stats(movies.length, watchedCount, unwatchedCount)}
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
          {t.watchlist.pickForMe}
        </span>
        <span className="text-xs font-normal opacity-80">
          {t.watchlist.pickForMeSubtitle}
        </span>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {watchedFilterGroup}

        <div className="flex items-center gap-2">
          {sortSelect}

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
        </div>
      </div>

      {genreChips}

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {t.watchlist.noMoviesMatch}
        </p>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {sorted.map((movie) => (
            <WatchlistGridCard
              key={movie.tmdbId}
              movie={movie}
              watched={seenIds.has(movie.tmdbId)}
              onOpen={() => setOpenMovie(movie)}
              onToggleWatched={() => toggleWatched(movie)}
              onRemove={() => {
                void removeFromWatchlist(
                  user.uid,
                  movie.tmdbId,
                  movie.mediaType,
                );
                announce(t.cards.removedFromWatchlist(movie.title));
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
              onOpen={() => setOpenMovie(movie)}
              onToggleWatched={() => toggleWatched(movie)}
              onRemove={() => {
                void removeFromWatchlist(
                  user.uid,
                  movie.tmdbId,
                  movie.mediaType,
                );
                announce(t.cards.removedFromWatchlist(movie.title));
              }}
            />
          ))}
        </div>
      )}

      {openMovie !== null && (
        <MovieDetailsDialog
          movieId={openMovie.tmdbId}
          mediaType={openMovie.mediaType}
          open={openMovie !== null}
          onOpenChange={(open) => !open && setOpenMovie(null)}
          onNavigate={(direction) => {
            const target = direction === 1 ? navNext.next : navNext.previous;
            if (target) setOpenMovie(target);
          }}
          hasPrevious={navNext.previous !== null}
          hasNext={navNext.next !== null}
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
  const t = getDictionary(useLocale());
  const duration = formatDuration(movie.durationMinutes);
  const genre =
    movie.genreIds?.[0] != null ? genreName(movie.genreIds[0]) : null;

  return (
    <div>
      <div className="card-elevated group relative overflow-hidden rounded-sm border">
        <button
          type="button"
          onClick={onOpen}
          className="focus-ring block w-full"
          aria-label={t.cards.viewDetailsFor(movie.title)}
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
              {t.cards.noPoster}
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
        <span>{movie.releaseYear ?? t.cards.unknownYear}</span>
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
  const t = getDictionary(useLocale());
  const duration = formatDuration(movie.durationMinutes);
  const genre =
    movie.genreIds?.[0] != null ? genreName(movie.genreIds[0]) : null;

  return (
    <div className="card-elevated flex items-center gap-3 overflow-hidden rounded-lg border p-2">
      <button
        type="button"
        onClick={onOpen}
        className="focus-ring block shrink-0"
        aria-label={t.cards.viewDetailsFor(movie.title)}
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
            {t.cards.noPoster}
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
          <span>{movie.releaseYear ?? t.cards.unknownYear}</span>
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
