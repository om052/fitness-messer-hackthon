
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/state/AuthContext';
import {
  ACHIEVEMENTS,
  BUILDINGS,
  DAILY_CHALLENGE_REWARD,
  DAILY_CHALLENGE_TARGET,
  MAX_LOGS,
  TERRITORIES,
  XP_PER_REP,
  type ExerciseLog,
  type GameState,
  buildingCost,
  createInitialState,
  levelForReps,
  toDateKey,
  workoutsOnDate,
} from '@/lib/game';

const GUEST_STORAGE_KEY = '@fitness-messer/state/v1';
const ACCOUNT_STORAGE_PREFIX = '@fitness-messer/account-state/v1/';

export interface LogWorkoutInput {
  type: string;
  reps: number;
  sets: number;
}

export interface LogWorkoutResult {
  log: ExerciseLog;
  challengeCompleted: boolean;
  newAchievements: string[];
  leveledUp: boolean;
  rewardsGranted: boolean;
  reason?: string;
}

interface GameContextValue {
  state: GameState;
  hydrated: boolean;
  storageError: boolean;
  logWorkout: (input: LogWorkoutInput) => LogWorkoutResult;
  upgradeBuilding: (buildingId: string) => { ok: boolean; message: string };
  claimTerritory: (territoryId: string) => { ok: boolean; message: string };
  updateUsername: (name: string) => void;
  updateSettings: (patch: Partial<GameState['settings']>) => void;
  resetProgress: () => void;
  getAchievements: () => {
    id: string;
    name: string;
    emoji: string;
    description: string;
    unlocked: boolean;
    current: number;
    goal: number;
  }[];
  getDailyChallenge: () => {
    current: number;
    target: number;
    completed: boolean;
  };
}

const GameContext = createContext<GameContextValue | null>(null);

type Action =
  | { type: 'HYDRATE'; payload: GameState }
  | {
      type: 'LOG_WORKOUT';
      payload: ExerciseLog;
      challengeCompleted: boolean;
      newAchievements: string[];
    }
  | { type: 'UPGRADE_BUILDING'; buildingId: string; cost: number }
  | { type: 'CLAIM_TERRITORY'; territoryId: string; cost: number }
  | { type: 'SET_USERNAME'; username: string }
  | { type: 'SET_SETTINGS'; patch: Partial<GameState['settings']> }
  | { type: 'RESET' };

function computeStreak(
  logs: ExerciseLog[],
  lastWorkoutDate: string | null
): number {
  if (!lastWorkoutDate) return 0;

  const dates = new Set(logs.map((log) => log.date));
  let streak = 0;
  const cursor = new Date();
  const last = new Date(`${lastWorkoutDate}T00:00:00`);

  const diffDays = Math.floor(
    (new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate()
    ).getTime() -
      new Date(
        last.getFullYear(),
        last.getMonth(),
        last.getDate()
      ).getTime()) /
      86400000
  );

  if (diffDays > 1) return 0;

  for (;;) {
    const key = toDateKey(cursor);
    if (!dates.has(key)) break;

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;

    case 'LOG_WORKOUT': {
      const logs = [action.payload, ...state.logs].slice(0, MAX_LOGS);
      const totalReps =
        state.totalReps + action.payload.reps * action.payload.sets;
      const level = levelForReps(totalReps);
      const streak = computeStreak(logs, action.payload.date);

      const next: GameState = {
        ...state,
        logs,
        totalReps,
        totalWorkouts: state.totalWorkouts + 1,
        gold: state.gold + action.payload.goldEarned,
        xp:
          state.xp +
          action.payload.reps * action.payload.sets * XP_PER_REP,
        level,
        streak,
        lastWorkoutDate: action.payload.date,
        unlockedAchievements: [
          ...state.unlockedAchievements,
          ...action.newAchievements,
        ],
      };

      if (action.challengeCompleted) {
        next.gold += DAILY_CHALLENGE_REWARD;
      }

      return next;
    }

    case 'UPGRADE_BUILDING': {
      const buildings = state.buildings.map((building) =>
        building.id === action.buildingId
          ? { ...building, level: building.level + 1 }
          : building
      );

      return { ...state, buildings, gold: state.gold - action.cost };
    }

    case 'CLAIM_TERRITORY': {
      const territories = state.territories.map((territory) =>
        territory.id === action.territoryId
          ? {
              ...territory,
              claimed: true,
              level: territory.level + 1,
            }
          : territory
      );

      return { ...state, territories, gold: state.gold - action.cost };
    }

    case 'SET_USERNAME':
      return {
        ...state,
        username: action.username.trim() || state.username,
      };

    case 'SET_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.patch },
      };

    case 'RESET':
      return createInitialState();

    default:
      return state;
  }
}

function migrate(stored: unknown): GameState {
  const base = createInitialState();

  if (!stored || typeof stored !== 'object') return base;

  const raw = stored as Partial<GameState>;

  return {
    ...base,
    ...raw,
    settings: { ...base.settings, ...(raw.settings ?? {}) },

    buildings: BUILDINGS.map((building) => ({
      id: building.id,
      level:
        raw.buildings?.find((item) => item.id === building.id)?.level ?? 0,
    })),

    territories: TERRITORIES.map((territory) => ({
      id: territory.id,
      claimed:
        raw.territories?.find((item) => item.id === territory.id)?.claimed ??
        territory.id === 'starter-valley',
      level:
        raw.territories?.find((item) => item.id === territory.id)?.level ??
        (territory.id === 'starter-valley' ? 1 : 0),
    })),

    logs: Array.isArray(raw.logs) ? raw.logs.slice(0, MAX_LOGS) : [],
  };
}

