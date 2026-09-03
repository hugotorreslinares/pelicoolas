import { tmdbFetch } from "./client";
import {
  tmdbSearchPersonResponseSchema,
  tmdbPersonDetailsResponseSchema,
  tmdbPersonImagesResponseSchema,
} from "@/types/tmdb";
import type {
  PersonGender,
  PersonProfile,
  PersonSearchResult,
} from "@/types/person";

function toGender(gender: number): PersonGender {
  if (gender === 1) return "female";
  if (gender === 2) return "male";
  if (gender === 3) return "non-binary";
  return null;
}

export async function searchPerson(
  query: string,
): Promise<readonly PersonSearchResult[]> {
  const data = await tmdbFetch(
    "/search/person",
    tmdbSearchPersonResponseSchema,
    {
      query,
      include_adult: "false",
    },
  );

  return data.results.map((r) => ({
    id: r.id,
    name: r.name,
    profilePath: r.profile_path,
    knownForDepartment: r.known_for_department,
  }));
}

export async function getPersonProfile(
  personId: number,
): Promise<PersonProfile> {
  const data = await tmdbFetch(
    `/person/${personId}`,
    tmdbPersonDetailsResponseSchema,
  );

  return {
    id: data.id,
    name: data.name,
    profilePath: data.profile_path,
    knownForDepartment: data.known_for_department,
    biography: data.biography,
    gender: toGender(data.gender),
    birthday: data.birthday,
    deathday: data.deathday,
    placeOfBirth: data.place_of_birth,
    alsoKnownAs: data.also_known_as,
  };
}

export async function getPersonImages(
  personId: number,
): Promise<readonly string[]> {
  const data = await tmdbFetch(
    `/person/${personId}/images`,
    tmdbPersonImagesResponseSchema,
  );
  return data.profiles.map((p) => p.file_path);
}
