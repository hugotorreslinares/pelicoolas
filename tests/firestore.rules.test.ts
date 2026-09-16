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

  // Public by design — a shared profile link (/u/{userId}) needs to show
  // a name/photo before anyone follows anyone. Never holds movie data.
  it("lets anyone read another user's doc, signed in or not", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice"), {
        displayName: "Alice",
      });
    });
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertSucceeds(getDoc(doc(bobDb, "users/alice")));
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(anonDb, "users/alice")));
  });

  it("denies anyone but the owner from writing to it", async () => {
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(
      setDoc(doc(bobDb, "users/alice"), { displayName: "Alice" }),
    );
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(anonDb, "users/alice"), { displayName: "Alice" }),
    );
  });
});

describe("firestore.rules — follow requests/followers/following", () => {
  it("lets anyone create a follow request under their own uid, and only the target read/delete it", async () => {
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertSucceeds(
      setDoc(doc(bobDb, "users/alice/followRequests/bob"), {
        requesterId: "bob",
      }),
    );
    await assertFails(
      setDoc(doc(bobDb, "users/alice/followRequests/carol"), {
        requesterId: "carol",
      }),
    );
    await assertSucceeds(getDoc(doc(bobDb, "users/alice/followRequests/bob")));

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      getDoc(doc(aliceDb, "users/alice/followRequests/bob")),
    );
    await assertFails(
      getDoc(
        doc(
          testEnv.authenticatedContext("carol").firestore(),
          "users/alice/followRequests/bob",
        ),
      ),
    );
    await assertSucceeds(
      deleteDoc(doc(aliceDb, "users/alice/followRequests/bob")),
    );
  });

  it("lets only the target write followers, and a follower read/delete just their own entry", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, "users/alice/followers/bob"), {
        followerId: "bob",
      }),
    );
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(
      setDoc(doc(bobDb, "users/alice/followers/carol"), {
        followerId: "carol",
      }),
    );
    await assertSucceeds(getDoc(doc(bobDb, "users/alice/followers/bob")));
    await assertFails(
      getDoc(
        doc(
          testEnv.authenticatedContext("carol").firestore(),
          "users/alice/followers/bob",
        ),
      ),
    );
    await assertSucceeds(deleteDoc(doc(bobDb, "users/alice/followers/bob")));
  });

  it("only lets a follower mirror `following` once the matching `followers` entry exists", async () => {
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(
      setDoc(doc(bobDb, "users/bob/following/alice"), { targetId: "alice" }),
    );

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/followers/bob"), {
        followerId: "bob",
      });
    });
    await assertSucceeds(
      setDoc(doc(bobDb, "users/bob/following/alice"), { targetId: "alice" }),
    );
  });

  it("lets an approved follower read watchlist/seen, but not anyone else", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/watchlist/1"), {
        title: "Movie",
      });
      await setDoc(doc(ctx.firestore(), "users/alice/seen/1"), {
        title: "Movie",
      });
      await setDoc(doc(ctx.firestore(), "users/alice/followers/bob"), {
        followerId: "bob",
      });
    });
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertSucceeds(getDoc(doc(bobDb, "users/alice/watchlist/1")));
    await assertSucceeds(getDoc(doc(bobDb, "users/alice/seen/1")));

    const carolDb = testEnv.authenticatedContext("carol").firestore();
    await assertFails(getDoc(doc(carolDb, "users/alice/watchlist/1")));
    await assertFails(getDoc(doc(carolDb, "users/alice/seen/1")));
  });
});

describe("firestore.rules — usernames", () => {
  it("lets a user reserve a username under their own uid, but not on behalf of someone else", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, "usernames/alice_a"), { uid: "alice" }),
    );
    await assertFails(setDoc(doc(aliceDb, "usernames/bob_b"), { uid: "bob" }));
  });

  it("denies claiming a username someone else already reserved", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, "usernames/shared"), { uid: "alice" }),
    );
    // The doc already exists, so Bob's setDoc is an `update`, not a
    // `create` — and there's no `allow update` at all, so it's denied by
    // default. This is exactly the atomic "create fails if taken" the
    // reservation scheme relies on.
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(setDoc(doc(bobDb, "usernames/shared"), { uid: "bob" }));
  });

  it("anyone can read a username reservation", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "usernames/alice_a"), {
        uid: "alice",
      });
    });
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(anonDb, "usernames/alice_a")));
  });
});

