import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// Runs against the Firestore emulator (see package.json's `test:rules`
// script) — never against the real project. Not part of `pnpm test` /
// CI's `astro check` pipeline: it needs a JVM + `firebase-tools`, which CI
// doesn't have. Run manually with `pnpm test:rules`.

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "filmo-rules-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("firestore.rules — users/{userId}", () => {
  it("lets a signed-in user read and write their own doc", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(db, "users/alice"), { displayName: "Alice" }),
    );
    await assertSucceeds(getDoc(doc(db, "users/alice")));
  });

  it("denies reading another user's doc", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice"), {
        displayName: "Alice",
      });
    });
    const db = testEnv.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(db, "users/alice")));
  });

  it("denies an unauthenticated client entirely", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "users/alice")));
    await assertFails(setDoc(doc(db, "users/alice"), { displayName: "Alice" }));
  });
});

describe("firestore.rules — followedPeople + nested watchedMovies", () => {
  it("lets a user follow a person and mark a movie watched under their own uid", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(db, "users/alice/followedPeople/31"), {
        name: "Tom Hanks",
        tmdbId: 31,
      }),
    );
    await assertSucceeds(
      setDoc(doc(db, "users/alice/followedPeople/31/watchedMovies/13"), {
        watchedAt: "now",
      }),
    );
  });

  it("denies another user from writing into someone else's followedPeople or watchedMovies", async () => {
    const db = testEnv.authenticatedContext("bob").firestore();
    await assertFails(
      setDoc(doc(db, "users/alice/followedPeople/31"), {
        name: "Tom Hanks",
        tmdbId: 31,
      }),
    );
    await assertFails(
      setDoc(doc(db, "users/alice/followedPeople/31/watchedMovies/13"), {
        watchedAt: "now",
      }),
    );
  });

  it("lets a user unfollow (delete) their own followed person", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await setDoc(doc(db, "users/alice/followedPeople/31"), {
      name: "Tom Hanks",
      tmdbId: 31,
    });
    await assertSucceeds(deleteDoc(doc(db, "users/alice/followedPeople/31")));
  });
});

describe("firestore.rules — watchlist", () => {
  it("lets a user add and read their own watchlist entries", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(db, "users/alice/watchlist/13"), {
        title: "Forrest Gump",
        tmdbId: 13,
      }),
    );
    await assertSucceeds(getDoc(doc(db, "users/alice/watchlist/13")));
  });

  it("denies another authenticated user from reading or writing it", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/watchlist/13"), {
        title: "Forrest Gump",
        tmdbId: 13,
      });
    });
    const db = testEnv.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(db, "users/alice/watchlist/13")));
    await assertFails(deleteDoc(doc(db, "users/alice/watchlist/13")));
  });
});

describe("firestore.rules — badges", () => {
  it("lets a user read and write their own earned badges", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(db, "users/alice/badges/person-complete-31"), {
        type: "person-complete",
        label: "Completed Tom Hanks",
      }),
    );
    await assertSucceeds(
      getDoc(doc(db, "users/alice/badges/person-complete-31")),
    );
  });

  it("denies another authenticated user from reading or writing them", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "users/alice/badges/person-complete-31"),
        {
          type: "person-complete",
          label: "Completed Tom Hanks",
        },
      );
    });
    const db = testEnv.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(db, "users/alice/badges/person-complete-31")));
    await assertFails(
      setDoc(doc(db, "users/alice/badges/person-complete-31"), {
        type: "person-complete",
        label: "Completed Tom Hanks",
      }),
    );
  });
});

describe("firestore.rules — recommendations (public board)", () => {
  it("lets a user add, read, and remove their own recommendations", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(db, "users/alice/recommendations/13"), {
        title: "Forrest Gump",
        tmdbId: 13,
      }),
    );
    await assertSucceeds(getDoc(doc(db, "users/alice/recommendations/13")));
    await assertSucceeds(deleteDoc(doc(db, "users/alice/recommendations/13")));
  });

  it("lets anyone read a board, signed in or not", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/recommendations/13"), {
        title: "Forrest Gump",
        tmdbId: 13,
      });
    });
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(anon, "users/alice/recommendations/13")));
    const bob = testEnv.authenticatedContext("bob").firestore();
    await assertSucceeds(getDoc(doc(bob, "users/alice/recommendations/13")));
  });

  it("denies anyone but the owner from writing to it", async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(anon, "users/alice/recommendations/13"), {
        title: "Forrest Gump",
        tmdbId: 13,
      }),
    );
    const bob = testEnv.authenticatedContext("bob").firestore();
    await assertFails(
      setDoc(doc(bob, "users/alice/recommendations/13"), {
        title: "Forrest Gump",
        tmdbId: 13,
      }),
    );
  });
});

describe("firestore.rules — seen (personal watched log)", () => {
  it("lets a user mark, read, and unmark a movie as seen", async () => {
    const db = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(db, "users/alice/seen/13"), {
        title: "Forrest Gump",
        tmdbId: 13,
      }),
    );
    await assertSucceeds(getDoc(doc(db, "users/alice/seen/13")));
    await assertSucceeds(deleteDoc(doc(db, "users/alice/seen/13")));
  });

  it("denies another authenticated user from reading or writing it", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/seen/13"), {
        title: "Forrest Gump",
        tmdbId: 13,
      });
    });
    const bob = testEnv.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(bob, "users/alice/seen/13")));
    await assertFails(
      setDoc(doc(bob, "users/alice/seen/13"), {
        title: "Forrest Gump",
        tmdbId: 13,
      }),
    );
  });
});

describe("firestore.rules — notifications", () => {
  it("lets a user read and mark their own notification read", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/notifications/n1"), {
        type: "new-release",
        movieId: 1,
        movieTitle: "Dune: Part Three",
        read: false,
      });
    });
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(alice, "users/alice/notifications/n1")));
    await assertSucceeds(
      updateDoc(doc(alice, "users/alice/notifications/n1"), { read: true }),
    );
  });

  it("denies another authenticated user from reading or writing it", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/notifications/n1"), {
        type: "new-release",
        movieId: 1,
        movieTitle: "Dune: Part Three",
        read: false,
      });
    });
    const bob = testEnv.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(bob, "users/alice/notifications/n1")));
    await assertFails(
      updateDoc(doc(bob, "users/alice/notifications/n1"), { read: true }),
    );
  });
});
