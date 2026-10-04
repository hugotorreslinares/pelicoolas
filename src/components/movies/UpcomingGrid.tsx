import { MovieActions } from "./MovieActions";
import { useMovieActionState } from "@/lib/hooks/useMovieActionState";
import { daysUntil, todayIso } from "@/lib/releaseChallenge";
import { tmdbImageUrl, tmdbWidthSrcSet } from "@/lib/tmdb/image";
import { getDictionary, type Locale } from "@/i18n";
import type { UpcomingMovie } from "@/lib/tmdb/movies";

interface UpcomingGridProps {
  readonly locale: Locale;
  readonly movies: readonly UpcomingMovie[];
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function UpcomingCard({
  movie,
  locale,
}: {
  readonly movie: UpcomingMovie;
  readonly locale: Locale;
}) {
  const t = getDictionary(locale).upcoming;
  const { watched, inWatchlist, ready, toggleWatched, toggleWatchlist } =
    useMovieActionState(movie);
  const days = daysUntil(movie.releaseDate, todayIso());
  const dateLabel = new Date(
    `${movie.releaseDate}T12:00:00`,
  ).toLocaleDateString(locale === "es" ? "es-ES" : "en-US", {
    day: "numeric",
    month: "short",
  });
  return (
    <div>
      <div className="card-elevated relative overflow-hidden rounded-lg border">
        <a href={`/movie/${movie.tmdbMovieId}`} className="focus-ring block">
          {movie.posterPath ? (
            <img
              src={tmdbImageUrl(movie.posterPath, 342)}
              srcSet={tmdbWidthSrcSet(movie.posterPath, [185, 342])}
              sizes="(min-width: 768px) 16vw, (min-width: 640px) 25vw, 33vw"
              alt=""
              loading="lazy"
              className="aspect-[2/3] w-full bg-muted object-cover"
            />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center bg-muted p-2 text-center text-xs text-muted-foreground">
              {movie.title}
            </div>
          )}
        </a>
        <MovieActions
          movie={movie}
          watched={watched}
          inWatchlist={inWatchlist}
          onToggleWatched={toggleWatched}
          onToggleWatchlist={toggleWatchlist}
          disabled={!ready}
        />
        <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-semibold shadow">
          {days <= 0 ? t.today : days === 1 ? t.tomorrow : t.inDays(days)}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm leading-tight font-medium">
        {movie.title}
      </p>
      <p className="text-xs text-muted-foreground">{dateLabel}</p>
    </div>
  );
}

export function UpcomingGrid({ locale, movies }: UpcomingGridProps) {
  const groups = new Map<string, UpcomingMovie[]>();
  for (const m of movies) {
    const key = monthKey(m.releaseDate);
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  return (
    <div className="space-y-8">
      {[...groups.entries()].map(([key, items]) => (
        <section key={key} className="space-y-3">
          <h2 className="font-display text-xl font-bold first-letter:uppercase">
            {new Date(`${key}-15T12:00:00`).toLocaleDateString(
              locale === "es" ? "es-ES" : "en-US",
              { month: "long", year: "numeric" },
            )}
          </h2>
          <div className="stagger-in grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {items.map((m) => (
              <UpcomingCard key={m.tmdbMovieId} movie={m} locale={locale} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
