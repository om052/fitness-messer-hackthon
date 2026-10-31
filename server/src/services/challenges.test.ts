import { describe, expect, it } from "vitest";
import { hasBothChallengeAgreements } from "./challengeRules.js";

describe("challenge agreement state", () => {
  it("does not finalize while either participant has not agreed", () => {
    expect(
      hasBothChallengeAgreements({
        status: "pending",
        challengerAcceptedAt: new Date(),
      }),
    ).toBe(false);
  });

  it("finalizes only a pending challenge accepted by both participants", () => {
    const accepted = {
      status: "pending" as const,
      challengerAcceptedAt: new Date(),
      defenderAcceptedAt: new Date(),
    };

    expect(hasBothChallengeAgreements(accepted)).toBe(true);
    expect(hasBothChallengeAgreements({ ...accepted, status: "resolved" })).toBe(false);
  });
});
