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

/**
 * Written by the recommender's own client (fan-out to every follower's
 * `notifications`, see notifyFollowersOfRecommendation) — not the Admin
 * SDK, unlike ReleaseNotification. Scoped to movie/TV for now; recommending
 * a person is a separate, not-yet-built feature (see TODO.md).
 */
export interface RecommendationNotification {
  readonly id: string;
  readonly type: "recommendation";
  readonly recommenderId: string;
  readonly recommenderName: string;
  readonly movieId: number;
  readonly movieTitle: string;
  readonly posterPath: string | null;
  readonly mediaType?: "movie" | "tv";
  readonly read: boolean;
  readonly createdAt: string;
}

export type AppNotification = ReleaseNotification | RecommendationNotification;
