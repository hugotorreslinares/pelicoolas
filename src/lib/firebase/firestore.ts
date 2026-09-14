import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./client";
import type {
  FollowedPerson,
  RecommendedMovie,
  SeenMovie,
  WatchedMovie,
  WatchlistMovie,
} from "@/types/filmography";
import type { FilmographyMovie } from "@/types/movie";
import type {
  Follower,
  Following,
  FollowRequest,
  PublicProfile,
} from "@/types/user";

export function requireDb() {
  if (!db) throw new Error("Firebase is not configured");
  return db;
}

function followedPersonRef(userId: string, personId: number) {
  return doc(requireDb(), "users", userId, "followedPeople", String(personId));
}

function watchlistMovieRef(userId: string, movieId: number) {
  return doc(requireDb(), "users", userId, "watchlist", String(movieId));
}

function recommendedMovieRef(userId: string, movieId: number) {
  return doc(requireDb(), "users", userId, "recommendations", String(movieId));
}

function seenMovieRef(userId: string, movieId: number) {
  return doc(requireDb(), "users", userId, "seen", String(movieId));
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
  await setDoc(watchlistMovieRef(userId, movie.tmdbId), {
    ...movie,
    addedAt: serverTimestamp(),
  });
}

export async function removeFromWatchlist(
  userId: string,
  movieId: number,
): Promise<void> {
  await deleteDoc(watchlistMovieRef(userId, movieId));
}

/** Backfills genreIds/durationMinutes on a watchlist entry added before those fields existed. */
export async function setWatchlistDetails(
  userId: string,
  movieId: number,
  details: {
    readonly genreIds: readonly number[];
    readonly durationMinutes: number | null;
  },
): Promise<void> {
  await updateDoc(watchlistMovieRef(userId, movieId), details);
}

export async function isInWatchlist(
  userId: string,
  movieId: number,
): Promise<boolean> {
  const snapshot = await getDoc(watchlistMovieRef(userId, movieId));
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
  await setDoc(recommendedMovieRef(userId, movie.tmdbId), {
    ...movie,
    addedAt: serverTimestamp(),
  });
}

export async function removeFromRecommendations(
  userId: string,
  movieId: number,
): Promise<void> {
  await deleteDoc(recommendedMovieRef(userId, movieId));
}

export async function isInRecommendations(
  userId: string,
  movieId: number,
): Promise<boolean> {
  const snapshot = await getDoc(recommendedMovieRef(userId, movieId));
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

export async function markMovieSeen(
  userId: string,
  movie: Omit<SeenMovie, "watchedAt">,
): Promise<void> {
  await setDoc(seenMovieRef(userId, movie.tmdbId), {
    ...movie,
    watchedAt: serverTimestamp(),
  });
}

export async function unmarkMovieSeen(
  userId: string,
  movieId: number,
): Promise<void> {
  await deleteDoc(seenMovieRef(userId, movieId));
}

export async function isMovieSeen(
  userId: string,
  movieId: number,
): Promise<boolean> {
  const snapshot = await getDoc(seenMovieRef(userId, movieId));
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
): Promise<void> {
  await updateDoc(seenMovieRef(userId, movieId), { genreIds });
}

// --- Follow other users --------------------------------------------------
//
// `users/{userId}` itself is public (name/photo only, `allow read: if
// true` — same precedent as `recommendations`) so a shared profile link
// works before anyone approves anything. Everything else here is
// owner-write-only; see design.md for the full approve/mirror flow this
// implements without a Cloud Function.

/** Upserts the public name/photo doc — call once per session after sign-in. */
export async function syncPublicProfile(user: {
  readonly uid: string;
  readonly displayName: string | null;
  readonly photoURL: string | null;
}): Promise<void> {
  await setDoc(
    publicProfileRef(user.uid),
    {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribeToPublicProfile(
  userId: string,
  callback: (profile: PublicProfile | null) => void,
): () => void {
  return onSnapshot(publicProfileRef(userId), (snapshot) => {
    callback(snapshot.exists() ? (snapshot.data() as PublicProfile) : null);
  });
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

export async function approveFollowRequest(
  targetId: string,
  request: FollowRequest,
): Promise<void> {
  await setDoc(followerRef(targetId, request.requesterId), {
    followerId: request.requesterId,
    followerName: request.requesterName,
    followerPhotoURL: request.requesterPhotoURL,
    since: serverTimestamp(),
  });
  await deleteDoc(followRequestRef(targetId, request.requesterId));
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
): () => void {
  return onSnapshot(
    collection(requireDb(), "users", userId, "following"),
    (snapshot) => {
      callback(snapshot.docs.map((d) => d.data() as Following));
    },
  );
}

export function subscribeToFollowersList(
  userId: string,
  callback: (followers: readonly Follower[]) => void,
): () => void {
  return onSnapshot(
    collection(requireDb(), "users", userId, "followers"),
    (snapshot) => {
      callback(snapshot.docs.map((d) => d.data() as Follower));
    },
  );
}
