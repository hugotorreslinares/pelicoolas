import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  initializeFirestore,
  setDoc,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

// Firebase credentials aren't configured until deploy time (see .env.example);
// avoid crashing SSR/build when they're absent.
const isConfigured = Boolean(firebaseConfig.apiKey);

export const firebaseApp: FirebaseApp | null = isConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;
export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;

// Optional fields (e.g. `mediaType` on movie search results, which are
// implicitly "movie") are routinely `undefined` in the objects we write.
// Firestore rejects those by default ("Unsupported field value: undefined"),
// which surfaced as "Couldn't update" when adding a search result to the
// watched list/watchlist. Skipping them matches the "absent means movie"
// convention used across the data model.
function createFirestore(app: FirebaseApp): Firestore {
  try {
    return initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    // Already initialized for this app (HMR / second module instance) —
    // initializeFirestore can only run once, so reuse that instance.
    return getFirestore(app);
  }
}

export const db: Firestore | null = firebaseApp
  ? createFirestore(firebaseApp)
  : null;

// Playwright E2E only (see tests-e2e/) — this flag is never set in dev or
// on Vercel, so this block is dead code outside that harness. Emulator
// connection must happen once, before the SDK issues its first request.
// __e2eSignIn is a bypass for the Google popup (unautomatable in a
// headless browser): tests call it directly via page.evaluate() with a
// user seeded into the Auth emulator over its REST API beforehand.
if (auth && db && import.meta.env.PUBLIC_USE_FIREBASE_EMULATOR === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  if (typeof window !== "undefined") {
    (
      window as unknown as {
        __e2eSignIn: (email: string, password: string) => Promise<unknown>;
      }
    ).__e2eSignIn = (email, password) =>
      signInWithEmailAndPassword(auth, email, password);

    // Same idea as __e2eSignIn: pre-claims a username for the test user so
    // the blocking UsernamePrompt modal doesn't sit on top of the page
    // under test. Not importing claimUsername from firestore.ts here to
    // avoid a circular import (it imports `db` from this module) — this is
    // the same merge-write, minus the `usernames/{username}` reservation
    // doc, which nothing under test needs.
    (
      window as unknown as {
        __e2eClaimUsername: (uid: string, username: string) => Promise<void>;
      }
    ).__e2eClaimUsername = (uid, username) =>
      setDoc(
        doc(db, "users", uid),
        { username, usernameLower: username.toLowerCase() },
        { merge: true },
      );
  }
}
