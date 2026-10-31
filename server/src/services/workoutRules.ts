export const SUPPORTED_EXERCISES = [
  "pushup",
  "goblet-squat",
  "brisk-walk",
  "plank",
  "hip-openers",
  "split-squat",
  "bicep-curl",
] as const;

export type SupportedExercise = (typeof SUPPORTED_EXERCISES)[number];

export interface UnverifiedWorkoutSubmission {
  clerkUserId: string;
  sessionId: string;
  exerciseId: SupportedExercise;
  quantity: number;
  durationSec: number;
  startedAt: Date;
}

export interface WorkoutReportSubmission extends Omit<UnverifiedWorkoutSubmission, "clerkUserId"> {}

export interface WorkoutDoc extends UnverifiedWorkoutSubmission {
  status: "unverified";
  source: "client_reported";
  xp: 0;
  strength: 0;
  coins: 0;
  createdAt: Date;
}

export function makeUnverifiedWorkout(
  submission: UnverifiedWorkoutSubmission,
  now = new Date(),
): WorkoutDoc {
  return {
    ...submission,
    status: "unverified",
    source: "client_reported",
    xp: 0,
    strength: 0,
    coins: 0,
    createdAt: now,
  };
}

export function submissionsMatch(
  existing: WorkoutDoc,
  submission: UnverifiedWorkoutSubmission,
): boolean {
  return (
    existing.clerkUserId === submission.clerkUserId &&
    existing.sessionId === submission.sessionId &&
    existing.exerciseId === submission.exerciseId &&
    existing.quantity === submission.quantity &&
    existing.durationSec === submission.durationSec &&
    existing.startedAt.getTime() === submission.startedAt.getTime()
  );
}
