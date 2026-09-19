import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckIcon, Share2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginButton } from "@/components/auth/LoginButton";
import { FilmographyProgress } from "@/components/filmography/FilmographyProgress";
import { MovieDetailsDialog } from "@/components/filmography/MovieDetailsDialog";
import { MovieActions } from "@/components/movies/MovieActions";
import { useAuth } from "@/lib/hooks/useAuth";
import { useMovieActionState } from "@/lib/hooks/useMovieActionState";
import {
  setChallengeMovies,
  subscribeToSeenMovies,
  subscribeToWatchlist,
} from "@/lib/firebase/firestore";
import { awardBadgeOnce } from "@/lib/firebase/badges";
import { shareContent } from "@/lib/shareProfile";
import {
  HALLOWEEN_CHALLENGE_ID,
  HALLOWEEN_SIZE,
  daysLeft,
  pickInitial,
  pickRandom,
} from "@/lib/halloween";
import { tmdbImageUrl, tmdbWidthSrcSet } from "@/lib/tmdb/image";
import { getDictionary, type Locale } from "@/i18n";
import type { WatchlistMovie } from "@/types/filmography";
import type { TrendingMovie } from "@/types/movie";

const POSTER_WIDTHS = [185, 342];
const POSTER_SIZES = "(min-width: 768px) 16vw, (min-width: 640px) 25vw, 33vw";

interface HalloweenChallengeProps {
  readonly locale: Locale;
}

function toTrending(m: WatchlistMovie): TrendingMovie {
  return {
    tmdbMovieId: m.tmdbId,
    title: m.title,
    posterPath: m.posterPath,
    releaseYear: m.releaseYear,
    voteAverage: m.voteAverage,
    genreIds: m.genreIds ? [...m.genreIds] : [],
    mediaType: "movie",
  };
}

function Poster({
  movie,
  dim,
}: {
  readonly movie: TrendingMovie;
  readonly dim?: boolean;
}) {
  return movie.posterPath ? (
    <img
      src={tmdbImageUrl(movie.posterPath, 185)}
      srcSet={tmdbWidthSrcSet(movie.posterPath, POSTER_WIDTHS)}
      sizes={POSTER_SIZES}
      alt=""
      loading="lazy"
      className={`aspect-[2/3] w-full rounded-lg border object-cover transition-opacity ${dim ? "opacity-40" : ""}`}
    />
  ) : (
    <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
      {movie.title}
    </div>
  );
}

// Selectable poster used by both the ranked grid and the search results.
function PickCard({
  movie,
  on,
  onToggle,
  selectLabel,
  deselectLabel,
}: {
  readonly movie: TrendingMovie;
  readonly on: boolean;
  readonly onToggle: () => void;
  readonly selectLabel: string;
  readonly deselectLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={on ? deselectLabel : selectLabel}
      className="focus-ring relative text-left"
    >
      <Poster movie={movie} dim={!on} />
      {on && (
        <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
          <CheckIcon className="size-4" />
        </span>
      )}
      <p className="mt-1 truncate text-xs font-medium">{movie.title}</p>
    </button>
  );
}

// Progress-mode card: same watched/watchlist controls as everywhere else, so
// marking a movie watched here is the same one-tap action as anywhere in the app.
function ProgressCard({
  movie,
  onOpen,
}: {
  readonly movie: TrendingMovie;
  readonly onOpen: () => void;
}) {
  const { watched, inWatchlist, ready, toggleWatched, toggleWatchlist } =
    useMovieActionState(movie, onOpen);
  return (
    <div>
      <div className="card-elevated relative overflow-hidden rounded-lg">
        <button
          type="button"
          onClick={onOpen}
          className="focus-ring block w-full"
        >
          <Poster movie={movie} dim={watched} />
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
      <p className="mt-1 truncate text-xs font-medium">{movie.title}</p>
    </div>
  );
}

