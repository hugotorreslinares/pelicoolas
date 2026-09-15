import { createRemoteJWKSet, jwtVerify } from "jose";

// Verifies a Firebase Auth ID token by hand instead of via
// firebase-admin/auth: that module pulls in jwks-rsa, which does a runtime
// require("jose") that Sentry's server auto-instrumentation (require-in-
// the-middle, wired up by @sentry/astro) breaks with ERR_REQUIRE_ESM on
// Vercel's Node runtime — jose is exports-map ESM-only. Verifying directly
// with jose (imported normally, never through require) sidesteps that
// entirely. Same token format/algorithm Google documents for manual
// verification: https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

export interface VerifiedToken {
  readonly uid: string;
  readonly name: string | null;
}

export async function verifyFirebaseIdToken(
  token: string,
): Promise<VerifiedToken> {
  const projectId = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("Token has no subject");
  }
  return {
    uid: payload.sub,
    name: typeof payload.name === "string" ? payload.name : null,
  };
}
