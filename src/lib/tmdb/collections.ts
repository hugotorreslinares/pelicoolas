import { tmdbFetch } from "./client";
import { toReleaseYear } from "./movies";
import { tmdbCollectionResponseSchema } from "@/types/tmdb";
import type { TrendingMovie } from "@/types/movie";

export interface CollectionPart extends TrendingMovie {
  /** "YYYY-MM-DD", null when TMDB has no date yet. */
  readonly releaseDate: string | null;
}

export interface Collection {
  readonly id: number;
  readonly name: string;
  readonly overview: string | null;
  readonly posterPath: string | null;
  readonly backdropPath: string | null;
  /** In release order; undated parts last. */
  readonly parts: readonly CollectionPart[];
}

export async function getCollection(id: number): Promise<Collection> {
  const data = await tmdbFetch(
    `/collection/${id}`,
    tmdbCollectionResponseSchema,
  );
  const parts = data.parts
    .map((p): CollectionPart => ({
      tmdbMovieId: p.id,
      title: p.title,
      posterPath: p.poster_path,
      releaseYear: toReleaseYear(p.release_date),
      releaseDate: p.release_date || null,
      voteAverage: p.vote_average ?? null,
      genreIds: p.genre_ids ?? [],
    }))
    .sort((a, b) => {
      if (!a.releaseDate) return 1;
      if (!b.releaseDate) return -1;
      return a.releaseDate.localeCompare(b.releaseDate);
    });
  return {
    id: data.id,
    name: data.name,
    overview: data.overview || null,
    posterPath: data.poster_path,
    backdropPath: data.backdrop_path ?? null,
    parts,
  };
}
