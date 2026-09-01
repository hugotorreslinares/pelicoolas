export interface PersonSearchResult {
  readonly id: number;
  readonly name: string;
  readonly profilePath: string | null;
  readonly knownForDepartment: string | null;
}

export interface PersonProfile {
  readonly id: number;
  readonly name: string;
  readonly profilePath: string | null;
  readonly knownForDepartment: string | null;
  readonly biography: string | null;
}
