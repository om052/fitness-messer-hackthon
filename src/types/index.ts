export type RoyalRole = "King" | "Mantri" | "Senapati" | "Member" | null;

export interface User {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string; // demo hash only — never plaintext
  createdAt: string;
}

export interface PlayerProfile {
  userId: string;
  fullName: string;
  email: string;
  avatarSeed: string;
  joinedAt: string;
  xp: number;
  strength: number;
  coins: number;
  kingdomId: string | null;
  role: RoyalRole;
  mode: "independent" | "kingdom";
  onboarded: boolean;
  exerciseHistory: Record<string, number>; // exerciseId -> total reps/seconds
  achievements: string[];
  weeklyConsistency: number[]; // last 7 days, minutes
  contributions: KingdomContribution[];
}

export type WorkoutKind = "verified" | "unverified" | "demo";

export interface WorkoutSession {
  id: string;
  userId: string;
  exerciseId: string;
  quantity: number; // reps or seconds
  xp: number;
  strength: number;
  coins: number;
  kind: WorkoutKind;
  startedAt: string;
  endedAt: string;
  durationSec: number;
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  category: "strength" | "core" | "cardio" | "mobility";
  unit: "rep" | "second";
  xpPerUnit: number;
  strengthPerUnit: number;
  coinsPerUnit: number;
  targetMuscles: string[];
  instructions: string[];
  formTips: string[];
  buildingCategory: BuildingCategory;
}

export type TransactionType = "earn" | "spend";

export interface FMTransaction {
  id: string;
  userId: string;
  amount: number; // positive for earn, negative for spend
  type: TransactionType;
  category: "workout" | "construction" | "kingdom" | "reward" | "other";
  description: string;
  timestamp: string;
  balanceAfter: number;
  linkedWorkoutId?: string;
  linkedKingdomEvent?: string;
}

export type BuildingCategory =
  | "military"
  | "defense"
  | "infrastructure"
  | "civil"
  | "training";

export interface Building {
  id: string;
  kingdomId: string;
  type: string; // e.g. Palace, Barracks
  category: BuildingCategory;
  level: number;
  progress: number; // 0..progressRequired
  progressRequired: number;
  position: [number, number]; // map coords for 3D scene
  description: string;
}

export interface KingdomMember {
  userId: string;
  name: string;
  role: Exclude<RoyalRole, null>;
  strength: number;
  level: number;
  joinedAt: string;
}

export interface Kingdom {
  id: string;
  name: string;
  description: string;
  kingName: string;
  population: number;
  strength: number;
  treasury: number;
  territorySize: number;
  // illustrative demo map coordinates, NOT verified geography
  mapX: number;
  mapY: number;
  seed: number;
  buildings: Building[];
  members: KingdomMember[];
}

export interface Territory {
  id: string;
  kingdomId: string;
  name: string;
  polygon: [number, number][];
  claimed: boolean;
  ownerId: string | null;
}

export interface KingdomContribution {
  id: string;
  userId: string;
  userName: string;
  kingdomId: string;
  buildingId: string;
  buildingType: string;
  exerciseId: string;
  amount: number; // progress units contributed
  xp: number;
  coins: number;
  timestamp: string;
}

export interface KingdomActivity {
  id: string;
  kingdomId: string;
  actorName: string;
  action: string;
  outcome?: string;
  timestamp: string;
  category:
    | "workout"
    | "construction"
    | "membership"
    | "governance"
    | "challenge";
}

export interface KingdomChallenge {
  id: string;
  kingdomId: string;
  challengerId: string;
  challengerName: string;
  defenderId: string;
  defenderName: string;
  type: "leadership" | "training";
  exerciseId: string;
  timeLimitMin: number;
  status: "pending" | "active" | "resolved";
  result?: string;
  rules: string;
  createdAt: string;
}

export interface KingdomAnnouncement {
  id: string;
  kingdomId: string;
  authorName: string;
  authorRole: Exclude<RoyalRole, null>;
  title: string;
  body: string;
  timestamp: string;
}

export interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  kingdomId: string;
  status: "pending" | "accepted" | "rejected";
  timestamp: string;
}

export interface OnboardingState {
  locationStatus: "unset" | "granted" | "denied" | "unavailable" | "skipped";
  nearbyKingdomIds: string[];
  pathChosen: "independent" | "kingdom" | null;
  chosenKingdomId: string | null;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  tone: "info" | "success" | "warning";
}
