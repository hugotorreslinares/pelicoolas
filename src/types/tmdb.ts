import { z } from "zod";

// Raw TMDB API response shapes (snake_case, as returned by the API) with
// runtime validation — TMDB has no contract with this app, so a shape
// change on their end should fail loudly instead of propagating nulls
// silently into the UI.

export const tmdbSearchPersonResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      profile_path: z.string().nullable(),
      known_for_department: z.string().nullable(),
    }),
  ),
});
export type TmdbSearchPersonResponse = z.infer<
  typeof tmdbSearchPersonResponseSchema
>;

export const tmdbPersonDetailsResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  profile_path: z.string().nullable(),
  known_for_department: z.string().nullable(),
  biography: z.string().nullable(),
  gender: z.number(),
  birthday: z.string().nullable(),
  deathday: z.string().nullable(),
  place_of_birth: z.string().nullable(),
  also_known_as: z.array(z.string()),
});
export type TmdbPersonDetailsResponse = z.infer<
  typeof tmdbPersonDetailsResponseSchema
>;

export const tmdbPersonImagesResponseSchema = z.object({
  profiles: z.array(z.object({ file_path: z.string() })),
});
export type TmdbPersonImagesResponse = z.infer<
  typeof tmdbPersonImagesResponseSchema
>;

const tmdbCastCreditSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  poster_path: z.string().nullable(),
  release_date: z.string().optional(),
  character: z.string().optional(),
  media_type: z.string(),
  vote_average: z.number().optional(),
  genre_ids: z.array(z.number()).optional(),
});

const tmdbCrewCreditSchema = tmdbCastCreditSchema.extend({
  department: z.string().optional(),
});

export const tmdbCombinedCreditsResponseSchema = z.object({
  cast: z.array(tmdbCastCreditSchema),
  crew: z.array(tmdbCrewCreditSchema),
});
export type TmdbCombinedCreditsResponse = z.infer<
  typeof tmdbCombinedCreditsResponseSchema
>;

export const tmdbTrendingMoviesResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      poster_path: z.string().nullable(),
      release_date: z.string().optional(),
      vote_average: z.number().optional(),
      genre_ids: z.array(z.number()).optional(),
    }),
  ),
});
export type TmdbTrendingMoviesResponse = z.infer<
  typeof tmdbTrendingMoviesResponseSchema
>;

const tmdbWatchProviderOptionSchema = z.object({
  provider_id: z.number(),
  provider_name: z.string(),
  logo_path: z.string().nullable(),
});

// Nested under append_to_response=watch/providers, one entry per ISO
// country code under `results` — see lib/region.ts for how the region to
// read is picked.
const tmdbWatchProvidersResponseSchema = z.object({
  results: z.record(
    z.string(),
    z.object({
      link: z.string(),
      flatrate: z.array(tmdbWatchProviderOptionSchema).optional(),
      rent: z.array(tmdbWatchProviderOptionSchema).optional(),
      buy: z.array(tmdbWatchProviderOptionSchema).optional(),
      free: z.array(tmdbWatchProviderOptionSchema).optional(),
      ads: z.array(tmdbWatchProviderOptionSchema).optional(),
    }),
  ),
});

export const tmdbMovieDetailsResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  poster_path: z.string().nullable(),
  release_date: z.string().optional(),
  overview: z.string().nullable(),
  runtime: z.number().nullable(),
  vote_average: z.number().optional(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })),
  // Present on every /movie/{id} response by default, no append_to_response
  // needed — null for movies with no IMDb entry.
  imdb_id: z.string().nullable().optional(),
  // Present because getMovieDetails requests append_to_response=credits —
  // optional here since a plain /movie/{id} call (no append) wouldn't have it.
  credits: z
    .object({
      cast: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          character: z.string().optional(),
          profile_path: z.string().nullable(),
        }),
      ),
    })
    .optional(),
  // Present because getMovieDetails requests append_to_response includes
  // "watch/providers" — key has a literal slash, TMDB's own naming.
  "watch/providers": tmdbWatchProvidersResponseSchema.optional(),
});
export type TmdbMovieDetailsResponse = z.infer<
  typeof tmdbMovieDetailsResponseSchema
>;

export const tmdbSearchTVResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      poster_path: z.string().nullable(),
      first_air_date: z.string().optional(),
      vote_average: z.number().optional(),
      genre_ids: z.array(z.number()).optional(),
    }),
  ),
});
export type TmdbSearchTVResponse = z.infer<typeof tmdbSearchTVResponseSchema>;

export const tmdbTrendingTVResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      poster_path: z.string().nullable(),
      first_air_date: z.string().optional(),
      vote_average: z.number().optional(),
      genre_ids: z.array(z.number()).optional(),
    }),
  ),
});
export type TmdbTrendingTVResponse = z.infer<
  typeof tmdbTrendingTVResponseSchema
>;

export const tmdbTVDetailsResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  poster_path: z.string().nullable(),
  first_air_date: z.string().optional(),
  overview: z.string().nullable(),
  number_of_seasons: z.number().nullable().optional(),
  number_of_episodes: z.number().nullable().optional(),
  vote_average: z.number().optional(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })),
  // Present because getTVDetails requests append_to_response=credits,external_ids.
  credits: z
    .object({
      cast: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          character: z.string().optional(),
          profile_path: z.string().nullable(),
        }),
      ),
    })
    .optional(),
  external_ids: z.object({ imdb_id: z.string().nullable() }).optional(),
  "watch/providers": tmdbWatchProvidersResponseSchema.optional(),
});
export type TmdbTVDetailsResponse = z.infer<typeof tmdbTVDetailsResponseSchema>;
