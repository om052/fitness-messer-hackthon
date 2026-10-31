import { createContext, useContext } from "react";
import type {
  PlayerProfile,
  FMTransaction,
  WorkoutSession,
  OnboardingState,
  Kingdom,
  KingdomActivity,
  KingdomAnnouncement,
  KingdomChallenge,
  JoinRequest,
  AppNotification,
} from "../../types";

export interface AppState {
  sessionUserId: string | null;
  users: Record<
    string,
    {
      id: string;
      fullName: string;
      email: string;
      passwordHash: string;
      createdAt: string;
    }
  >;
  profile: PlayerProfile | null;
  transactions: FMTransaction[];
  workouts: WorkoutSession[];
  kingdoms: Record<string, Kingdom>;
  activities: KingdomActivity[];
  announcements: KingdomAnnouncement[];
  challenges: KingdomChallenge[];
  joinRequests: JoinRequest[];
  notifications: AppNotification[];
  onboarding: OnboardingState;
}

export interface AppStore {
  state: AppState;
  // auth
  register(
    fullName: string,
    email: string,
    password: string,
  ): Promise<{ ok: boolean; error?: string }>;
  login(
    email: string,
    password: string,
  ): Promise<{ ok: boolean; error?: string; firstTime: boolean }>;
  logout(): void;
  // player
  updateProfile(
    patch: Partial<Pick<PlayerProfile, "fullName" | "avatarSeed">>,
  ): void;
  resetDemo(): void;
  // onboarding
  setLocationStatus(
    s: OnboardingState["locationStatus"],
    kingdomIds?: string[],
  ): void;
  choosePath(path: "independent" | "kingdom"): void;
  joinKingdom(kingdomId: string): void;
  leaveKingdom(): void;
  finishOnboarding(): Promise<void>;
  // kingdom
  submitJoinRequest(kingdomId: string): void;
  createAnnouncement(k: string, title: string, body: string): void;
  resolveChallenge(challengeId: string, outcome: string): void;
  markNotificationsRead(): void;
  notify(title: string, body: string, tone?: AppNotification["tone"]): void;
}

export const StoreContext = createContext<AppStore | null>(null);

export function useStore(): AppStore {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
