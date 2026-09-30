import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { mediaDocId, requireDb } from "./firestore";
import type { ListMovie, MovieList } from "@/types/lists";

function listsCollection(userId: string) {
  return collection(requireDb(), "users", userId, "lists");
}

function listRef(userId: string, listId: string) {
  return doc(requireDb(), "users", userId, "lists", listId);
}

function listMovieRef(
  userId: string,
  listId: string,
  movieId: number,
  mediaType?: "movie" | "tv",
) {
  return doc(
    requireDb(),
    "users",
    userId,
    "lists",
    listId,
    "movies",
    mediaDocId(movieId, mediaType),
  );
}

/** Creates a new empty list and returns its id — a fresh doc ref's id,
 *  same "create the ref first, id is free" pattern used for notifications. */
export async function createList(
  userId: string,
  name: string,
): Promise<string> {
  const ref = doc(listsCollection(userId));
  await setDoc(ref, { name, createdAt: serverTimestamp() });
  return ref.id;
}

export async function renameList(
  userId: string,
  listId: string,
  name: string,
): Promise<void> {
  await setDoc(listRef(userId, listId), { name }, { merge: true });
}

/** Deletes the list doc and every movie in it — Firestore doesn't cascade
 *  subcollection deletes on its own, and leaving them behind would orphan
 *  publicly-readable data under a list id nothing points to anymore. */
export async function deleteList(
  userId: string,
  listId: string,
): Promise<void> {
  const moviesSnap = await getDocs(
    collection(requireDb(), "users", userId, "lists", listId, "movies"),
  );
  const batch = writeBatch(requireDb());
  for (const movieDoc of moviesSnap.docs) batch.delete(movieDoc.ref);
  batch.delete(listRef(userId, listId));
  await batch.commit();
}

// No auth check here on purpose — a list is public by design (same
// precedent as `recommendations`/the Halloween list), so a shared link
// works without signing in.
export function subscribeToLists(
  userId: string,
  callback: (lists: readonly MovieList[]) => void,
): () => void {
  const q = query(listsCollection(userId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as MovieList),
    );
  });
}

export function subscribeToListMovies(
  userId: string,
  listId: string,
  callback: (movies: readonly ListMovie[]) => void,
): () => void {
  return onSnapshot(
    collection(requireDb(), "users", userId, "lists", listId, "movies"),
    (snapshot) => {
      callback(snapshot.docs.map((d) => d.data() as ListMovie));
    },
  );
}

export async function addMovieToList(
  userId: string,
  listId: string,
  movie: Omit<ListMovie, "addedAt">,
): Promise<void> {
  await setDoc(listMovieRef(userId, listId, movie.tmdbId, movie.mediaType), {
    ...movie,
    addedAt: serverTimestamp(),
  });
}

export async function removeMovieFromList(
  userId: string,
  listId: string,
  movieId: number,
  mediaType?: "movie" | "tv",
): Promise<void> {
  await deleteDoc(listMovieRef(userId, listId, movieId, mediaType));
}
