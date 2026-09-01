import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./client";
import type { FollowedPerson, WatchedMovie } from "@/types/filmography";

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

export async function followPerson(
  userId: string,
  person: Omit<FollowedPerson, "createdAt">,
): Promise<void> {
  await setDoc(followedPersonRef(userId, person.tmdbId), {
    ...person,
    createdAt: serverTimestamp(),
  });
}

export async function unfollowPerson(userId: string, personId: number): Promise<void> {
  await deleteDoc(followedPersonRef(userId, personId));
}

export async function isFollowingPerson(userId: string, personId: number): Promise<boolean> {
  const snapshot = await getDoc(followedPersonRef(userId, personId));
  return snapshot.exists();
}

export function subscribeToFollowedPeople(
  userId: string,
  callback: (people: readonly FollowedPerson[]) => void,
): () => void {
  return onSnapshot(collection(requireDb(), "users", userId, "followedPeople"), (snapshot) => {
    callback(snapshot.docs.map((d) => d.data() as FollowedPerson));
  });
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
    collection(requireDb(), "users", userId, "followedPeople", String(personId), "watchedMovies"),
    (snapshot) => {
      const watched = new Set<number>(
        snapshot.docs.map((d) => (d.data() as WatchedMovie).tmdbId),
      );
      callback(watched);
    },
  );
}
