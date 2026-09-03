import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
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
export const db: Firestore | null = firebaseApp
  ? getFirestore(firebaseApp)
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
  }
}
