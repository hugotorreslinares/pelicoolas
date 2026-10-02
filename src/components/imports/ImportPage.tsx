import { useState } from "react";
import { SignInHero } from "@/components/auth/SignInHero";
import { toast } from "sonner";
import { CheckIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/hooks/useAuth";
import { extractImportRows, parseCsv, type ImportRow } from "@/lib/csv";
import { addManyToWatchlist, markManySeen } from "@/lib/firebase/firestore";
import { getDictionary, type Locale } from "@/i18n";
import type { TrendingMovie } from "@/types/movie";

type Destination = "watchlist" | "watched";

interface MatchRow extends ImportRow {
  readonly match: TrendingMovie | null;
}

interface ImportPageProps {
  readonly locale: Locale;
}

export function ImportPage({ locale }: ImportPageProps) {
  const t = getDictionary(locale).import;
  const { user, loading: authLoading } = useAuth();
  const [destination, setDestination] = useState<Destination>("watchlist");
  const [rows, setRows] = useState<readonly ImportRow[] | null>(null);
  const [matches, setMatches] = useState<readonly MatchRow[] | null>(null);
  const [excluded, setExcluded] = useState<ReadonlySet<number>>(new Set());
  const [matching, setMatching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleFile(file: File) {
    setMatches(null);
    setDone(false);
    if (/watchlist/i.test(file.name)) setDestination("watchlist");
    else if (/watched|ratings|seen/i.test(file.name)) setDestination("watched");

    const text = await file.text();
    const parsed = extractImportRows(parseCsv(text));
    if (parsed.length === 0) {
      toast.error(t.couldntRead);
      setRows(null);
      return;
    }
    setRows(parsed);
  }

  async function handleMatch() {
    if (!user || !rows) return;
    setMatching(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/import/match", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ rows }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(body?.error ?? t.couldntMatch);
        return;
      }
      const data = (await response.json()) as { matches: readonly MatchRow[] };
      setMatches(data.matches);
      setExcluded(
        new Set(
          data.matches
            .map((m, i) => (m.match ? null : i))
            .filter((i): i is number => i !== null),
        ),
      );
    } catch {
      toast.error(t.couldntMatch);
    } finally {
      setMatching(false);
    }
  }

  function toggle(index: number) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleImport() {
    if (!user || !matches) return;
    const selected = matches
      .filter((m, i) => m.match && !excluded.has(i))
      .map((m) => m.match as TrendingMovie);
    if (selected.length === 0) return;

    setImporting(true);
    try {
      if (destination === "watchlist") {
        await addManyToWatchlist(
          user.uid,
          selected.map((m) => ({
            tmdbId: m.tmdbMovieId,
            title: m.title,
            posterPath: m.posterPath,
            releaseYear: m.releaseYear,
            voteAverage: m.voteAverage,
            genreIds: m.genreIds,
            mediaType: m.mediaType,
          })),
        );
      } else {
        await markManySeen(
          user.uid,
          selected.map((m) => ({
            tmdbId: m.tmdbMovieId,
            title: m.title,
            posterPath: m.posterPath,
            releaseYear: m.releaseYear,
            voteAverage: m.voteAverage,
            genreIds: m.genreIds,
            mediaType: m.mediaType,
          })),
        );
      }
      toast.success(t.imported(selected.length));
      setDone(true);
    } catch {
      toast.error(t.couldntImport);
    } finally {
      setImporting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user) {
    return <SignInHero locale={locale} section="import" />;
  }

  const matchedCount = matches?.filter((m) => m.match).length ?? 0;
  const selectedCount =
    matches?.filter((m, i) => m.match && !excluded.has(i)).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t.heading}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {done ? (
        <div className="rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-sm">{t.imported(selectedCount)}</p>
          <Button
            className="mt-2"
            size="sm"
            render={
              <a
                href={destination === "watchlist" ? "/watchlist" : "/watched"}
              />
            }
          >
            {destination === "watchlist" ? t.viewWatchlist : t.viewWatched}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label className="focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-sm text-muted-foreground hover:border-foreground/30">
              <UploadIcon className="size-4" />
              {t.chooseFile}
              <input
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              {t.supportedFormats}
            </p>
          </div>

          {rows && !matches && (
            <div className="space-y-3">
              <p className="text-sm">{t.rowsFound(rows.length)}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={destination === "watchlist" ? "default" : "outline"}
                  onClick={() => setDestination("watchlist")}
                >
                  {t.destWatchlist}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={destination === "watched" ? "default" : "outline"}
                  onClick={() => setDestination("watched")}
                >
                  {t.destWatched}
                </Button>
              </div>
              <Button disabled={matching} onClick={() => void handleMatch()}>
                {matching ? t.matching : t.matchOnTmdb}
              </Button>
            </div>
          )}

          {matches && (
            <div className="space-y-3">
              <p className="text-sm">
                {t.matchSummary(matchedCount, matches.length)}
              </p>
              <ul className="max-h-80 space-y-1 overflow-y-auto text-sm">
                {matches.map((m, i) => (
                  <li
                    key={`${m.title}-${m.year}-${i}`}
                    className="flex items-center gap-2"
                  >
                    <button
                      type="button"
                      disabled={!m.match}
                      onClick={() => toggle(i)}
                      aria-label={
                        excluded.has(i)
                          ? t.include(m.title)
                          : t.exclude(m.title)
                      }
                      className="focus-ring flex size-5 shrink-0 items-center justify-center rounded border disabled:opacity-30"
                    >
                      {m.match && !excluded.has(i) && (
                        <CheckIcon className="size-3.5" />
                      )}
                    </button>
                    <span className={m.match ? "" : "text-muted-foreground"}>
                      {m.title}
                      {m.year ? ` (${m.year})` : ""}
                      {!m.match && ` — ${t.notFound}`}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                disabled={importing || selectedCount === 0}
                onClick={() => void handleImport()}
              >
                {importing ? t.importing : t.importSelected(selectedCount)}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
