import { expect, test } from "@playwright/test";

const AUTH_EMULATOR_URL = "http://127.0.0.1:9099";
const FIRESTORE_EMULATOR_URL = "http://127.0.0.1:8080";
const PROJECT_ID = "demo-filmo-e2e";
const TEST_EMAIL = "e2e@example.com";
const TEST_PASSWORD = "e2e-test-password";
const FAKE_API_KEY = "fake-api-key";

// The Auth emulator persists users (and Firestore its documents) across
// separate `emulators:start` sessions run back to back locally — clearing
// Firestore before each run keeps "mark watched" idempotent regardless of
// what a previous run left behind. CI always starts from an empty
// emulator anyway, so this is a no-op there.
async function clearFirestore(): Promise<void> {
  await fetch(
    `${FIRESTORE_EMULATOR_URL}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
}

// Seeds a user directly into the Auth emulator over its REST API — no
// Admin SDK credentials needed, and it's what lets the test sign in
// without going through Google's (unautomatable) popup flow. Idempotent:
// a re-run against an already-seeded emulator gets EMAIL_EXISTS, which is
// fine.
async function seedTestUser(): Promise<void> {
  const res = await fetch(
    `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FAKE_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        returnSecureToken: true,
      }),
    },
  );
  if (res.ok) return;
  const body: { error?: { message?: string } } = await res
    .json()
    .catch(() => ({}));
  if (body.error?.message !== "EMAIL_EXISTS") {
    throw new Error(`Failed to seed E2E test user: ${JSON.stringify(body)}`);
  }
}

test.beforeAll(async () => {
  await seedTestUser();
  await clearFirestore();
});

test("search → follow → mark watched → see progress", async ({ page }) => {
  await page.goto("/search");
  // On a cold dev server, this first real browser hit is what makes Vite
  // discover it needs to pre-bundle a dependency (e.g. @sentry/astro, only
  // pulled in client-side) it hasn't optimized yet — Vite invalidates and
  // reloads its module graph mid-request, which permanently breaks any
  // island hydration already in flight ("Failed to fetch dynamically
  // imported module"). A plain HTTP warm-up (e.g. the webServer readiness
  // check) doesn't trigger this, since it never runs the client bundle —
  // only an actual browser does. Reloading once, after deps have settled,
  // sidesteps it reliably instead of guessing a delay.
  await page.reload();

  // PersonSearch is a client:load island: the input is already visible and
  // fillable in the server-rendered HTML before React hydrates and attaches
  // its onChange, so a single .fill() can land in that gap and never
  // trigger the debounced search — no error, just silently 0 results
  // forever. Retrying the fill (a fresh input event each time) until the
  // result actually shows up sidesteps the race instead of guessing a
  // fixed hydration delay.
  const resultButton = page.getByRole("button", { name: "Test Actor" });
  const searchInput = page.getByPlaceholder("Search actor or director...");
  await expect(async () => {
    await searchInput.fill("");
    await searchInput.fill("Test");
    await expect(resultButton).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });

  await Promise.all([
    page.waitForURL(/\/person\/999001/),
    resultButton.click(),
  ]);

  // Bypasses the Google sign-in popup, which can't be automated headlessly
  // — exposed only under PUBLIC_USE_FIREBASE_EMULATOR (see client.ts).
  // client.ts sets this once its module finishes evaluating, which can
  // still be in flight right after navigation (client:load islands
  // hydrate asynchronously), so wait for it rather than racing it.
  await page.waitForFunction(
    () =>
      typeof (window as unknown as Record<string, unknown>).__e2eSignIn ===
      "function",
  );
  await page.evaluate(
    ([email, password]) =>
      (
        window as unknown as {
          __e2eSignIn: (e: string, p: string) => Promise<unknown>;
        }
      ).__e2eSignIn(email, password),
    [TEST_EMAIL, TEST_PASSWORD],
  );

  const followButton = page.getByRole("button", { name: "+ Follow" });
  await followButton.click();
  await expect(page.getByRole("button", { name: "✓ Following" })).toBeVisible();

  // .click() + waiting on the post-check aria-label, not .check() — the
  // checkbox's own aria-label flips from "...as watched" to "...as
  // unwatched" once the write round-trips through the Firestore emulator
  // and the onSnapshot listener re-renders, so a locator pinned to the
  // pre-click label stops matching anything right after the click; that's
  // also a longer round trip than check()'s own stricter retry window.
  await page
    .getByRole("checkbox", { name: "Mark Test Movie as watched" })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Mark Test Movie as unwatched" }),
  ).toBeChecked({
    timeout: 10_000,
  });

  await page.goto("/filmographies");
  await expect(page.getByText("Test Actor")).toBeVisible();
  await expect(page.getByText("1 / 1 · 0 remaining")).toBeVisible({
    timeout: 10_000,
  });
});
