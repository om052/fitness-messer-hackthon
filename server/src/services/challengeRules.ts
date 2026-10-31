export interface ChallengeAgreementState {
  status: "pending" | "active" | "agreed" | "resolved" | "cancelled";
  challengerAcceptedAt?: Date;
  defenderAcceptedAt?: Date;
}

export function hasBothChallengeAgreements(
  challenge: ChallengeAgreementState,
): boolean {
  return (
    challenge.status === "pending" &&
    challenge.challengerAcceptedAt !== undefined &&
    challenge.defenderAcceptedAt !== undefined
  );
}