export function HalloweenChallenge({ locale }: HalloweenChallengeProps) {
  const t = getDictionary(locale).halloween;
  const { user, loading: authLoading } = useAuth();
  const [watchlist, setWatchlist] = useState<readonly WatchlistMovie[] | null>(
    null,
  );
  const [seenIds, setSeenIds] = useState<ReadonlySet<number> | null>(null);
  const [candidates, setCandidates] = useState<readonly TrendingMovie[] | null>(
    null,
  );
  const [candidatesError, setCandidatesError] = useState(false);
  const [candidatesGen, setCandidatesGen] = useState(0);
  const [editing, setEditing] = useState(false);
  const [selection, setSelection] = useState<ReadonlySet<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [openMovieId, setOpenMovieId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly TrendingMovie[] | null>(null);
  const [searchError, setSearchError] = useState(false);
  // Movies found via search — kept in the pool so they stay pickable/visible
  // after the query is cleared.
  const [extras, setExtras] = useState<readonly TrendingMovie[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubs = [
      subscribeToWatchlist(user.uid, setWatchlist),
      subscribeToSeenMovies(user.uid, setSeenIds),
    ];
    return () => unsubs.forEach((u) => u());
  }, [user]);

  const challenge = useMemo(
    () =>
      (watchlist ?? [])
        .filter((m) => m.challenge === HALLOWEEN_CHALLENGE_ID)
        .map(toTrending),
    [watchlist],
  );
  const building = challenge.length === 0 || editing;

  // Candidates are only needed while building/editing.
  useEffect(() => {
    if (!user || watchlist === null || !building || candidates) return;
    let cancelled = false;
    setCandidatesError(false);
    fetch("/api/challenge/halloween")
      .then((r) => {
        if (!r.ok) throw new Error("request failed");
        return r.json() as Promise<{ results: readonly TrendingMovie[] }>;
      })
      .then((d) => !cancelled && setCandidates(d.results))
      .catch(() => !cancelled && setCandidatesError(true));
    return () => {
      cancelled = true;
    };
  }, [user, watchlist, building, candidates, candidatesGen]);

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

  // The pool to pick from: current list first (so edits keep them), then ranked candidates.
  const pool = useMemo(() => {
    const byId = new Map<number, TrendingMovie>();
    // Already-watched candidates are useless for a "watch before Oct 31"
    // list, so hide them (the user's current list is always kept).
    const unseen = (candidates ?? []).filter(
      (m) => !seenIds?.has(m.tmdbMovieId),
    );
    for (const m of [...challenge, ...extras, ...unseen]) {
      if (!byId.has(m.tmdbMovieId)) byId.set(m.tmdbMovieId, m);
    }
    return [...byId.values()];
  }, [challenge, extras, candidates, seenIds]);

  // Seed the selection once the data needed to choose is in.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!building || seeded || !candidates || !seenIds || watchlist === null)
      return;
    setSelection(
      new Set(
        (challenge.length > 0
          ? challenge
          : pickInitial(candidates, seenIds)
        ).map((m) => m.tmdbMovieId),
      ),
    );
    setSeeded(true);
  }, [building, seeded, candidates, seenIds, watchlist, challenge]);

  const watchedCount = challenge.filter((m) =>
    seenIds?.has(m.tmdbMovieId),
  ).length;
  const done =
    challenge.length >= HALLOWEEN_SIZE && watchedCount >= challenge.length;

  useEffect(() => {
    if (!user || !done) return;
    void awardBadgeOnce(user.uid, {
      id: HALLOWEEN_CHALLENGE_ID,
      type: "challenge",
      label: "Halloween Marathon",
      description: "Watched all 31 horror movies before October 31.",
    });
  }, [user, done]);

  async function shareList() {
    const url = `${window.location.origin}/halloween`;
    const titles = challenge
      .map(
        (m, i) =>
          `${i + 1}. ${m.title}${seenIds?.has(m.tmdbMovieId) ? " ✓" : ""}`,
      )
      .join("\n");
    const text = t.shareText(watchedCount, challenge.length, titles);
    const result = await shareContent(
      url,
      t.shareTitle,
      text,
      `${text} ${url}`,
    );
    if (result === "copied") toast.success(t.listCopied);
    if (result === "failed") toast.error(t.couldntShare);
  }

  // A fresh random 31 from the unwatched pool on every press (replaces the
  // current selection — that's the point of "pick for me").
  function selectForMe() {
    setSelection(new Set(pickRandom(pool).map((m) => m.tmdbMovieId)));
  }

  function toggleSearchResult(m: TrendingMovie) {
    setExtras((prev) =>
      prev.some((e) => e.tmdbMovieId === m.tmdbMovieId) ? prev : [m, ...prev],
    );
    toggle(m.tmdbMovieId);
  }

  function toggle(id: number) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < HALLOWEEN_SIZE) next.add(id);
      return next;
    });
  }

  async function save() {
    if (!user || !watchlist) return;
    setSaving(true);
    try {
      await setChallengeMovies(
        user.uid,
        HALLOWEEN_CHALLENGE_ID,
        pool.filter((m) => selection.has(m.tmdbMovieId)),
        new Set(watchlist.map((m) => m.tmdbId)),
        challenge.map((m) => m.tmdbMovieId),
      );
      toast.success(t.saved);
      setEditing(false);
      setSeeded(false);
    } catch {
      toast.error(t.couldntSave);
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">{t.heading}</h1>
      <p className="text-sm text-muted-foreground">
        {t.subtitle} · {t.daysLeft(daysLeft(new Date()))}
      </p>
    </div>
  );

  if (authLoading) {
    return (
      <div className="space-y-3">
        {header}
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="space-y-3">
        {header}
        <p className="text-muted-foreground">{t.signInPrompt}</p>
        <LoginButton size="sm" locale={locale} />
      </div>
    );
  }

  const loading =
    watchlist === null ||
    seenIds === null ||
    (building && !candidates && !candidatesError);

  if (loading) {
    return (
      <div className="space-y-4">
        {header}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (building && candidatesError) {
    return (
      <div className="space-y-3">
        {header}
        <p className="text-sm text-muted-foreground">{t.couldntLoad}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCandidatesGen((g) => g + 1)}
        >
          {t.retry}
        </Button>
      </div>
    );
  }

  if (building) {
    return (
      <div className="space-y-4">
        {header}
        <div>
          <p className="font-medium">{t.pickTitle}</p>
          <p className="text-sm text-muted-foreground">{t.pickBody}</p>
        </div>
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
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {results.map((m) => (
                <PickCard
                  key={m.tmdbMovieId}
                  movie={m}
                  on={selection.has(m.tmdbMovieId)}
                  onToggle={() => toggleSearchResult(m)}
                  selectLabel={t.select(m.title)}
                  deselectLabel={t.deselect(m.title)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-background/95 py-2 backdrop-blur">
          <span className="text-sm font-medium">
            {t.selected(selection.size, HALLOWEEN_SIZE)}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={selectForMe}>
              {t.selectForMe}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={selection.size === 0}
              onClick={() => setSelection(new Set())}
            >
              {t.clearAll}
            </Button>
            {challenge.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setSeeded(false);
                }}
              >
                {t.cancel}
              </Button>
            )}
            <Button
              size="sm"
              disabled={saving || selection.size === 0}
              onClick={() => void save()}
            >
              {saving ? t.saving : t.save}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {pool.map((m) => (
            <PickCard
              key={m.tmdbMovieId}
              movie={m}
              on={selection.has(m.tmdbMovieId)}
              onToggle={() => toggle(m.tmdbMovieId)}
              selectLabel={t.select(m.title)}
              deselectLabel={t.deselect(m.title)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}
      <FilmographyProgress
        watchedCount={watchedCount}
        totalCount={challenge.length}
      />
      <p className="text-sm font-medium">
        {t.progress(watchedCount, challenge.length)}
      </p>
      {done && (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm">
          {t.complete}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditing(true);
            setSeeded(false);
          }}
        >
          {t.edit}
        </Button>
        <Button size="sm" onClick={() => void shareList()}>
          <Share2Icon data-icon="inline-start" />
          {t.share}
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {challenge.map((m) => (
          <ProgressCard
            key={m.tmdbMovieId}
            movie={m}
            onOpen={() => setOpenMovieId(m.tmdbMovieId)}
          />
        ))}
      </div>
      {openMovieId !== null && (
        <MovieDetailsDialog
          movieId={openMovieId}
          open
          onOpenChange={(open) => !open && setOpenMovieId(null)}
        />
      )}
    </div>
  );
}
