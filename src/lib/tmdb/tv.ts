import { tmdbFetch } from "./client";
import { getExternalRatings } from "@/lib/omdb";
import {
  tmdbTrendingTVResponseSchema,
  tmdbTVDetailsResponseSchema,
} from "@/types/tmdb";
import type { TrendingMovie, TVDetails } from "@/types/movie";
import { toReleaseYear, toWatchProviders } from "./movies";

const TRENDING_LIMIT = 10;

export async function getTrendingTV(): Promise<readonly TrendingMovie[]> {
  const data = await tmdbFetch(
    "/trending/tv/week",
    tmdbTrendingTVResponseSchema,
  );
  return data.results.slice(0, TRENDING_LIMIT).map((show) => ({
    tmdbMovieId: show.id,
    title: show.name,
    posterPath: show.poster_path,
    releaseYear: toReleaseYear(show.first_air_date),
    voteAverage: show.vote_average ?? null,
    // TMDB's TV genre ids are a different namespace from movie genre ids
    // (see lib/tmdb/genres.ts, movie-only) — dropped here rather than risk
    // a TV show's genre rendering as the wrong movie genre name wherever
    // genreIds gets displayed (Watched/Watchlist genre filter chips).
    genreIds: [],
    mediaType: "tv" as const,
  }));
}

const CAST_LIMIT = 10;

export async function getTVDetails(
  tvId: number,
  region: string,
): Promise<TVDetails> {
  const data = await tmdbFetch(`/tv/${tvId}`, tmdbTVDetailsResponseSchema, {
    append_to_response: "credits,external_ids,watch/providers",
  });

  const externalRatings = await getExternalRatings(data.external_ids?.imdb_id);

  return {
    id: data.id,
    title: data.name,
    posterPath: data.poster_path,
    releaseYear: toReleaseYear(data.first_air_date),
    overview: data.overview,
    seasonCount: data.number_of_seasons ?? null,
    episodeCount: data.number_of_episodes ?? null,
    voteAverage: data.vote_average ?? null,
    genres: data.genres.map((g) => g.name),
    genreIds: data.genres.map((g) => g.id),
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
