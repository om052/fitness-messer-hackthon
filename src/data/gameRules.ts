import type { ExerciseDefinition } from "../types";

/**
 * CENTRAL GAME RULES MODULE.
 * All reward values are configurable demo constants — NOT scientifically
 * validated fitness measurements. Verified-workout rules arrive with the backend.
 */

export const XP_THRESHOLDS: number[] = [
  0, 500, 1500, 3500, 7000, 12000, 20000, 35000,
];

export const MAX_LEVEL = XP_THRESHOLDS.length;

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export function levelProgress(xp: number): {
  current: number;
  needed: number;
  pct: number;
  level: number;
} {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) return { current: xp, needed: xp, pct: 100, level };
  const floorXp = XP_THRESHOLDS[level - 1];
  const nextXp = XP_THRESHOLDS[level];
  const pct = Math.min(
    100,
    Math.round(((xp - floorXp) / (nextXp - floorXp)) * 100),
  );
  return { current: xp - floorXp, needed: nextXp - floorXp, pct, level };
}

/** Progress units a workout contributes to a building of the matching category. */
export const BUILDING_PROGRESS_PER_UNIT = 1;
/** Coins burned per building progress point when the kingdom funds construction. */
export const CONSTRUCTION_COIN_COST_PER_POINT = 0.5;
/** FM Coin cost to hire one worker (King action). */
export const HIRE_WORKER_COST = 250;

export const RULES = {
  oneKingPerKingdom: true,
  kingCannotRejectSenapatiChallenge: true,
  leadershipChangeRequiresResolvedChallenge: true,
} as const;
