export interface ReleaseNotification {
  readonly id: string;
  readonly type: "new-release";
  readonly movieId: number;
  readonly movieTitle: string;
  readonly posterPath: string | null;
  readonly personId: number;
  readonly personName: string;
  readonly releaseDate: string;
  readonly read: boolean;
  readonly createdAt: string;
}
