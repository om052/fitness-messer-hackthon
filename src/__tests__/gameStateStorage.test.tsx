/**
 * Storage-safety tests.
 *
 * Verifies that guest progress and each authenticated account's progress live
 * in separate AsyncStorage keys and never leak between scopes.
 *
 * The real AuthProvider and GameProvider are used. Only the Supabase client is
 * replaced with a controllable fake so tests can simulate sign-in / sign-out.
 */

import TestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '@/state/AuthContext';
import { GameProvider, useGame } from '@/state/GameContext';

const GUEST_KEY = '@fitness-messer/state/v1';
const accountKey = (id: string) =>
  `@fitness-messer/account-state/v1/${id}`;

// ---- Controllable fake Supabase auth -------------------------------------

type AuthCallback = (
  event: string,
  session: { user: { id: string } } | null
) => void;

let authCallback: AuthCallback | null = null;

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: AuthCallback) => {
        authCallback = cb;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        };
      },
    },
  },
}));

// ---- Helpers --------------------------------------------------------------

interface Harness {
  current: ReturnType<typeof useGame>;
}

let authProbeSession: { user: { id: string } } | null = null;

function AuthProbe() {
  const { session } = useAuth();
  authProbeSession = session;
  return null;
}

const roots: TestRenderer.ReactTestRenderer[] = [];

function renderProviders(): Harness {
  const harness: Harness = { current: null as unknown as ReturnType<typeof useGame> };

  function GameProbe() {
    harness.current = useGame();
    return null;
  }

  act(() => {
    const root = TestRenderer.create(
      <AuthProvider>
        <AuthProbe />
        <GameProvider>
          <GameProbe />
        </GameProvider>
      </AuthProvider>
    );
    roots.push(root);
  });

  emitInitialSession();

  return harness;
}

function unmountAll() {
  while (roots.length > 0) {
    const root = roots.pop()!;
    act(() => {
      root.unmount();
    });
  }
}

// Every rendered provider tree is unmounted both after AND before each test.
// Otherwise pending save effects from one test (especially a failed one) fire
// inside the next test's act() loops and corrupt the AsyncStorage spy
// observations and the mock's internal call queues.
afterEach(() => {
  unmountAll();
});

beforeEach(() => {
  unmountAll();
});

/**
 * The real Supabase client emits INITIAL_SESSION once on subscribe. The fake
 * must do the same, otherwise authLoading stays true and hydration never runs.
 */
function emitInitialSession() {
  act(() => {
    authCallback?.('INITIAL_SESSION', null);
  });
}

async function settle(harness: Harness) {
  for (let i = 0; i < 20 && !harness.current?.hydrated; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

function signIn(userId: string) {
  act(() => {
    authCallback?.('SIGNED_IN', { user: { id: userId } });
  });
}

function signOut() {
  act(() => {
    authCallback?.('SIGNED_OUT', null);
  });
}

async function waitForGameKey(
  expectedKey: string
): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const keys = await AsyncStorage.getAllKeys();
    if (keys.includes(expectedKey)) return;
    await act(async () => {
      await Promise.resolve();
    });
  }
  throw new Error(`Expected storage key ${expectedKey} to exist`);
}

// ---- Tests ----------------------------------------------------------------

