import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./client";
import type {
  FollowedPerson,
  RecommendedMovie,
  RecommendedPerson,
  SeenMovie,
  WatchedMovie,
  WatchlistMovie,
} from "@/types/filmography";
import type { FriendActivity } from "@/types/friends";
import type { FilmographyMovie, TrendingMovie } from "@/types/movie";
import { clampRating } from "@/lib/rating";
import type {
  Follower,
  Following,
  FollowRequest,
  Invite,
  PublicProfile,
} from "@/types/user";

export function requireDb() {
  if (!db) throw new Error("Firebase is not configured");
  return db;
}

function followedPersonRef(userId: string, personId: number) {
  return doc(requireDb(), "users", userId, "followedPeople", String(personId));
}

// Movie and TV ids are separate TMDB namespaces — a movie 550 and a TV
// show 550 are unrelated. Movie docs keep the original bare-numeric id
// (every doc written before TV support looks like this; no migration
// needed), TV docs get a "tv-" prefix so the two can never collide in the
// same collection.
function mediaDocId(id: number, mediaType?: "movie" | "tv"): string {
  return mediaType === "tv" ? `tv-${id}` : String(id);
}

function watchlistMovieRef(
  userId: string,
  movieId: number,
  mediaType?: "movie" | "tv",
) {
  return doc(
    requireDb(),
    "users",
    userId,
    "watchlist",
    mediaDocId(movieId, mediaType),
  );
}

function recommendedPersonRef(userId: string, personId: number) {
  return doc(
    requireDb(),
    "users",
    userId,
    "recommendedPeople",
    String(personId),
  );
}

function recommendedMovieRef(
  userId: string,
  movieId: number,
  mediaType?: "movie" | "tv",
) {
  return doc(
    requireDb(),
    "users",
    userId,
    "recommendations",
    mediaDocId(movieId, mediaType),
  );
}

function seenMovieRef(
  userId: string,
  movieId: number,
  mediaType?: "movie" | "tv",
) {
  return doc(
    requireDb(),
    "users",
    userId,
    "seen",
    mediaDocId(movieId, mediaType),
  );
}

function publicProfileRef(userId: string) {
  return doc(requireDb(), "users", userId);
}

function followRequestRef(targetId: string, requesterId: string) {
  return doc(requireDb(), "users", targetId, "followRequests", requesterId);
}

function followerRef(targetId: string, followerId: string) {
  return doc(requireDb(), "users", targetId, "followers", followerId);
}

function followingRef(followerId: string, targetId: string) {
  return doc(requireDb(), "users", followerId, "following", targetId);
}

export async function followPerson(
  userId: string,
  person: Omit<FollowedPerson, "createdAt">,
): Promise<void> {
  await setDoc(followedPersonRef(userId, person.tmdbId), {
    ...person,
    createdAt: serverTimestamp(),
  });
}

export async function unfollowPerson(
  userId: string,
  personId: number,
): Promise<void> {
  await deleteDoc(followedPersonRef(userId, personId));
}

export async function isFollowingPerson(
  userId: string,
  personId: number,
): Promise<boolean> {
  const snapshot = await getDoc(followedPersonRef(userId, personId));
  return snapshot.exists();
}

export function subscribeToFollowedPeople(
  userId: string,
  callback: (people: readonly FollowedPerson[]) => void,
): () => void {
  return onSnapshot(
    collection(requireDb(), "users", userId, "followedPeople"),
    (snapshot) => {
      callback(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            // `createdAt` is a Firestore server Timestamp on the wire, not
            // the ISO string the FollowedPerson type promises — sorting by
            // it (FollowedDock) crashed for anyone with 2+ followed people.
            // `toIso` returns null for the brief window where a just-added
            // doc's serverTimestamp() hasn't resolved yet in the local
            // cache; "now" is the correct value for that case anyway.
            createdAt: toIso(data.createdAt) ?? new Date().toISOString(),
          } as FollowedPerson;
        }),
      );
    },
  );
}

