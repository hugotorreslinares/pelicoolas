import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "./client";

const googleProvider = new GoogleAuthProvider();

// Browsers with aggressive third-party-cookie/popup blocking (DuckDuckGo,
// Brave, Firefox strict mode) either refuse to open the popup at all or
// open it but can't relay the auth result back — signInWithPopup then
// throws one of these codes instead of resolving. Falling back to a full-
// page redirect avoids the third-party storage access popups depend on;
// the result comes back through the normal onAuthStateChanged listener
// once the user returns from Google.
const POPUP_BLOCKED_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/cancelled-popup-request",
]);

function isAuthErrorCode(error: unknown, codes: Set<string>): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    codes.has(error.code)
  );
}

export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) throw new Error("Firebase is not configured");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    if (!isAuthErrorCode(error, POPUP_BLOCKED_CODES)) throw error;
    await signInWithRedirect(auth, googleProvider);
    return null; // browser navigates away to Google before this resolves
  }
}

export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export function subscribeToAuthState(
  callback: (user: User | null) => void,
): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
