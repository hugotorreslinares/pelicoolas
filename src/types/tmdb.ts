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
    }),
  ),
});
export type TmdbTrendingMoviesResponse = z.infer<
  typeof tmdbTrendingMoviesResponseSchema
>;

export const tmdbMovieDetailsResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  poster_path: z.string().nullable(),
  release_date: z.string().optional(),
  overview: z.string().nullable(),
  runtime: z.number().nullable(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })),
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
});
export type TmdbMovieDetailsResponse = z.infer<
  typeof tmdbMovieDetailsResponseSchema
>;
