import { tmdbFetch } from "./client";
import { getExternalRatings } from "@/lib/omdb";
import {
  tmdbCombinedCreditsResponseSchema,
  tmdbMovieDetailsResponseSchema,
  tmdbTrendingMoviesResponseSchema,
  tmdbUpcomingResponseSchema,
  tmdbMovieListResponseSchema,
  tmdbKeywordResponseSchema,
} from "@/types/tmdb";
import type { CreditDepartment } from "@/types/filmography";
import type {
  FilmographyMovie,
  ClipVideo,
  CrewMember,
  MovieDetails,
  TrendingMovie,
  WatchProviders,
} from "@/types/movie";
import type {
  TmdbMovieDetailsResponse,
  TmdbTVDetailsResponse,
} from "@/types/tmdb";

export function toReleaseYear(releaseDate: string | undefined): number | null {
  if (!releaseDate) return null;
  const year = Number(releaseDate.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : null;
}

/** Best YouTube trailer from TMDB's videos list: official first, else any trailer. */
export function pickTrailerKey(
  videos:
    | readonly {
        readonly key: string;
        readonly site: string;
        readonly type: string;
        readonly official?: boolean;
      }[]
    | undefined,
): string | null {
  const trailers = (videos ?? []).filter(
    (v) => v.site === "YouTube" && v.type === "Trailer",
  );
  return (trailers.find((v) => v.official) ?? trailers[0])?.key ?? null;
}

const CLIP_TYPES = ["Teaser", "Clip", "Featurette", "Behind the Scenes"];

export function pickStills(
  backdrops: readonly { readonly file_path: string }[] | undefined,
): readonly string[] {
  return (backdrops ?? []).slice(0, 12).map((b) => b.file_path);
}

/** Extra YouTube videos beyond the trailer: teasers, clips, featurettes, behind-the-scenes. */
export function pickClips(
  videos:
    | readonly {
        readonly key: string;
        readonly name?: string;
        readonly site: string;
        readonly type: string;
      }[]
    | undefined,
): readonly ClipVideo[] {
  return (videos ?? [])
    .filter((v) => v.site === "YouTube" && CLIP_TYPES.includes(v.type))
    .slice(0, 8)
    .map((v) => ({ key: v.key, name: v.name ?? v.type, type: v.type }));
}

const CREW_JOBS = [
  "Director",
  "Screenplay",
  "Writer",
  "Original Music Composer",
];

/** Directors, up to two writers and the composer — the credits people actually look for. */
export function pickKeyCrew(
  crew: readonly { id: number; name: string; job: string }[] | undefined,
): readonly CrewMember[] {
  const seen = new Set<string>();
  const out: CrewMember[] = [];
  let writers = 0;
  for (const job of CREW_JOBS) {
    for (const c of crew ?? []) {
      if (c.job !== job) continue;
      const isWriter = job === "Screenplay" || job === "Writer";
      if (isWriter && writers >= 2) continue;
      const key = `${c.id}-${isWriter ? "writer" : job}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (isWriter) writers++;
      out.push({
        personId: c.id,
        name: c.name,
        job: isWriter ? "Screenplay" : job,
      });
    }
  }
  return out;
}

export function dedupeByMovieId(
  movies: readonly FilmographyMovie[],
): readonly FilmographyMovie[] {
  const seen = new Map<number, FilmographyMovie>();
  for (const movie of movies) {
    if (!seen.has(movie.tmdbMovieId)) {
      seen.set(movie.tmdbMovieId, movie);
    }
  }
  return Array.from(seen.values());
}

export async function getFilmography(
  personId: number,
  department: CreditDepartment,
): Promise<readonly FilmographyMovie[]> {
  const data = await tmdbFetch(
    `/person/${personId}/combined_credits`,
    tmdbCombinedCreditsResponseSchema,
  );

  const credits =
    department === "Acting"
      ? data.cast.filter((c) => c.media_type === "movie")
      : data.crew.filter(
          (c) => c.media_type === "movie" && c.department === "Directing",
        );

  const movies = credits.map((c): FilmographyMovie => ({
    tmdbMovieId: c.id,
    title: c.title ?? "Untitled",
    posterPath: c.poster_path,
    releaseYear: toReleaseYear(c.release_date),
    releaseDate: c.release_date ?? null,
    character: "character" in c ? (c.character ?? null) : null,
    voteAverage: c.vote_average ?? null,
    genreIds: c.genre_ids ?? [],
  }));

  return dedupeByMovieId(movies);
}

const CAST_LIMIT = 10;

// Shared by getMovieDetails and getTVDetails — both request
// append_to_response=...,watch/providers and need the same
// pick-my-region-out-of-every-country mapping.
export function toWatchProviders(
  data: Pick<
    TmdbMovieDetailsResponse | TmdbTVDetailsResponse,
    "watch/providers"
  >,
  region: string,
): WatchProviders | null {
  const entry = data["watch/providers"]?.results[region];
  if (!entry) return null;
  const map = (list: typeof entry.flatrate) =>
    (list ?? []).map((p) => ({
      providerId: p.provider_id,
      providerName: p.provider_name,
      logoPath: p.logo_path,
    }));
  return {
    link: entry.link,
    flatrate: map(entry.flatrate),
    rent: map(entry.rent),
    buy: map(entry.buy),
    free: map(entry.free),
    ads: map(entry.ads),
  };
}

export async function getMovieDetails(
  movieId: number,
  region: string,
): Promise<MovieDetails> {
  const data = await tmdbFetch(
    `/movie/${movieId}`,
    tmdbMovieDetailsResponseSchema,
    {
      append_to_response: "credits,watch/providers,videos,images,keywords",
      include_image_language: "en,null",
      include_video_language: "en,es",
    },
  );

  const externalRatings = await getExternalRatings(data.imdb_id);

  return {
    id: data.id,
    title: data.title,
    posterPath: data.poster_path,
    backdropPath: data.backdrop_path ?? null,
    trailerKey: pickTrailerKey(data.videos?.results),
    stills: pickStills(data.images?.backdrops),
    clips: pickClips(data.videos?.results),
    keywords: (data.keywords?.keywords ?? []).slice(0, 8),
    collection: data.belongs_to_collection ?? null,
    releaseYear: toReleaseYear(data.release_date),
    overview: data.overview,
    runtimeMinutes: data.runtime,
    voteAverage: data.vote_average ?? null,
    genres: data.genres.map((g) => g.name),
    genreIds: data.genres.map((g) => g.id),
    crew: pickKeyCrew(data.credits?.crew),
    cast: (data.credits?.cast ?? []).slice(0, CAST_LIMIT).map((c) => ({
      personId: c.id,
      name: c.name,
      character: c.character ?? null,
      profilePath: c.profile_path,
    })),
    externalRatings,
    watchProviders: toWatchProviders(data, region),
  };
}

// /search/movie, /trending/movie/week, and /movie/{id}/similar all return
// this same summary shape — one mapper instead of duplicating it three times.
function toTrendingMovie(m: {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
  vote_average?: number;
  genre_ids?: number[];
}): TrendingMovie {
  return {
    tmdbMovieId: m.id,
    title: m.title,
    posterPath: m.poster_path,
    releaseYear: toReleaseYear(m.release_date),
    voteAverage: m.vote_average ?? null,
    genreIds: m.genre_ids ?? [],
  };
}

export async function searchMovie(
  query: string,
): Promise<readonly TrendingMovie[]> {
  const data = await tmdbFetch(
    "/search/movie",
    tmdbTrendingMoviesResponseSchema,
    { query, include_adult: "false" },
  );
  return data.results.map(toTrendingMovie);
}

const TRENDING_LIMIT = 10;

export async function getTrendingMovies(): Promise<readonly TrendingMovie[]> {
  const data = await tmdbFetch(
    "/trending/movie/week",
    tmdbTrendingMoviesResponseSchema,
  );
  return data.results.slice(0, TRENDING_LIMIT).map(toTrendingMovie);
}

const POPULAR_MOVIE_PAGES = 5; // 20 per page — enough to seed a sitemap without fanning out, mirrors getPopularPersonIds

export async function getPopularMovieIds(): Promise<readonly number[]> {
  const pages = await Promise.all(
    Array.from({ length: POPULAR_MOVIE_PAGES }, (_, i) =>
      tmdbFetch("/movie/popular", tmdbTrendingMoviesResponseSchema, {
        page: String(i + 1),
      }),
    ),
  );
  return [...new Set(pages.flatMap((p) => p.results.map((r) => r.id)))];
}

const HORROR_GENRE_ID = "27";
const TMDB_PAGE_SIZE = 20;

// Well-known, well-rated horror: vote_count floor keeps obscure titles with a
// handful of perfect scores out. Ranked by popularity of votes, so index 0 is
// the most-watched — callers preserve order. Returns the [offset, offset+limit)
// slice of that ranking, fetching only the TMDB pages that slice touches.
export async function getHorrorCandidates(
  offset: number,
  limit: number,
): Promise<readonly TrendingMovie[]> {
  const firstPage = Math.floor(offset / TMDB_PAGE_SIZE) + 1;
  const lastPage = Math.ceil((offset + limit) / TMDB_PAGE_SIZE);
  const pages = await Promise.all(
    Array.from({ length: lastPage - firstPage + 1 }, (_, i) =>
      tmdbFetch("/discover/movie", tmdbTrendingMoviesResponseSchema, {
        with_genres: HORROR_GENRE_ID,
        sort_by: "vote_count.desc",
        "vote_average.gte": "6.3",
        "vote_count.gte": "300", // keeps out obscure titles with a handful of perfect scores
        include_adult: "false",
        page: String(firstPage + i),
      }),
    ),
  );
  const start = offset - (firstPage - 1) * TMDB_PAGE_SIZE;
  const byId = new Map<number, TrendingMovie>();
  for (const m of pages.flatMap((p) => p.results.map(toTrendingMovie))) {
    if (!byId.has(m.tmdbMovieId)) byId.set(m.tmdbMovieId, m);
  }
  return [...byId.values()].slice(start, start + limit);
}

const SIMILAR_LIMIT = 12;

// TMDB's own ordering is the ranking signal here — index 0 is "most
// similar" — callers that want a closer/farther layout should preserve
// array order, not re-sort by anything else.
export async function getSimilarMovies(
  movieId: number,
): Promise<readonly TrendingMovie[]> {
  const data = await tmdbFetch(
    `/movie/${movieId}/similar`,
    tmdbTrendingMoviesResponseSchema,
  );
  return data.results.slice(0, SIMILAR_LIMIT).map(toTrendingMovie);
}

export interface MovieListPage {
  readonly movies: readonly TrendingMovie[];
  readonly totalPages: number;
}

// TMDB won't page past 500; our "load more" links stop well before that.
const MAX_LIST_PAGE = 500;

async function discoverMovies(
  params: Record<string, string>,
  page: number,
): Promise<MovieListPage> {
  const data = await tmdbFetch("/discover/movie", tmdbMovieListResponseSchema, {
    include_adult: "false",
    sort_by: "popularity.desc",
    "vote_count.gte": "50", // keeps empty/obscure entries off the list
    ...params,
    page: String(Math.min(Math.max(1, page), MAX_LIST_PAGE)),
  });
  return {
    movies: data.results.map(toTrendingMovie),
    totalPages: Math.min(data.total_pages ?? 1, MAX_LIST_PAGE),
  };
}

export function getMoviesByGenre(
  genreId: number,
  page: number,
): Promise<MovieListPage> {
  return discoverMovies({ with_genres: String(genreId) }, page);
}

export function getMoviesByKeyword(
  keywordId: number,
  page: number,
): Promise<MovieListPage> {
  return discoverMovies({ with_keywords: String(keywordId) }, page);
}

export async function getKeywordName(keywordId: number): Promise<string> {
  const data = await tmdbFetch(
    `/keyword/${keywordId}`,
    tmdbKeywordResponseSchema,
  );
  return data.name;
}

/** Movies in theaters right now in `region` (ISO 3166-1), TMDB's own ordering. */
export async function getNowPlaying(
  region: string,
): Promise<readonly TrendingMovie[]> {
  const data = await tmdbFetch(
    "/movie/now_playing",
    tmdbTrendingMoviesResponseSchema,
    { region },
  );
  return data.results.slice(0, 18).map(toTrendingMovie);
}

/** What's trending today (not the weekly list the home uses). */
export async function getTrendingMoviesToday(): Promise<
  readonly TrendingMovie[]
> {
  const data = await tmdbFetch(
    "/trending/movie/day",
    tmdbTrendingMoviesResponseSchema,
  );
  return data.results.slice(0, 18).map(toTrendingMovie);
}

const RECOMMENDED_LIMIT = 12;

/** TMDB's "people who liked this also liked" list — falls back to "similar" when it's empty. */
export async function getRecommendedMovies(
  movieId: number,
): Promise<readonly TrendingMovie[]> {
  const data = await tmdbFetch(
    `/movie/${movieId}/recommendations`,
    tmdbTrendingMoviesResponseSchema,
  );
  if (data.results.length === 0) return getSimilarMovies(movieId);
  return data.results.slice(0, RECOMMENDED_LIMIT).map(toTrendingMovie);
}

export interface UpcomingMovie extends TrendingMovie {
  /** "YYYY-MM-DD" — always set, discover is filtered to dated releases. */
  readonly releaseDate: string;
}

const UPCOMING_PAGES = 3; // 20 per page — the most talked-about ~60, not the whole calendar

/** Theatrical releases from `today` on, most popular first per page, returned in release order. */
export async function getUpcomingMovies(
  today: string,
): Promise<readonly UpcomingMovie[]> {
  const pages = await Promise.all(
    Array.from({ length: UPCOMING_PAGES }, (_, i) =>
      tmdbFetch("/discover/movie", tmdbUpcomingResponseSchema, {
        "primary_release_date.gte": today,
        with_release_type: "2|3", // theatrical limited + wide
        sort_by: "popularity.desc",
        include_adult: "false",
        page: String(i + 1),
      }),
    ),
  );
  const byId = new Map<number, UpcomingMovie>();
  for (const m of pages.flatMap((p) => p.results)) {
    if (!m.release_date || byId.has(m.id)) continue;
    byId.set(m.id, { ...toTrendingMovie(m), releaseDate: m.release_date });
  }
  return [...byId.values()].sort((a, b) =>
    a.releaseDate.localeCompare(b.releaseDate),
  );
}

export function sortFilmography(
  movies: readonly FilmographyMovie[],
  order: "newest" | "oldest",
): readonly FilmographyMovie[] {
  const withYear = movies.filter((m) => m.releaseYear !== null);
  const withoutYear = movies.filter((m) => m.releaseYear === null);

  const sorted = [...withYear].sort((a, b) =>
    order === "newest"
      ? b.releaseYear! - a.releaseYear!
      : a.releaseYear! - b.releaseYear!,
  );

  return [...sorted, ...withoutYear];
}