export function GameProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, authLoading } = useAuth();

  const storageKey = user
    ? `${ACCOUNT_STORAGE_PREFIX}${user.id}`
    : GUEST_STORAGE_KEY;

  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    createInitialState
  );

  const [hydrated, setHydrated] = React.useState(false);
  const [loadedStorageKey, setLoadedStorageKey] =
    React.useState<string | null>(null);
  const [storageError, setStorageError] = React.useState(false);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    setHydrated(false);
    setLoadedStorageKey(null);
    setStorageError(false);

    dispatch({
      type: 'HYDRATE',
      payload: createInitialState(),
    });

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);

        if (cancelled) return;

        const nextState = stored
          ? migrate(JSON.parse(stored))
          : createInitialState();

        dispatch({ type: 'HYDRATE', payload: nextState });
        setLoadedStorageKey(storageKey);
      } catch {
        // Never overwrite storage if reading or parsing failed.
        if (!cancelled) {
          setLoadedStorageKey(null);
          setStorageError(true);
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, storageKey]);

  useEffect(() => {
    if (
      !hydrated ||
      authLoading ||
      loadedStorageKey !== storageKey
    ) {
      return;
    }

    AsyncStorage.setItem(storageKey, JSON.stringify(state)).catch(() => {
      // Keep the in-memory game state if saving fails.
      // A later change can retry the save.
      setStorageError(true);
    });
  }, [
    state,
    hydrated,
    authLoading,
    loadedStorageKey,
    storageKey,
  ]);

  const logWorkout = useCallback(
    (input: LogWorkoutInput): LogWorkoutResult => {
      // Manual workouts cannot award official rewards. Verification is
      // server-side and not implemented in this slice.
      return {
        log: {
          id: '',
          type: input.type.trim(),
          reps: input.reps,
          sets: input.sets,
          timestamp: new Date().toISOString(),
          date: toDateKey(new Date()),
          goldEarned: 0,
        },
        challengeCompleted: false,
        newAchievements: [],
        leveledUp: false,
        rewardsGranted: false,
        reason: 'verification-required',
      } as LogWorkoutResult;
    },
    []
  );

  const upgradeBuilding = useCallback(
    (buildingId: string) => {
      const def = BUILDINGS.find((building) => building.id === buildingId);

      if (!def) {
        return { ok: false, message: 'Unknown building' };
      }

      const current = state.buildings.find(
        (building) => building.id === buildingId
      );

      if (!current) {
        return { ok: false, message: 'Unknown building' };
      }

      if (current.level >= def.maxLevel) {
        return {
          ok: false,
          message: `${def.name} is already at max level`,
        };
      }

      if (state.totalReps < def.unlockAt) {
        return {
          ok: false,
          message: `Requires ${def.unlockAt - state.totalReps} more reps to unlock`,
        };
      }

      const cost = buildingCost(def, current.level);

      if (state.gold < cost) {
        return {
          ok: false,
          message: `Not enough gold — need ${cost - state.gold} more`,
        };
      }

      dispatch({ type: 'UPGRADE_BUILDING', buildingId, cost });

      return {
        ok: true,
        message: `${def.name} upgraded to level ${current.level + 1}`,
      };
    },
    [state]
  );

  const claimTerritory = useCallback(
    (territoryId: string) => {
      const def = TERRITORIES.find(
        (territory) => territory.id === territoryId
      );

      if (!def) {
        return { ok: false, message: 'Unknown territory' };
      }

      const current = state.territories.find(
        (territory) => territory.id === territoryId
      );

      if (!current) {
        return { ok: false, message: 'Unknown territory' };
      }

      if (current.claimed) {
        return {
          ok: false,
          message: `${def.name} is already claimed`,
        };
      }

      if (state.totalReps < def.unlockAt) {
        return {
          ok: false,
          message: `Requires ${def.unlockAt - state.totalReps} more reps to unlock`,
        };
      }

      if (state.gold < def.cost) {
        return {
          ok: false,
          message: `Not enough gold — need ${def.cost - state.gold} more`,
        };
      }

      dispatch({
        type: 'CLAIM_TERRITORY',
        territoryId,
        cost: def.cost,
      });

      return { ok: true, message: `${def.name} claimed!` };
    },
    [state]
  );

  const updateUsername = useCallback((name: string) => {
    dispatch({ type: 'SET_USERNAME', username: name });
  }, []);

const updateSettings = useCallback(
  (patch: Partial<GameState['settings']>) => {
    dispatch({ type: 'SET_SETTINGS', patch });
  },
  []
);

  const resetProgress = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const getAchievements = useCallback(() => {
    return ACHIEVEMENTS.map((achievement) => {
      const { current, goal } = achievement.progress(state);

      return {
        id: achievement.id,
        name: achievement.name,
        emoji: achievement.emoji,
        description: achievement.description,
        unlocked: state.unlockedAchievements.includes(achievement.id),
        current,
        goal,
      };
    });
  }, [state]);

  const getDailyChallenge = useCallback(() => {
    const current = workoutsOnDate(state, toDateKey());

    return {
      current,
      target: DAILY_CHALLENGE_TARGET,
      completed: current >= DAILY_CHALLENGE_TARGET,
    };
  }, [state]);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      hydrated,
      storageError,
      logWorkout,
      upgradeBuilding,
      claimTerritory,
      updateUsername,
      updateSettings,
      resetProgress,
      getAchievements,
      getDailyChallenge,
    }),
    [
      state,
      hydrated,
      storageError,
      logWorkout,
      upgradeBuilding,
      claimTerritory,
      updateUsername,
      updateSettings,
      resetProgress,
      getAchievements,
      getDailyChallenge,
    ]
  );

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);

  if (!ctx) {
    throw new Error('useGame must be used inside <GameProvider>');
  }

  return ctx;
}
