import { tmdbFetch } from "./client";
import type { PersonProfile, PersonSearchResult } from "@/types/person";

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
}

export async function searchPerson(query: string): Promise<readonly PersonSearchResult[]> {
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

export async function getPersonProfile(personId: number): Promise<PersonProfile> {
  const data = await tmdbFetch<TmdbPersonDetailsResponse>(`/person/${personId}`);

  return {
    id: data.id,
    name: data.name,
    profilePath: data.profile_path,
    knownForDepartment: data.known_for_department,
    biography: data.biography,
  };
}
