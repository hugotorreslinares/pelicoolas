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
  /** Set once, on first sync — never overwritten by later sign-ins. Drives
   *  the "recently joined" slider on the home page. */
  readonly createdAt: string;
  /** Lowercase, unique, fixed once claimed (no renames in v1). Powers
   *  prefix search (`usernameLower >= q && < q + ""`) and the
   *  `usernames/{username}` reservation doc. Null until the user claims one
   *  (existing accounts predate this field). */
  readonly usernameLower: string | null;
  /** As typed by the user — display-only, casing preserved. */
  readonly username: string | null;
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

/**
 * `users/{userId}/invites/{inviteId}` — an email invite sent by userId.
 * Written server-side only (see `/api/invite`, `/api/invite/convert`) via
 * the Admin SDK, same pattern as `notifications` — firestore.rules only
 * governs the client reading its own invites, never writing them.
 */
export interface Invite {
  readonly email: string;
  readonly sentAt: string;
  readonly status: "sent" | "converted";
  readonly convertedUid: string | null;
  readonly convertedAt: string | null;
}
