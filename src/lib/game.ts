/**
 * Core game model for Fitness Messer.
 * Pure functions + constants shared by every screen.
 */

export interface ExerciseLog {
  id: string;
  type: string;
  reps: number;
  sets: number;
  /** ISO timestamp of when the workout was logged. */
  timestamp: string;
  /** YYYY-MM-DD local date, used for streaks and daily challenges. */
  date: string;
  goldEarned: number;
}

export interface BuildingState {
  id: string;
  level: number;
}

export interface TerritoryState {
  id: string;
  claimed: boolean;
  level: number;
}

export interface GameState {
  username: string;
  gold: number;
  xp: number;
  level: number;
  totalReps: number;
  totalWorkouts: number;
  streak: number;
  lastWorkoutDate: string | null;
  logs: ExerciseLog[];
  buildings: BuildingState[];
  territories: TerritoryState[];
  unlockedAchievements: string[];
  settings: {
    units: 'metric' | 'imperial';
    remindersEnabled: boolean;
    hapticsEnabled: boolean;
  };
}

export const GOLD_PER_REP = 2;
export const XP_PER_REP = 5;
export const DAILY_CHALLENGE_TARGET = 5;
export const DAILY_CHALLENGE_REWARD = 100;
export const MAX_LOGS = 50;

/** Total reps required to reach each level (index 0 => level 1). */
export const LEVEL_REP_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1800, 2500, 3500, 5000];

export interface BuildingDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Total reps required before the building can be purchased. */
  unlockAt: number;
  /** Gold cost of the next level. */
  baseCost: number;
  maxLevel: number;
}

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'castle',
    name: 'Castle',
    emoji: '🏰',
    description: 'The heart of your empire.',
    unlockAt: 0,
    baseCost: 100,
    maxLevel: 5,
  },
  {
    id: 'barracks',
    name: 'Barracks',
    emoji: '⚔️',
    description: 'Trains your soldiers to conquer new lands.',
    unlockAt: 100,
    baseCost: 150,
    maxLevel: 5,
  },
  {
    id: 'treasury',
    name: 'Treasury',
    emoji: '💰',
    description: 'Stores the wealth your workouts generate.',
    unlockAt: 250,
    baseCost: 200,
    maxLevel: 5,
  },
  {
    id: 'temple',
    name: 'Temple',
    emoji: '🏛️',
    description: 'Blessed ground that amplifies your power.',
    unlockAt: 400,
    baseCost: 300,
    maxLevel: 5,
  },
  {
    id: 'citadel',
    name: 'Citadel',
    emoji: '🛡️',
    description: 'The ultimate fortress. Only legends reach it.',
    unlockAt: 700,
    baseCost: 500,
    maxLevel: 3,
  },
];

export interface TerritoryDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Total reps required before the territory can be claimed. */
  unlockAt: number;
  /** Gold cost to claim. */
  cost: number;
  level: number;
}

export const TERRITORIES: TerritoryDef[] = [
  {
    id: 'starter-valley',
    name: 'Starter Valley',
    emoji: '🌄',
    description: 'Your first settlement. Built with your initial workouts.',
    unlockAt: 0,
    cost: 0,
    level: 1,
  },
  {
    id: 'iron-peak',
    name: 'Iron Peak',
    emoji: '⛰️',
    description: 'A mountainous region rich with resources.',
    unlockAt: 50,
    cost: 200,
    level: 2,
  },
  {
    id: 'crystal-forest',
    name: 'Crystal Forest',
    emoji: '🌲',
    description: 'Rumored to contain rare treasures.',
    unlockAt: 150,
    cost: 400,
    level: 3,
  },
  {
    id: 'dragons-lair',
    name: "Dragon's Lair",
    emoji: '🐉',
    description: 'A mysterious and dangerous place.',
    unlockAt: 300,
    cost: 750,
    level: 4,
  },
  {
    id: 'golden-shores',
    name: 'Golden Shores',
    emoji: '🏖️',
    description: 'A beautiful beach paradise awaits.',
    unlockAt: 500,
    cost: 1200,
    level: 5,
  },
  {
    id: 'ember-realm',
    name: 'Ember Realm',
    emoji: '🌋',
    description: 'Forged in the fires of your greatest efforts.',
    unlockAt: 800,
    cost: 2000,
    level: 6,
  },
];

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Progress toward the goal, used to render the locked state. */
  progress: (state: GameState) => { current: number; goal: number };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-steps',
    name: 'First Steps',
    emoji: '👣',
    description: 'Complete your first exercise',
    progress: (s) => ({ current: Math.min(s.totalWorkouts, 1), goal: 1 }),
  },
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    emoji: '🔥',
    description: 'Maintain a 7-day streak',
    progress: (s) => ({ current: Math.min(s.streak, 7), goal: 7 }),
  },
  {
    id: 'centurion',
    name: 'Centurion',
    emoji: '💯',
    description: 'Complete 100 reps',
    progress: (s) => ({ current: Math.min(s.totalReps, 100), goal: 100 }),
  },
  {
    id: 'iron-body',
    name: 'Iron Body',
    emoji: '💪',
    description: 'Complete 500 reps',
    progress: (s) => ({ current: Math.min(s.totalReps, 500), goal: 500 }),
  },
  {
    id: 'empire-builder',
    name: 'Empire Builder',
    emoji: '🏰',
    description: 'Upgrade 3 buildings',
    progress: (s) => ({
      current: Math.min(s.buildings.filter((b) => b.level > 0).length, 3),
      goal: 3,
    }),
  },
  {
    id: 'cartographer',
    name: 'Cartographer',
    emoji: '🗺️',
    description: 'Claim 3 territories',
    progress: (s) => ({
      current: Math.min(s.territories.filter((t) => t.claimed).length, 3),
      goal: 3,
    }),
  },
  {
    id: 'legendary',
    name: 'Legendary',
    emoji: '⚔️',
    description: 'Reach level 10',
    progress: (s) => ({ current: Math.min(s.level, 10), goal: 10 }),
  },
];

