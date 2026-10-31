import { describe, expect, it } from "vitest";
import {
  makeUnverifiedWorkout,
  submissionsMatch,
} from "./workoutRules.js";

describe("unverified workout reports", () => {
  const submission = {
    clerkUserId: "user-1",
    sessionId: "23c7ab66-50c7-4bfc-a18e-3c6634502b00",
    exerciseId: "pushup" as const,
    quantity: 15,
    durationSec: 90,
    startedAt: new Date("2026-10-31T00:00:00.000Z"),
  };

  it("never allocates progression or FM rewards", () => {
    const workout = makeUnverifiedWorkout(
      submission,
      new Date("2026-10-31T00:02:00.000Z"),
    );

    expect(workout).toMatchObject({
      status: "unverified",
      source: "client_reported",
      xp: 0,
      strength: 0,
      coins: 0,
    });
  });

  it("matches an idempotent retry only when its submitted details match", () => {
    const existing = makeUnverifiedWorkout(submission);

    expect(submissionsMatch(existing, submission)).toBe(true);
    expect(submissionsMatch(existing, { ...submission, quantity: 16 })).toBe(false);
    expect(
      submissionsMatch(existing, {
        ...submission,
        clerkUserId: "another-user",
      }),
    ).toBe(false);
  });
});
