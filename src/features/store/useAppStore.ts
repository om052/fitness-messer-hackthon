import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import type { AppState, AppStore } from "./StoreContext";
import type { Kingdom, PlayerProfile, AppNotification } from "../../types";
import { MOCK_KINGDOMS } from "../../data/mockKingdoms";
import {
  MOCK_ACTIVITY,
  MOCK_ANNOUNCEMENTS,
  MOCK_CHALLENGES,
} from "../../data/mockSabha";
import { fetchMe } from "../../services/authService";
import { apiFetch } from "../../services/apiClient";
import { uid } from "../../utils/id";

const STORAGE_KEY = "fitness-messer-v1";

function freshNotifications(): AppNotification[] {
  return [];
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as AppState;
      return {
        ...saved,
        sessionUserId: null,
        users: {},
        profile: null,
        transactions: [],
        workouts: [],
      };
    }
  } catch {
    /* corrupted storage - fall through to fresh state */
  }
  return {
    sessionUserId: null,
    users: {},
    profile: null,
    transactions: [],
    workouts: [],
    kingdoms: Object.fromEntries(MOCK_KINGDOMS.map((k) => [k.id, k])),
    activities: MOCK_ACTIVITY,
    announcements: MOCK_ANNOUNCEMENTS,
    challenges: MOCK_CHALLENGES,
    joinRequests: [],
    notifications: freshNotifications(),
    onboarding: {
      locationStatus: "unset",
      nearbyKingdomIds: [],
      pathChosen: null,
      chosenKingdomId: null,
    },
  };
}

