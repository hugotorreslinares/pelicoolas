import { tmdbFetch } from "./client";
import type {
  PersonGender,
  PersonProfile,
  PersonSearchResult,
} from "@/types/person";

interface TmdbSearchPersonResponse {
  readonly results: readonly {
    readonly id: number;
    readonly name: string;
    readonly profile_path: string | null;
    readonly known_for_department: string | null;
  }[];
}

interface TmdbPersonDetailsResponse {
  readonly id: number;
  readonly name: string;
  readonly profile_path: string | null;
  readonly known_for_department: string | null;
  readonly biography: string | null;
  readonly gender: number;
  readonly birthday: string | null;
  readonly deathday: string | null;
  readonly place_of_birth: string | null;
  readonly also_known_as: readonly string[];
}

function toGender(gender: number): PersonGender {
  if (gender === 1) return "female";
  if (gender === 2) return "male";
  if (gender === 3) return "non-binary";
  return null;
}

export async function searchPerson(
  query: string,
): Promise<readonly PersonSearchResult[]> {
  const data = await tmdbFetch<TmdbSearchPersonResponse>("/search/person", {
    query,
    include_adult: "false",
  });

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
  const data = await tmdbFetch<TmdbPersonDetailsResponse>(
    `/person/${personId}`,
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

interface TmdbPersonImagesResponse {
  readonly profiles: readonly { readonly file_path: string }[];
}

export async function getPersonImages(
  personId: number,
): Promise<readonly string[]> {
  const data = await tmdbFetch<TmdbPersonImagesResponse>(
    `/person/${personId}/images`,
  );
  return data.profiles.map((p) => p.file_path);
}
