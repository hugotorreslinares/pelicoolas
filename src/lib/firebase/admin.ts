import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null = null;

// Server-only, privileged access — bypasses firestore.rules entirely.
// Only for the cron job, which needs to read every user's followedPeople
// and write notification docs without a signed-in request.uid to scope to.
// Never import this from anything reachable by a client request.
function getAdminApp(): App {
  if (app) return app;

  const existing = getApps();
  if (existing[0]) {
    app = existing[0];
    return app;
  }

  const json = import.meta.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
  }
  app = initializeApp({ credential: cert(JSON.parse(json)) });
  return app;
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}