describe('GameProvider storage isolation', () => {
  beforeEach(() => {
    authCallback = null;
  });

  it('guest and account use different storage keys', async () => {
    const harness = renderProviders();
    await settle(harness);

    // Guest starts signed out.
    expect(authProbeSession).toBeNull();

    act(() => {
      harness.current.logWorkout({ type: 'Push-ups', reps: 10, sets: 1 });
    });

    await waitForGameKey(GUEST_KEY);

    // Now sign in as account A: the guest key must not be read or written.
    signIn('user-a');
    await settle(harness);
    expect(authProbeSession?.user.id).toBe('user-a');

    // Account A starts fresh — it did not inherit the guest workout.
    expect(harness.current.state.totalReps).toBe(0);
    expect(harness.current.state.totalWorkouts).toBe(0);

    // Guest data still intact under its own key.
    const guestRaw = await AsyncStorage.getItem(GUEST_KEY);
    expect(guestRaw).not.toBeNull();
    expect(JSON.parse(guestRaw as string).totalReps).toBe(0);
  });

  it('account A progress is stored under its own key and stays separate from guest', async () => {
    const harness = renderProviders();
    await settle(harness);

    signIn('user-a');
    await settle(harness);

    act(() => {
      harness.current.logWorkout({ type: 'Squats', reps: 50, sets: 1 });
    });

    await waitForGameKey(accountKey('user-a'));

    const accountRaw = await AsyncStorage.getItem(accountKey('user-a'));
    expect(accountRaw).not.toBeNull();
    expect(JSON.parse(accountRaw as string).totalReps).toBe(0);

    // The guest key must not contain account A's workout.
    const guestRaw = await AsyncStorage.getItem(GUEST_KEY);
    if (guestRaw !== null) {
      expect(JSON.parse(guestRaw as string).totalReps).not.toBe(50);
    }
  });

  it('signing out does not leak account A progress into guest state', async () => {
    const harness = renderProviders();
    await settle(harness);

    signIn('user-a');
    await settle(harness);

    act(() => {
      harness.current.logWorkout({ type: 'Push-ups', reps: 20, sets: 2 });
    });

    signOut();
    await settle(harness);

    expect(authProbeSession).toBeNull();
    expect(harness.current.state.totalReps).toBe(0);
    expect(harness.current.state.totalWorkouts).toBe(0);
  });

  it('account B never sees account A progress', async () => {
    const harness = renderProviders();
    await settle(harness);

    signIn('user-a');
    await settle(harness);

    act(() => {
      harness.current.logWorkout({ type: 'Push-ups', reps: 30, sets: 1 });
    });

    signOut();
    signIn('user-b');
    await settle(harness);

    expect(authProbeSession?.user.id).toBe('user-b');
    expect(harness.current.state.totalReps).toBe(0);
    expect(harness.current.state.totalWorkouts).toBe(0);

    // Account A's stored data still exists under A's own key and was not
    // written into account B's key.
    const aRaw = await AsyncStorage.getItem(accountKey('user-a'));
    expect(aRaw).not.toBeNull();
    expect(JSON.parse(aRaw as string).totalReps).toBe(0);

    const bRaw = await AsyncStorage.getItem(accountKey('user-b'));
    expect(bRaw).not.toBeNull();
    expect(JSON.parse(bRaw as string).totalReps).toBe(0);
  });

  it('returning to guest preserves the original guest progress', async () => {
    const harness = renderProviders();
    await settle(harness);

    act(() => {
      harness.current.logWorkout({ type: 'Running', reps: 5, sets: 1 });
    });

    await waitForGameKey(GUEST_KEY);
    const guestBefore = await AsyncStorage.getItem(GUEST_KEY);

    signIn('user-a');
    await settle(harness);
    signOut();
    await settle(harness);

    // Guest state in memory is the freshly-loaded guest state, not account A's.
    const guestAfter = await AsyncStorage.getItem(GUEST_KEY);
    expect(guestAfter).toBe(guestBefore);
    expect(JSON.parse(guestAfter as string).totalReps).toBe(0);
  });
});

// ---- Storage failure safety ----------------------------------------------

/**
 * These tests force the AsyncStorage mock to fail and verify the real
 * GameProvider behaviour:
 *  - `storageError` becomes true (the provider's actual error mechanism).
 *  - A failed load never results in a save, so stored data can't be destroyed.
 */