export function useAppStore(): { store: AppStore; state: AppState } {
  const [state, setState] = useState<AppState>(loadState);
  const { getToken, isSignedIn, userId } = useAuth();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable - demo continues in memory */
    }
  }, [state]);

  // Sync Clerk session to app state and ensure backend profile exists
  useEffect(() => {
    let active = true;
    (async () => {
      if (!isSignedIn || !userId) {
        if (active) {
          setState((s) => ({ ...s, sessionUserId: null, profile: null }));
        }
        return;
      }
      try {
        const token = await getToken();
        const me = await fetchMe(token);
        if (!active) return;
        const profileFromServer = me?.profile;
        setState((s) => {
          const user = {
            id: userId,
            fullName: profileFromServer?.displayName || "Warrior",
            email: (me as any)?.email || "",
            passwordHash: "",
            createdAt: profileFromServer?.createdAt || new Date().toISOString(),
          };
          const existing = s.profile && s.profile.userId === userId ? s.profile : null;
          const profile: PlayerProfile = {
            userId,
            fullName: profileFromServer?.displayName || "Warrior",
            email: user.email,
            avatarSeed: profileFromServer?.avatarSeed || existing?.avatarSeed || "w1",
            joinedAt: user.createdAt,
            xp: Number(profileFromServer?.xp) || 0,
            strength: Number(profileFromServer?.strength) || 0,
            coins: Number(profileFromServer?.coins) || 0,
            kingdomId: me?.kingdomId ?? null,
            role: me?.role ?? null,
            mode: me?.kingdomId ? "kingdom" : "independent",
            onboarded: profileFromServer?.onboarded === true,
            exerciseHistory: {},
            achievements: [],
            weeklyConsistency: [],
            contributions: [],
          };
          return {
            ...s,
            sessionUserId: userId,
            users: { ...s.users, [userId]: user },
            profile,
          };
        });
      } catch (e) {
        if (active) {
          setState((s) => ({
            ...s,
            sessionUserId: userId,
            profile: null,
          }));
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [isSignedIn, userId, getToken]);

  const notify = useCallback(
    (title: string, body: string, tone: AppNotification["tone"] = "info") => {
      setState((s) => ({
        ...s,
        notifications: [
          {
            id: uid("ntf"),
            title,
            body,
            timestamp: new Date().toISOString(),
            read: false,
            tone,
          },
          ...s.notifications,
        ].slice(0, 40),
      }));
    },
    [],
  );

  const store = useMemo<AppStore>(() => {
    const mutateProfile = (fn: (p: PlayerProfile) => PlayerProfile) =>
      setState((s) => (s.profile ? { ...s, profile: fn(s.profile) } : s));

    return {
      state,

      register: async (fullName, email, password) => {
        // Clerk handles registration via /register route; return ok for compatibility
        return { ok: true };
      },

      login: async (email, password) => {
        // Clerk handles login via /login route; return ok for compatibility
        return { ok: true, firstTime: false };
      },

      logout: () =>
        setState((s) => ({
          ...s,
          sessionUserId: null,
          profile: s.profile ? { ...s.profile } : null,
        })),

      updateProfile: (patch) => mutateProfile((p) => ({ ...p, ...patch })),

      resetDemo: () => {
        localStorage.removeItem(STORAGE_KEY);
        setState(loadState());
      },

      setLocationStatus: (status, kingdomIds) =>
        setState((s) => ({
          ...s,
          onboarding: {
            ...s.onboarding,
            locationStatus: status,
            nearbyKingdomIds: kingdomIds ?? s.onboarding.nearbyKingdomIds,
          },
        })),

      choosePath: (path) =>
        setState((s) => ({
          ...s,
          onboarding: {
            ...s.onboarding,
            pathChosen: path,
            chosenKingdomId:
              path === "independent" ? null : s.onboarding.chosenKingdomId,
          },
        })),

      joinKingdom: (kingdomId) =>
        setState((s) => {
          if (!s.profile) return s;
          const k = s.kingdoms[kingdomId];
          if (!k) return s;
          const p = {
            ...s.profile,
            kingdomId,
            role: "Member" as const,
            mode: "kingdom" as const,
          };
          return {
            ...s,
            profile: p,
            onboarding: {
              ...s.onboarding,
              chosenKingdomId: kingdomId,
              pathChosen: "kingdom",
            },
            activities: [
              {
                id: uid("act"),
                kingdomId,
                actorName: p.fullName,
                action: "joined the kingdom",
                outcome: "Welcome, new warrior!",
                timestamp: new Date().toISOString(),
                category: "membership" as const,
              },
              ...s.activities,
            ],
          };
        }),

      leaveKingdom: () =>
        setState((s) => {
          if (!s.profile) return s;
          const kingdomId = s.profile.kingdomId;
          const p = {
            ...s.profile,
            kingdomId: null,
            role: null,
            mode: "independent" as const,
          };
          return {
            ...s,
            profile: p,
            onboarding: {
              ...s.onboarding,
              chosenKingdomId: null,
              pathChosen: "independent",
            },
            activities: kingdomId
              ? [
                  {
                    id: uid("act"),
                    kingdomId,
                    actorName: p.fullName,
                    action: "left the kingdom",
                    outcome: "Returned to independent training",
                    timestamp: new Date().toISOString(),
                    category: "membership" as const,
                  },
                  ...s.activities,
                ]
              : s.activities,
          };
        }),

      finishOnboarding: async () => {
        const token = await getToken();
        if (!token) throw new Error("Your sign-in session is unavailable. Please sign in again.");
        await apiFetch("/auth/onboarding/complete", token, { method: "POST" });
        mutateProfile((p) => ({ ...p, onboarded: true }));
      },

      submitJoinRequest: (kingdomId) =>
        setState((s) => {
          if (!s.profile || s.profile.kingdomId === kingdomId) return s;
          if (
            s.joinRequests.some(
              (r) =>
                r.userId === s.profile!.userId &&
                r.kingdomId === kingdomId &&
                r.status === "pending",
            )
          )
            return s;
          return {
            ...s,
            joinRequests: [
              {
                id: uid("jr"),
                userId: s.profile.userId,
                userName: s.profile.fullName,
                kingdomId,
                status: "pending",
                timestamp: new Date().toISOString(),
              },
              ...s.joinRequests,
            ],
          };
        }),

      createAnnouncement: (kingdomId, title, body) =>
        setState((s) => {
          if (
            !s.profile ||
            s.profile.kingdomId !== kingdomId ||
            !s.profile.role ||
            s.profile.role === "Member"
          )
            return s;
          return {
            ...s,
            announcements: [
              {
                id: uid("ann"),
                kingdomId,
                authorName: s.profile.fullName,
                authorRole: s.profile.role,
                title,
                body,
                timestamp: new Date().toISOString(),
              },
              ...s.announcements,
            ],
          };
        }),

      resolveChallenge: (challengeId, outcome) =>
        setState((s) => ({
          ...s,
          challenges: s.challenges.map((c) =>
            c.id === challengeId
              ? { ...c, status: "resolved", result: outcome }
              : c,
          ),
          activities: [
            {
              id: uid("act"),
              kingdomId:
                s.challenges.find((c) => c.id === challengeId)?.kingdomId ?? "",
              actorName: "Sabha",
              action: "leadership challenge resolved",
              outcome,
              timestamp: new Date().toISOString(),
              category: "challenge" as const,
            },
            ...s.activities,
          ],
        })),

      markNotificationsRead: () =>
        setState((s) => ({
          ...s,
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

      notify,
    };
  }, [state, notify, getToken, userId, isSignedIn]);

  return { store, state };
}

export function leaderboardOf(
  kingdoms: Record<string, Kingdom>,
  profile: PlayerProfile | null,
) {
  const all = Object.values(kingdoms).flatMap((k) =>
    k.members.map((m) => ({
      name: m.name,
      strength: m.strength,
      kingdom: k.name,
      role: m.role,
    })),
  );
  if (profile) {
    all.push({
      name: `${profile.fullName} (you)`,
      strength: profile.strength,
      kingdom: profile.kingdomId
        ? (kingdoms[profile.kingdomId]?.name ?? "�")
        : "Independent",
      role: profile.role ?? "Member",
    });
  }
  return all.sort((a, b) => b.strength - a.strength);
}
