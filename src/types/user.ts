/**
 * `users/{userId}` — the root doc, public (name/photo only) so a shared
 * profile link (`/u/{userId}`) can render something before anyone follows
 * anything. Synced from Firebase Auth on sign-in; never holds movie data.
 */
export interface PublicProfile {
  readonly uid: string;
  readonly displayName: string | null;
  readonly photoURL: string | null;
  readonly updatedAt: string;
}

/** `users/{userId}/followRequests/{requesterId}` — pending, created by the requester. */
export interface FollowRequest {
  readonly requesterId: string;
  readonly requesterName: string | null;
  readonly requesterPhotoURL: string | null;
  readonly createdAt: string;
}

/** `users/{userId}/followers/{followerId}` — written by userId on approval. */
export interface Follower {
  readonly followerId: string;
  readonly followerName: string | null;
  readonly followerPhotoURL: string | null;
  readonly since: string;
}

/** `users/{followerId}/following/{targetId}` — mirror, written by followerId only. */
export interface Following {
  readonly targetId: string;
  readonly targetName: string | null;
  readonly targetPhotoURL: string | null;
  readonly since: string;
}
