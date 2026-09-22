import { describe, expect, it } from "vitest";
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "./digestUnsubscribe";

describe("digest unsubscribe token", () => {
  it("verifies a token created for the same uid/secret", () => {
    const token = createUnsubscribeToken("alice", "secret");
    expect(verifyUnsubscribeToken("alice", token, "secret")).toBe(true);
  });

  it("rejects a token for a different uid, secret, or a tampered value", () => {
    const token = createUnsubscribeToken("alice", "secret");
    expect(verifyUnsubscribeToken("bob", token, "secret")).toBe(false);
    expect(verifyUnsubscribeToken("alice", token, "other-secret")).toBe(false);
    expect(verifyUnsubscribeToken("alice", `${token}0`, "secret")).toBe(false);
    expect(verifyUnsubscribeToken("alice", "not-hex", "secret")).toBe(false);
  });
});