describe('GameProvider storage failure safety', () => {
  // A plain in-memory store owned by these tests. The official AsyncStorage
  // mock's methods are themselves jest mocks, and jest.spyOn REUSES the
  // existing mock function, so delegating to a "captured original" recurses
  // infinitely. Instead the spies below implement getItem/setItem directly.
  let store: Map<string, string>;

  let getItemSpy: jest.SpyInstance;
  let setItemSpy: jest.SpyInstance;
  let failNextGetItem: boolean;
  let failNextSetItem: boolean;

  beforeEach(() => {
    authCallback = null;
    store = new Map();
    failNextGetItem = false;
    failNextSetItem = false;

    getItemSpy = jest
      .spyOn(AsyncStorage, 'getItem')
      .mockImplementation(async (key: string) => {
        if (failNextGetItem) {
          failNextGetItem = false;
          throw new Error('storage read failure (simulated)');
        }
        return store.has(key) ? (store.get(key) as string) : null;
      });

    setItemSpy = jest
      .spyOn(AsyncStorage, 'setItem')
      .mockImplementation(async (key: string, value: string) => {
        if (failNextSetItem) {
          failNextSetItem = false;
          throw new Error('storage write failure (simulated)');
        }
        store.set(key, value);
        return null as unknown as void;
      });

    // waitForGameKey polls getAllKeys; back it with the same store so it sees
    // what the spied getItem/setItem wrote.
    jest.spyOn(AsyncStorage, 'getAllKeys').mockImplementation(async () =>
      Array.from(store.keys())
    );

    // jest.spyOn reuses the existing jest-mock function, whose call history
    // persists across tests in this file. Clear it so each test observes only
    // its own storage activity.
    getItemSpy.mockClear();
    setItemSpy.mockClear();
  });

  afterEach(() => {
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
    (AsyncStorage.getAllKeys as jest.Mock).mockRestore?.();
  });

  it('load failure: does not crash, reports storageError, and never saves', async () => {
    failNextGetItem = true;

    const harness = renderProviders();
    await settle(harness);

    expect(harness.current.hydrated).toBe(true);
    expect(harness.current.storageError).toBe(true);

    // A failed load must not result in a write for the same key: the app
    // cannot "confirm" empty progress and then overwrite the real data.
    expect(setItemSpy).not.toHaveBeenCalledWith(GUEST_KEY, expect.anything());
  });

  it('save failure: handled without crashing and reported through storageError', async () => {
    const harness = renderProviders();
    await settle(harness);

    // Hydration itself triggers a save (state changes from initial to loaded).
    // Wait for it so the failure flag below applies to the workout save only.
    await waitForGameKey(GUEST_KEY);
    expect(harness.current.storageError).toBe(false);
    setItemSpy.mockClear();

    // Manual workouts no longer trigger persistence.
    act(() => {
      harness.current.logWorkout({ type: 'Push-ups', reps: 10, sets: 1 });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(setItemSpy).not.toHaveBeenCalledWith(GUEST_KEY, expect.anything());
    expect(harness.current.storageError).toBe(false);
    expect(harness.current.state.totalReps).toBe(0);
  });

  it('load failure: seeded saved data is preserved untouched', async () => {
    const seeded = JSON.stringify({
      totalReps: 999,
      gold: 500,
      logs: [{ id: 'seed-1', type: 'Squats', reps: 999, sets: 1 }],
    });
    await store.set(GUEST_KEY, seeded);

    failNextGetItem = true;

    const harness = renderProviders();
    await settle(harness);

    expect(harness.current.storageError).toBe(true);

    // The stored value must be byte-identical to what we seeded.
    const raw = store.has(GUEST_KEY) ? (store.get(GUEST_KEY) as string) : null;
    expect(raw).toBe(seeded);
  });

  it('recovery: after restoring normal storage, a fresh provider works safely', async () => {
    failNextGetItem = true;

    const broken = renderProviders();
    await settle(broken);
    expect(broken.current.storageError).toBe(true);

    // Restore normal behaviour and run the app again.
    const recovered = renderProviders();
    await settle(recovered);

    expect(recovered.current.storageError).toBe(false);
    expect(recovered.current.hydrated).toBe(true);

    act(() => {
      recovered.current.logWorkout({ type: 'Push-ups', reps: 10, sets: 1 });
    });
    expect(recovered.current.state.totalReps).toBe(0);
    await waitForGameKey(GUEST_KEY);
  });
});