describe("firestore.rules — mutual follow on accept", () => {
  it("lets the target declare themselves a follower back, only if they invited the requester first", async () => {
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    // No followRequest from Alice to Bob exists yet — Bob can't claim to
    // follow Alice this way.
    await assertFails(
      setDoc(doc(bobDb, "users/alice/followers/bob"), { followerId: "bob" }),
    );

    // Alice invited Bob (users/bob/followRequests/alice) — now Bob accepting
    // can write the reverse: he follows Alice too.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/bob/followRequests/alice"), {
        requesterId: "alice",
      });
    });
    await assertSucceeds(
      setDoc(doc(bobDb, "users/alice/followers/bob"), { followerId: "bob" }),
    );
  });

  it("doesn't let a third party piggyback on someone else's invite", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/bob/followRequests/alice"), {
        requesterId: "alice",
      });
    });
    // Carol has no invite of her own to Bob — she can't declare herself a
    // follower of Alice by riding Alice's request to Bob.
    const carolDb = testEnv.authenticatedContext("carol").firestore();
    await assertFails(
      setDoc(doc(carolDb, "users/alice/followers/carol"), {
        followerId: "carol",
      }),
    );
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

  it("lets someone alice follows create a recommendation notification for her", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/following/bob"), {
        targetId: "bob",
        since: "2026-01-01T00:00:00.000Z",
      });
    });
    const bob = testEnv.authenticatedContext("bob").firestore();
    await assertSucceeds(
      setDoc(doc(bob, "users/alice/notifications/n2"), {
        type: "recommendation",
        recommenderId: "bob",
        recommenderName: "Bob",
        movieId: 1,
        movieTitle: "Dune: Part Three",
        posterPath: null,
        read: false,
      }),
    );
  });

  it("denies a non-follower from creating a recommendation notification", async () => {
    const carol = testEnv.authenticatedContext("carol").firestore();
    await assertFails(
      setDoc(doc(carol, "users/alice/notifications/n3"), {
        type: "recommendation",
        recommenderId: "carol",
        recommenderName: "Carol",
        movieId: 1,
        movieTitle: "Dune: Part Three",
        posterPath: null,
        read: false,
      }),
    );
  });

  it("denies a follower from spoofing recommenderId as someone else", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/following/bob"), {
        targetId: "bob",
        since: "2026-01-01T00:00:00.000Z",
      });
    });
    const bob = testEnv.authenticatedContext("bob").firestore();
    await assertFails(
      setDoc(doc(bob, "users/alice/notifications/n4"), {
        type: "recommendation",
        recommenderId: "someone-else",
        recommenderName: "Bob",
        movieId: 1,
        movieTitle: "Dune: Part Three",
        posterPath: null,
        read: false,
      }),
    );
  });
});

describe("firestore.rules — invites", () => {
  it("lets a user read their own invites, but never write them (server-only via Admin SDK)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/invites/i1"), {
        email: "friend@example.com",
        sentAt: "2026-01-01T00:00:00.000Z",
        status: "sent",
        convertedUid: null,
        convertedAt: null,
      });
    });
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(alice, "users/alice/invites/i1")));
    await assertFails(
      updateDoc(doc(alice, "users/alice/invites/i1"), { status: "converted" }),
    );
  });

  it("denies another authenticated user from reading it", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/invites/i1"), {
        email: "friend@example.com",
        sentAt: "2026-01-01T00:00:00.000Z",
        status: "sent",
        convertedUid: null,
        convertedAt: null,
      });
    });
    const bob = testEnv.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(bob, "users/alice/invites/i1")));
  });
});
