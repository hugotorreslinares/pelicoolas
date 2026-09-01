export interface PersonSearchResult {
  readonly id: number;
  readonly name: string;
  readonly profilePath: string | null;
  readonly knownForDepartment: string | null;
}

export type PersonGender = "female" | "male" | "non-binary" | null;

export interface PersonProfile {
  readonly id: number;
  readonly name: string;
  readonly profilePath: string | null;
  readonly knownForDepartment: string | null;
  readonly biography: string | null;
  readonly gender: PersonGender;
  readonly birthday: string | null;
  readonly deathday: string | null;
  readonly placeOfBirth: string | null;
  readonly alsoKnownAs: readonly string[];
}