// Legacy per-person "watched" docs (followedPeople/{id}/watchedMovies) —
// no longer written to. `seen` (below) is the single source of truth for
// "have I watched this movie", used everywhere (a person's filmography
// checkbox included). These two used to be entirely separate facts, which
// meant marking a movie watched from a person's page didn't show as
// watched anywhere else (search, watchlist, Connections) and vice versa.
// Kept only to read once per person and migrate into `seen` — see
// `migrateWatchedToSeen`.
export async function getLegacyWatchedIds(
  userId: string,
  personId: number,
): Promise<readonly number[]> {
  const snapshot = await getDocs(
    collection(
      requireDb(),
      "users",
      userId,
      "followedPeople",
      String(personId),
      "watchedMovies",
    ),
  );
  return snapshot.docs.map((d) => (d.data() as WatchedMovie).tmdbId);
}

// One-time backfill: for each legacy-watched id not already in `seen` (and
// still present in this person's current filmography), write a real `seen`
// doc using metadata already at hand from `movies` — avoids a TMDB lookup
// per movie. Cheap no-op once everything's migrated (empty `toWrite`).
export async function migrateWatchedToSeen(
  userId: string,
  legacyIds: readonly number[],
  movies: readonly FilmographyMovie[],
  alreadySeenIds: ReadonlySet<number>,
): Promise<void> {
  const byId = new Map(movies.map((m) => [m.tmdbMovieId, m]));
  const toWrite = legacyIds.filter(
    (id) => !alreadySeenIds.has(id) && byId.has(id),
  );
  if (toWrite.length === 0) return;

  const batch = writeBatch(requireDb());
  for (const id of toWrite) {
    const movie = byId.get(id)!;
    batch.set(seenMovieRef(userId, id), {
      tmdbId: movie.tmdbMovieId,
      title: movie.title,
      posterPath: movie.posterPath,
      releaseYear: movie.releaseYear,
      voteAverage: movie.voteAverage,
      genreIds: movie.genreIds,
      watchedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

export async function addToWatchlist(
  userId: string,
  movie: Omit<WatchlistMovie, "addedAt">,
): Promise<void> {
  await setDoc(watchlistMovieRef(userId, movie.tmdbId, movie.mediaType), {
    ...movie,
    addedAt: serverTimestamp(),
  });
}

export async function removeFromWatchlist(
  userId: string,
  movieId: number,
  mediaType?: "movie" | "tv",
): Promise<void> {
  await deleteDoc(watchlistMovieRef(userId, movieId, mediaType));
}

/** Backfills genreIds/durationMinutes on a watchlist entry added before those fields existed. */
export async function setWatchlistDetails(
  userId: string,
  movieId: number,
  details: {
    readonly genreIds: readonly number[];
    readonly durationMinutes: number | null;
  },
  mediaType?: "movie" | "tv",
): Promise<void> {
  await updateDoc(watchlistMovieRef(userId, movieId, mediaType), details);
}

export async function isInWatchlist(
  userId: string,
  movieId: number,
  mediaType?: "movie" | "tv",
): Promise<boolean> {
  const snapshot = await getDoc(watchlistMovieRef(userId, movieId, mediaType));
  return snapshot.exists();
}

function toIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export interface ExportedUserData {
  readonly exportedAt: string;
  readonly followedPeople: readonly {
    readonly tmdbId: number;
    readonly name: string;
    readonly knownForDepartment: string | null;
    readonly followedAt: string | null;
    readonly watchedMovies: readonly {
      readonly tmdbId: number;
      readonly watchedAt: string | null;
    }[];
  }[];
  readonly watchlist: readonly {
    readonly tmdbId: number;
    readonly title: string;
    readonly releaseYear: number | null;
    readonly sourcePersonName?: string;
    readonly addedAt: string | null;
  }[];
}

/** One-shot full export of everything this account has stored — your data, portable out of the app. */
export async function exportUserData(
  userId: string,
): Promise<ExportedUserData> {
  const db = requireDb();

  const followedSnapshot = await getDocs(
    collection(db, "users", userId, "followedPeople"),
  );
  const followedPeople = await Promise.all(
    followedSnapshot.docs.map(async (personDoc) => {
      const person = personDoc.data() as FollowedPerson;
      const watchedSnapshot = await getDocs(
        collection(
          db,
          "users",
          userId,
          "followedPeople",
          personDoc.id,
          "watchedMovies",
        ),
      );
      return {
        tmdbId: person.tmdbId,
        name: person.name,
        knownForDepartment: person.knownForDepartment,
        followedAt: toIso(person.createdAt),
        watchedMovies: watchedSnapshot.docs.map((d) => {
          const movie = d.data() as WatchedMovie;
          return { tmdbId: movie.tmdbId, watchedAt: toIso(movie.watchedAt) };
        }),
      };
    }),
  );

  const watchlistSnapshot = await getDocs(
    collection(db, "users", userId, "watchlist"),
  );
  const watchlist = watchlistSnapshot.docs.map((d) => {
    const movie = d.data() as WatchlistMovie;
    return {
      tmdbId: movie.tmdbId,
      title: movie.title,
      releaseYear: movie.releaseYear,
      sourcePersonName: movie.sourcePersonName,
      addedAt: toIso(movie.addedAt),
    };
  });

  return { exportedAt: new Date().toISOString(), followedPeople, watchlist };
}

export function subscribeToWatchlist(
  userId: string,
  callback: (movies: readonly WatchlistMovie[]) => void,
): () => void {
  return onSnapshot(
    collection(requireDb(), "users", userId, "watchlist"),
    (snapshot) => {
      callback(snapshot.docs.map((d) => d.data() as WatchlistMovie));
    },
  );
}

export async function addToRecommendations(
  userId: string,
  movie: Omit<RecommendedMovie, "addedAt">,
): Promise<void> {
  await setDoc(recommendedMovieRef(userId, movie.tmdbId, movie.mediaType), {
    ...movie,
    addedAt: serverTimestamp(),
  });
}

export async function removeFromRecommendations(
  userId: string,
  movieId: number,
  mediaType?: "movie" | "tv",
): Promise<void> {
  await deleteDoc(recommendedMovieRef(userId, movieId, mediaType));
}

export async function isInRecommendations(
  userId: string,
  movieId: number,
  mediaType?: "movie" | "tv",
): Promise<boolean> {
  const snapshot = await getDoc(
    recommendedMovieRef(userId, movieId, mediaType),
  );
  return snapshot.exists();
}

// No auth check here on purpose — this backs the public board
// (/board/{userId}), readable by anyone per firestore.rules.
export function subscribeToRecommendations(
  userId: string,
  callback: (movies: readonly RecommendedMovie[]) => void,
): () => void {
  return onSnapshot(
    collection(requireDb(), "users", userId, "recommendations"),
    (snapshot) => {
      callback(snapshot.docs.map((d) => d.data() as RecommendedMovie));
    },
  );
}

// Same collection shape/rules pattern as recommendations above, for
// recommending a person (actor/director) instead of a movie/show — see
// RecommendedPerson.
export async function addPersonToRecommendations(
  userId: string,
  person: Omit<RecommendedPerson, "addedAt">,
): Promise<void> {
  await setDoc(recommendedPersonRef(userId, person.tmdbId), {
    ...person,
    addedAt: serverTimestamp(),
  });
}

export async function removePersonFromRecommendations(
  userId: string,
  personId: number,
): Promise<void> {
  await deleteDoc(recommendedPersonRef(userId, personId));
}

export async function isPersonRecommended(
  userId: string,
  personId: number,
): Promise<boolean> {
  const snapshot = await getDoc(recommendedPersonRef(userId, personId));
  return snapshot.exists();
}

// No auth check here on purpose — same public board as
// subscribeToRecommendations above.
export function subscribeToRecommendedPeople(
  userId: string,
  callback: (people: readonly RecommendedPerson[]) => void,
): () => void {
  return onSnapshot(
    collection(requireDb(), "users", userId, "recommendedPeople"),
    (snapshot) => {
      callback(snapshot.docs.map((d) => d.data() as RecommendedPerson));
    },
  );
}

export async function markMovieSeen(
  userId: string,
  movie: Omit<SeenMovie, "watchedAt">,
): Promise<void> {
  await setDoc(seenMovieRef(userId, movie.tmdbId, movie.mediaType), {
    ...movie,
    watchedAt: serverTimestamp(),
  });
}

export async function unmarkMovieSeen(
  userId: string,
  movieId: number,
  mediaType?: "movie" | "tv",
): Promise<void> {
  await deleteDoc(seenMovieRef(userId, movieId, mediaType));
}

export async function isMovieSeen(
  userId: string,
  movieId: number,
  mediaType?: "movie" | "tv",
): Promise<boolean> {
  const snapshot = await getDoc(seenMovieRef(userId, movieId, mediaType));
  return snapshot.exists();
}

// The single "have I watched this" listener — a person's filmography
// checkbox intersects this with that person's movie ids, rather than
// keeping its own separate per-person subscription.
export function subscribeToSeenMovies(
  userId: string,
  callback: (seenIds: ReadonlySet<number>) => void,
): () => void {
  return onSnapshot(
    collection(requireDb(), "users", userId, "seen"),
    (snapshot) => {
      callback(
        new Set(snapshot.docs.map((d) => (d.data() as SeenMovie).tmdbId)),
      );
    },
  );
}

// The full docs, not just ids — for the "All watched movies" page
// (/watched), which needs title/poster/genre to render and filter, not
// just membership.
export function subscribeToSeenMoviesFull(
  userId: string,
  callback: (movies: readonly SeenMovie[]) => void,
): () => void {
  return onSnapshot(
    collection(requireDb(), "users", userId, "seen"),
    (snapshot) => {
      callback(snapshot.docs.map((d) => d.data() as SeenMovie));
    },
  );
}

/** Backfills genreIds on a seen entry marked before that field existed. */
export async function setSeenGenres(
  userId: string,
  movieId: number,
  genreIds: readonly number[],
  mediaType?: "movie" | "tv",
): Promise<void> {
  await updateDoc(seenMovieRef(userId, movieId, mediaType), { genreIds });
}

// "Crispetas" (1-5 popcorn) rating — lives on the same `seen` doc as the
// watched record itself, so it's only settable once the movie has actually
// been marked watched (updateDoc fails if the doc doesn't exist yet) and
// disappears along with it if the movie is later unmarked.
export async function setMovieRating(
  userId: string,
  movieId: number,
  rating: number,
  mediaType?: "movie" | "tv",
): Promise<void> {
  await updateDoc(seenMovieRef(userId, movieId, mediaType), {
    rating: clampRating(rating),
  });
}

export async function getMovieRating(
  userId: string,
  movieId: number,
  mediaType?: "movie" | "tv",
): Promise<number | null> {
  const snapshot = await getDoc(seenMovieRef(userId, movieId, mediaType));
  return (snapshot.data() as SeenMovie | undefined)?.rating ?? null;
}

// --- Follow other users --------------------------------------------------
//
// `users/{userId}` itself is public (name/photo only, `allow read: if
// true` — same precedent as `recommendations`) so a shared profile link
// works before anyone approves anything. Everything else here is
// owner-write-only; see design.md for the full approve/mirror flow this
// implements without a Cloud Function.

/** Upserts the public name/photo doc — call once per session after sign-in.
 *  `createdAt` is only ever set on the first sync, so it stays a true
 *  "joined" date rather than resetting on every sign-in. */
/** Returns true the first time this uid is ever synced — used to gate one-time signup side effects (e.g. marking a pending invite as converted). */
function privateSettingsRef(userId: string) {
  return doc(requireDb(), "users", userId, "private", "settings");
}

/**
 * Mirrors the signed-in user's email into a private (owner-only, never
 * public) doc — the weekly-digest cron reads it via the Admin SDK to find
 * a recipient, without importing firebase-admin/auth (see firestore.rules,
 * /private, for why). Best-effort merge, call alongside syncPublicProfile.
 */
export async function syncPrivateEmail(
  userId: string,
  email: string | null,
): Promise<void> {
  if (!email) return;
  await setDoc(privateSettingsRef(userId), { email }, { merge: true });
}

export async function syncPublicProfile(user: {
  readonly uid: string;
  readonly displayName: string | null;
  readonly photoURL: string | null;
}): Promise<boolean> {
  const ref = publicProfileRef(user.uid);
  const existing = await getDoc(ref);
  // Backfills createdAt for profiles synced before this field existed too —
  // checking the field itself (not just doc existence) is what makes that
  // backfill happen instead of leaving those profiles permanently excluded
  // from the createdAt-ordered "recently joined" query.
  const hasCreatedAt = Boolean(existing.data()?.createdAt);
  await setDoc(
    ref,
    {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      updatedAt: serverTimestamp(),
      ...(hasCreatedAt ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
  return !hasCreatedAt;
}

function usernameRef(usernameLower: string) {
  return doc(requireDb(), "usernames", usernameLower);
}

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username.toLowerCase());
}

/**
 * Claims `username` for `uid`: reserves it (fails if already taken — the
 * `create` succeeds only if the doc doesn't exist yet, no transaction
 * needed) then denormalizes it onto the public profile for prefix search.
 * Throws (Firestore permission-denied) if the username is already claimed.
 */
export async function claimUsername(
  uid: string,
  username: string,
): Promise<void> {
  const usernameLower = username.toLowerCase();
  if (!isValidUsername(usernameLower)) {
    throw new Error("Invalid username");
  }
  await setDoc(usernameRef(usernameLower), {
    uid,
    createdAt: serverTimestamp(),
  });
  await setDoc(
    publicProfileRef(uid),
    { username, usernameLower },
    { merge: true },
  );
}

// Firestore has no native full-text search — prefix range query on the
// denormalized usernameLower field is the whole trick (see design.md-style
// note on PublicProfile). Exact-prefix only, no typo tolerance in v1.
export async function searchUsersByUsername(
  prefix: string,
  count = 10,
): Promise<readonly PublicProfile[]> {
  const p = prefix.trim().toLowerCase();
  if (!p) return [];
  const snapshot = await getDocs(
    query(
      collection(requireDb(), "users"),
      orderBy("usernameLower"),
      where("usernameLower", ">=", p),
      where("usernameLower", "<", p + ""),
      fsLimit(count),
    ),
  );
  return snapshot.docs.map((d) => d.data() as PublicProfile);
}

export function subscribeToPublicProfile(
  userId: string,
  callback: (profile: PublicProfile | null) => void,
  onError?: () => void,
): () => void {
  return onSnapshot(
    publicProfileRef(userId),
    (snapshot) => {
      callback(snapshot.exists() ? (snapshot.data() as PublicProfile) : null);
    },
    onError,
  );
}

// Public by design (the `users` doc itself is public-read, see
// firestore.rules) — backs the "recently joined" slider on the home page.
export async function fetchRecentUsers(
  count: number,
): Promise<readonly PublicProfile[]> {
  const snapshot = await getDocs(
    query(
      collection(requireDb(), "users"),
      orderBy("createdAt", "desc"),
      fsLimit(count),
    ),
  );
  return snapshot.docs.map((d) => d.data() as PublicProfile);
}

export async function sendFollowRequest(
  targetId: string,
  requester: {
    readonly uid: string;
    readonly displayName: string | null;
    readonly photoURL: string | null;
  },
): Promise<void> {
  await setDoc(followRequestRef(targetId, requester.uid), {
    requesterId: requester.uid,
    requesterName: requester.displayName,
    requesterPhotoURL: requester.photoURL,
    createdAt: serverTimestamp(),
  });
}

export async function cancelFollowRequest(
  targetId: string,
  requesterId: string,
): Promise<void> {
  await deleteDoc(followRequestRef(targetId, requesterId));
}

export function subscribeToFollowRequests(
  userId: string,
  callback: (requests: readonly FollowRequest[]) => void,
): () => void {
  return onSnapshot(
    collection(requireDb(), "users", userId, "followRequests"),
    (snapshot) => {
      callback(snapshot.docs.map((d) => d.data() as FollowRequest));
    },
  );
}

/** Checks whether I have a pending request to follow targetId. */
export function subscribeToFollowRequestStatus(
  targetId: string,
  requesterId: string,
  callback: (pending: boolean) => void,
): () => void {
  return onSnapshot(followRequestRef(targetId, requesterId), (snapshot) => {
    callback(snapshot.exists());
  });
}

// A friend invite (see sendFollowRequest / the FriendSearch flow) is
// accepted as a MUTUAL follow, not one-way: the requester follows the
// target (as before) AND the target follows the requester back. Sequential,
// not batched — same non-transactional tradeoff as unfollow's two deletes;
// firestore.rules requires the followRequest doc to still exist for the
// second write's exists() check, so it's deleted last.
export async function approveFollowRequest(
  target: {
    readonly uid: string;
    readonly displayName: string | null;
    readonly photoURL: string | null;
  },
  request: FollowRequest,
): Promise<void> {
  await setDoc(followerRef(target.uid, request.requesterId), {
    followerId: request.requesterId,
    followerName: request.requesterName,
    followerPhotoURL: request.requesterPhotoURL,
    since: serverTimestamp(),
  });
  await setDoc(followerRef(request.requesterId, target.uid), {
    followerId: target.uid,
    followerName: target.displayName,
    followerPhotoURL: target.photoURL,
    since: serverTimestamp(),
  });
  // The target's own `following` mirror can complete right away — the
  // followers doc it depends on (just above) already exists. The
  // requester's mirror still completes the old way (on visiting the
  // target's profile — see UserProfile.tsx) since only the requester's own
  // client is allowed to write it.
  await setDoc(followingRef(target.uid, request.requesterId), {
    targetId: request.requesterId,
    targetName: request.requesterName,
    targetPhotoURL: request.requesterPhotoURL,
    since: serverTimestamp(),
  });
  await deleteDoc(followRequestRef(target.uid, request.requesterId));
}

export async function denyFollowRequest(
  targetId: string,
  requesterId: string,
): Promise<void> {
  await deleteDoc(followRequestRef(targetId, requesterId));
}

/** My own entry in targetId's followers list — existing means I'm approved. */
export function subscribeToIsFollower(
  targetId: string,
  myUid: string,
  callback: (approved: boolean) => void,
): () => void {
  return onSnapshot(followerRef(targetId, myUid), (snapshot) => {
    callback(snapshot.exists());
  });
}

export function subscribeToIsFollowing(
  myUid: string,
  targetId: string,
  callback: (following: boolean) => void,
): () => void {
  return onSnapshot(followingRef(myUid, targetId), (snapshot) => {
    callback(snapshot.exists());
  });
}

// Once a request is approved, only the follower can write their own
// `following` mirror doc (firestore.rules requires it to already exist in
// the target's `followers`) — call this after subscribeToIsFollower
// reports true, to complete the mirror on the follower's side.
export async function completeFollowMirror(
  myUid: string,
  target: {
    readonly uid: string;
    readonly displayName: string | null;
    readonly photoURL: string | null;
  },
): Promise<void> {
  await setDoc(followingRef(myUid, target.uid), {
    targetId: target.uid,
    targetName: target.displayName,
    targetPhotoURL: target.photoURL,
    since: serverTimestamp(),
  });
}

export async function unfollow(myUid: string, targetId: string): Promise<void> {
  await deleteDoc(followingRef(myUid, targetId));
  await deleteDoc(followerRef(targetId, myUid));
}

export function subscribeToFollowingList(
  userId: string,
  callback: (following: readonly Following[]) => void,
  onError?: () => void,
): () => void {
  return onSnapshot(
    collection(requireDb(), "users", userId, "following"),
    (snapshot) => {
      callback(snapshot.docs.map((d) => d.data() as Following));
    },
    onError,
  );
}

// Powers the /friends page's per-friend activity cards — one read each
// against seen/watchlist/recommendations, capped to the single most recent
// entry. A one-shot fetch (not onSnapshot): the feed doesn't need to be
// live-updating, and a snapshot listener per list per friend would be a lot
// of open connections for a page that's just a summary. Relies on the same
// read access already granted to an approved follower for watchlist/seen
// (see firestore.rules) — recommendations is public read regardless.
export async function fetchLatestActivity(
  userId: string,
): Promise<FriendActivity> {
  const [seenSnap, watchlistSnap, recommendedSnap] = await Promise.all([
    getDocs(
      query(
        collection(requireDb(), "users", userId, "seen"),
        orderBy("watchedAt", "desc"),
        fsLimit(1),
      ),
    ),
    getDocs(
      query(
        collection(requireDb(), "users", userId, "watchlist"),
        orderBy("addedAt", "desc"),
        fsLimit(1),
      ),
    ),
    getDocs(
      query(
        collection(requireDb(), "users", userId, "recommendations"),
        orderBy("addedAt", "desc"),
        fsLimit(1),
      ),
    ),
  ]);

  return {
    lastWatched: (seenSnap.docs[0]?.data() as SeenMovie | undefined) ?? null,
    lastWatchlisted:
      (watchlistSnap.docs[0]?.data() as WatchlistMovie | undefined) ?? null,
    lastRecommended:
      (recommendedSnap.docs[0]?.data() as RecommendedMovie | undefined) ?? null,
  };
}

export function subscribeToFollowersList(
  userId: string,
  callback: (followers: readonly Follower[]) => void,
  onError?: () => void,
): () => void {
  return onSnapshot(
    collection(requireDb(), "users", userId, "followers"),
    (snapshot) => {
      callback(snapshot.docs.map((d) => d.data() as Follower));
    },
    onError,
  );
}

// Read-only from the client — invites are written server-side only, via
// /api/invite and /api/invite/convert (Admin SDK), see firestore.rules.
export function subscribeToInvites(
  userId: string,
  callback: (invites: readonly Invite[]) => void,
): () => void {
  return onSnapshot(
    collection(requireDb(), "users", userId, "invites"),
    (snapshot) => {
      callback(snapshot.docs.map((d) => d.data() as Invite));
    },
  );
}

/**
 * Replaces which watchlist movies carry `challengeId`. Selected movies already
 * in the watchlist just get tagged (their addedAt is preserved); new ones are
 * added; previously-tagged movies no longer selected lose the tag but stay in
 * the watchlist. One atomic batch.
 */
export async function setChallengeMovies(
  userId: string,
  challengeId: string,
  selected: readonly TrendingMovie[],
  watchlistIds: ReadonlySet<number>,
  previouslyTaggedIds: readonly number[],
): Promise<void> {
  const batch = writeBatch(requireDb());
  const selectedIds = new Set(selected.map((m) => m.tmdbMovieId));
  for (const m of selected) {
    const ref = watchlistMovieRef(userId, m.tmdbMovieId);
    if (watchlistIds.has(m.tmdbMovieId)) {
      batch.update(ref, { challenge: challengeId });
    } else {
      batch.set(ref, {
        tmdbId: m.tmdbMovieId,
        title: m.title,
        posterPath: m.posterPath,
        releaseYear: m.releaseYear,
        voteAverage: m.voteAverage,
        genreIds: m.genreIds,
        challenge: challengeId,
        addedAt: serverTimestamp(),
      });
    }
  }
  for (const id of previouslyTaggedIds) {
    if (!selectedIds.has(id)) {
      batch.update(watchlistMovieRef(userId, id), { challenge: deleteField() });
    }
  }
  await batch.commit();
}
