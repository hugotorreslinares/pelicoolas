import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckIcon, PencilIcon, PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MovieDetailsDialog } from "@/components/filmography/MovieDetailsDialog";
import { MovieActions } from "@/components/movies/MovieActions";
import { useAuth } from "@/lib/hooks/useAuth";
import { useMovieActionState } from "@/lib/hooks/useMovieActionState";
import { announce } from "@/lib/a11y";
import {
  addMovieToList,
  removeMovieFromList,
  renameList,
  subscribeToListMovies,
  subscribeToLists,
} from "@/lib/firebase/lists";
import { tmdbImageUrl, tmdbWidthSrcSet } from "@/lib/tmdb/image";
import { getDictionary, type Locale } from "@/i18n";
import type { ListMovie, MovieList } from "@/types/lists";
import type { TrendingMovie } from "@/types/movie";

const POSTER_WIDTHS = [185, 342, 500];
const POSTER_SIZES = "(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw";

interface ListDetailPageProps {
  readonly userId: string;
  readonly listId: string;
  readonly locale: Locale;
}

export function ListDetailPage({
  userId,
  listId,
  locale,
}: ListDetailPageProps) {
  const t = getDictionary(locale).lists;
  const { user } = useAuth();
  const isOwner = user?.uid === userId;
  const [lists, setLists] = useState<readonly MovieList[] | null>(null);
  const [movies, setMovies] = useState<readonly ListMovie[] | null>(null);
  const [openMovie, setOpenMovie] = useState<ListMovie | null>(null);
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly TrendingMovie[] | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [removingIds, setRemovingIds] = useState<ReadonlySet<number>>(
    new Set(),
  );

  useEffect(() => subscribeToLists(userId, setLists), [userId]);
  useEffect(
    () => subscribeToListMovies(userId, listId, setMovies),
    [userId, listId],
  );

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      setSearchError(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/search-movie?q=${encodeURIComponent(q)}`)
        .then((r) => {
          if (!r.ok) throw new Error("request failed");
          return r.json() as Promise<{ results: readonly TrendingMovie[] }>;
        })
        .then((d) => {
          if (cancelled) return;
          setResults(d.results.slice(0, 12));
          setSearchError(false);
        })
        .catch(() => !cancelled && setSearchError(true));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const list = lists?.find((l) => l.id === listId) ?? null;
  const inListKeys = new Set(
    (movies ?? []).map((m) => `${m.mediaType ?? "movie"}-${m.tmdbId}`),
  );

  async function handleAdd(m: TrendingMovie) {
    try {
      await addMovieToList(userId, listId, {
        tmdbId: m.tmdbMovieId,
        title: m.title,
        posterPath: m.posterPath,
        releaseYear: m.releaseYear,
        voteAverage: m.voteAverage,
        mediaType: m.mediaType === "tv" ? "tv" : undefined,
      });
      toast.success(t.added(m.title));
    } catch {
      toast.error(t.couldntAdd(m.title));
    }
  }

  async function handleRemove(movie: ListMovie) {
    setRemovingIds((prev) => new Set(prev).add(movie.tmdbId));
    announce(t.removed(movie.title));
    try {
      await removeMovieFromList(userId, listId, movie.tmdbId, movie.mediaType);
    } catch {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(movie.tmdbId);
        return next;
      });
      toast.error(t.couldntRemove(movie.title));
    }
  }

  async function handleRename() {
    if (!list) return;
    const name = window.prompt(t.renamePrompt, list.name)?.trim();
    if (!name || name === list.name) return;
    try {
      await renameList(userId, listId, name);
    } catch {
      toast.error(t.couldntRename);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      announce(t.linkCopied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the URL is already in the address bar.
    }
  }

  if (lists !== null && !list) {
    return <p className="text-muted-foreground">{t.notFound}</p>;
  }

  if (!list) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="mb-3 aspect-[2/3] w-full break-inside-avoid rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  const visibleMovies = (movies ?? []).filter(
    (m) => !removingIds.has(m.tmdbId),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-semibold">
            {list.name}
            {isOwner && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t.renameList}
                onClick={() => void handleRename()}
              >
                <PencilIcon className="size-4" />
              </Button>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isOwner ? t.ownerSubtitle : t.visitorSubtitle}
          </p>
        </div>
        {isOwner && (
          <Button type="button" size="sm" variant="outline" onClick={copyLink}>
            {copied ? t.copied : t.copyLinkToShare}
          </Button>
        )}
      </div>

      {isOwner && (
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchAria}
          />
          {searchError && (
            <p className="text-sm text-destructive">{t.searchError}</p>
          )}
          {results !== null && results.length === 0 && !searchError && (
            <p className="text-sm text-muted-foreground">{t.noResults}</p>
          )}
          {results !== null && results.length > 0 && (
            <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
              {results.map((m) => (
                <SearchResultCard
                  key={m.tmdbMovieId}
                  movie={m}
                  inList={inListKeys.has(
                    `${m.mediaType ?? "movie"}-${m.tmdbMovieId}`,
                  )}
                  onAdd={() => void handleAdd(m)}
                  onRemove={() =>
                    void handleRemove({
                      tmdbId: m.tmdbMovieId,
                      title: m.title,
                      posterPath: m.posterPath,
                      releaseYear: m.releaseYear,
                      voteAverage: m.voteAverage,
                      addedAt: "",
                      mediaType: m.mediaType === "tv" ? "tv" : undefined,
                    })
                  }
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {movies === null && (
        <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="mb-3 aspect-[2/3] w-full break-inside-avoid rounded-lg"
            />
          ))}
        </div>
      )}

      {movies !== null && visibleMovies.length === 0 && (
        <p className="text-center text-muted-foreground">
          {isOwner ? t.emptyOwner : t.emptyVisitor}
        </p>
      )}

      {visibleMovies.length > 0 && (
        <div className="columns-2 gap-3 sm:columns-3 md:columns-4">
          {visibleMovies.map((movie) => (
            <ListMovieCard
              key={movie.tmdbId}
              movie={movie}
              isOwner={isOwner}
              onOpen={() => setOpenMovie(movie)}
              onRemove={() => void handleRemove(movie)}
              t={t}
            />
          ))}
        </div>
      )}

      {!isOwner && (
        <div className="rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-sm">{t.trackYourOwn}</p>
          <Button className="mt-2" size="sm" render={<a href="/search" />}>
            {t.tryPelicoolas}
          </Button>
        </div>
      )}

      {openMovie !== null && (
        <MovieDetailsDialog
          movieId={openMovie.tmdbId}
          mediaType={openMovie.mediaType}
          open
          onOpenChange={(open) => !open && setOpenMovie(null)}
        />
      )}
    </div>
  );
}

interface SearchResultCardProps {
  readonly movie: TrendingMovie;
  readonly inList: boolean;
  readonly onAdd: () => void;
  readonly onRemove: () => void;
  readonly t: ReturnType<typeof getDictionary>["lists"];
}

// Explicit add/remove button on every result — clicking the poster alone
// gave no visible feedback and no way to tell what was already added.
function SearchResultCard({
  movie,
  inList,
  onAdd,
  onRemove,
  t,
}: SearchResultCardProps) {
  return (
    <div className="mb-3 break-inside-avoid">
      <div className="relative overflow-hidden rounded-lg border">
        {movie.posterPath ? (
          <img
            src={tmdbImageUrl(movie.posterPath, 185)}
            alt=""
            loading="lazy"
            className="aspect-[2/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[2/3] w-full items-center justify-center bg-muted text-xs text-muted-foreground">
            {movie.title}
          </div>
        )}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant={inList ? "default" : "secondary"}
                size="icon"
                aria-label={
                  inList ? t.removeFrom(movie.title) : t.addTo(movie.title)
                }
                className="absolute right-2 bottom-2 size-11 rounded-full shadow"
                onClick={inList ? onRemove : onAdd}
              />
            }
          >
            {inList ? <CheckIcon /> : <PlusIcon />}
          </TooltipTrigger>
          <TooltipContent>
            {inList ? t.removeFrom(movie.title) : t.addTo(movie.title)}
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="mt-1 truncate text-xs font-medium">{movie.title}</p>
    </div>
  );
}

interface ListMovieCardProps {
  readonly movie: ListMovie;
  readonly isOwner: boolean;
  readonly onOpen: () => void;
  readonly onRemove: () => void;
  readonly t: ReturnType<typeof getDictionary>["lists"];
}

function ListMovieCard({
  movie,
  isOwner,
  onOpen,
  onRemove,
  t,
}: ListMovieCardProps) {
  const { watched, inWatchlist, ready, toggleWatched, toggleWatchlist } =
    useMovieActionState(
      {
        tmdbMovieId: movie.tmdbId,
        title: movie.title,
        posterPath: movie.posterPath,
        releaseYear: movie.releaseYear,
        voteAverage: movie.voteAverage,
        genreIds: [],
        mediaType: movie.mediaType,
      },
      onOpen,
    );

  return (
    <div className="mb-3 break-inside-avoid">
      <div className="card-elevated group relative overflow-hidden rounded-lg border">
        <button
          type="button"
          onClick={onOpen}
          className="focus-ring block w-full"
          aria-label={t.viewDetailsFor(movie.title)}
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
              {t.noPoster}
            </div>
          )}
        </button>

        {typeof movie.voteAverage === "number" && (
          <span className="absolute top-2 left-2 rounded-full bg-background/90 px-1.5 py-0.5 text-xs font-semibold shadow">
            {Math.round(movie.voteAverage * 10)}%
          </span>
        )}

        <MovieActions
          movie={{ tmdbMovieId: movie.tmdbId, title: movie.title }}
          watched={watched}
          inWatchlist={inWatchlist}
          onToggleWatched={toggleWatched}
          onToggleWatchlist={toggleWatchlist}
          disabled={!ready}
        />

        {isOwner && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  aria-label={t.removeFrom(movie.title)}
                  className="absolute right-2 bottom-2 size-11 rounded-full shadow"
                  onClick={onRemove}
                />
              }
            >
              <XIcon />
            </TooltipTrigger>
            <TooltipContent>{t.removeFrom(movie.title)}</TooltipContent>
          </Tooltip>
        )}
      </div>

      <p className="mt-1 truncate font-medium">{movie.title}</p>
      <p className="text-sm text-muted-foreground">
        {movie.releaseYear ?? t.unknown}
      </p>
    </div>
  );
}
