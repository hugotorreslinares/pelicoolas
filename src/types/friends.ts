import type {
  RecommendedMovie,
  SeenMovie,
  WatchlistMovie,
} from "./filmography";

/** The single most recent item in each of a followed user's three lists — powers the /friends activity cards. Requires the viewer to already be an approved follower (or the owner) to read; same firestore.rules access as watchlist/seen elsewhere. */
export interface FriendActivity {
  readonly lastWatched: SeenMovie | null;
  readonly lastWatchlisted: WatchlistMovie | null;
  readonly lastRecommended: RecommendedMovie | null;
}
