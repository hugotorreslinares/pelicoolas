import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./client";
import type {
  FollowedPerson,
  WatchedMovie,
  WatchlistMovie,
} from "@/types/filmography";

function requireDb() {
  if (!db) throw new Error("Firebase is not configured");
  return db;
}

function followedPersonRef(userId: string, personId: number) {
  return doc(requireDb(), "users", userId, "followedPeople", String(personId));
}

function watchedMovieRef(userId: string, personId: number, movieId: number) {
  return doc(
    requireDb(),
    "users",
    userId,
    "followedPeople",
    String(personId),
    "watchedMovies",
    String(movieId),
  );
}

function watchlistMovieRef(userId: string, movieId: number) {
  return doc(requireDb(), "users", userId, "watchlist", String(movieId));
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
      callback(snapshot.docs.map((d) => d.data() as FollowedPerson));
    },
  );
}

export async function markMovieWatched(
  userId: string,
  personId: number,
  movieId: number,
): Promise<void> {
  await setDoc(watchedMovieRef(userId, personId, movieId), {
    tmdbId: movieId,
    watchedAt: serverTimestamp(),
  });
}

export async function unmarkMovieWatched(
  userId: string,
  personId: number,
  movieId: number,
): Promise<void> {
  await deleteDoc(watchedMovieRef(userId, personId, movieId));
}

export function subscribeToWatchedMovies(
  userId: string,
  personId: number,
  callback: (watched: ReadonlySet<number>) => void,
): () => void {
  return onSnapshot(
    collection(
      requireDb(),
      "users",
      userId,
      "followedPeople",
      String(personId),
      "watchedMovies",
    ),
    (snapshot) => {
      const watched = new Set<number>(
        snapshot.docs.map((d) => (d.data() as WatchedMovie).tmdbId),
      );
      callback(watched);
    },
  );
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
    readonly sourcePersonName: string;
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