export function toDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function levelForReps(totalReps: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_REP_THRESHOLDS.length; i++) {
    if (totalReps >= LEVEL_REP_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export function repsNeededForNextLevel(totalReps: number): number {
  const level = levelForReps(totalReps);
  if (level >= LEVEL_REP_THRESHOLDS.length) return 0;
  return LEVEL_REP_THRESHOLDS[level] - totalReps;
}

export function levelProgress(totalReps: number): number {
  const level = levelForReps(totalReps);
  const currentFloor = LEVEL_REP_THRESHOLDS[level - 1] ?? 0;
  const nextFloor = LEVEL_REP_THRESHOLDS[level] ?? currentFloor + 1;
  if (nextFloor === currentFloor) return 100;
  return Math.min(100, ((totalReps - currentFloor) / (nextFloor - currentFloor)) * 100);
}

export function buildingCost(def: BuildingDef, currentLevel: number): number {
  return Math.round(def.baseCost * (currentLevel + 1));
}

export function workoutsOnDate(state: GameState, dateKey: string): number {
  return state.logs.filter((l) => l.date === dateKey).length;
}

export function isBuildingUnlocked(state: GameState, def: BuildingDef): boolean {
  return state.totalReps >= def.unlockAt;
}

export function isTerritoryUnlocked(state: GameState, def: TerritoryDef): boolean {
  return state.totalReps >= def.unlockAt;
}

export function createInitialState(): GameState {
  return {
    username: 'FitnessWarrior',
    gold: 250,
    xp: 0,
    level: 1,
    totalReps: 0,
    totalWorkouts: 0,
    streak: 0,
    lastWorkoutDate: null,
    logs: [],
    buildings: BUILDINGS.map((b) => ({ id: b.id, level: 0 })),
    territories: TERRITORIES.map((t) => ({
      id: t.id,
      claimed: t.id === 'starter-valley',
      level: t.id === 'starter-valley' ? 1 : 0,
    })),
    unlockedAchievements: [],
    settings: {
      units: 'metric',
      remindersEnabled: true,
      hapticsEnabled: true,
    },
  };
}

export interface ExerciseDefinition {
  id: string;
  displayName: string;
  measurementType: 'reps' | 'duration';
  analyzerStatus: 'not-implemented' | 'experimental' | 'validated';
  rewardStatus: 'disabled' | 'enabled';
}

export const EXERCISE_CATALOG: ExerciseDefinition[] = [
  { id: 'push_up', displayName: 'Push-up', measurementType: 'reps', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'goblet_squat', displayName: 'Goblet squat', measurementType: 'reps', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'brisk_walk', displayName: 'Brisk walk', measurementType: 'duration', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'plank_forearm_plank', displayName: 'Plank / forearm plank', measurementType: 'duration', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'hip_opener', displayName: 'Hip opener', measurementType: 'reps', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'split_squat', displayName: 'Split squat', measurementType: 'reps', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'biceps_curl', displayName: 'Biceps curl', measurementType: 'reps', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'jumping_jack', displayName: 'Jumping jack', measurementType: 'reps', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'dumbbell_row', displayName: 'Dumbbell row', measurementType: 'reps', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'overhead_press', displayName: 'Overhead press', measurementType: 'reps', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'romanian_deadlift', displayName: 'Romanian deadlift', measurementType: 'reps', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'glute_bridge', displayName: 'Glute bridge', measurementType: 'reps', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'bodyweight_squat', displayName: 'Bodyweight squat', measurementType: 'reps', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'wall_sit', displayName: 'Wall sit', measurementType: 'duration', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'mountain_climber', displayName: 'Mountain climber', measurementType: 'reps', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'high_knees', displayName: 'High knees', measurementType: 'reps', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'cat_cow', displayName: 'Cat-cow', measurementType: 'duration', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
  { id: 'arm_circles', displayName: 'Arm circles', measurementType: 'duration', analyzerStatus: 'not-implemented', rewardStatus: 'disabled' },
];

export function getExercise(id: string): ExerciseDefinition | undefined {
  return EXERCISE_CATALOG.find((e) => e.id === id);
}
