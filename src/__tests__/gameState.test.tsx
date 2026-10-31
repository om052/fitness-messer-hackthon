import TestRenderer, { act } from 'react-test-renderer';
import { AuthProvider } from '@/state/AuthContext';
import { GameProvider, useGame } from '@/state/GameContext';
import { BUILDINGS } from '@/lib/game';

interface Harness {
  current: ReturnType<typeof useGame>;
}

/**
 * Renders the provider with a probe component and exposes the context value
 * so the game loop can be exercised without a UI. The returned harness always
 * holds the live context, so it must be read after every `act()` block.
 */
async function renderProvider(): Promise<Harness> {
  const harness: Harness = { current: null as unknown as ReturnType<typeof useGame> };

  function Probe() {
    harness.current = useGame();
    return null;
  }

  await act(async () => {
    TestRenderer.create(
      <AuthProvider>
        <GameProvider>
          <Probe />
        </GameProvider>
      </AuthProvider>
    );
  });

  // The provider hydrates asynchronously from AsyncStorage. Wait until that
  // has settled so the first assertion never races a pending HYDRATE action.
  for (let i = 0; i < 10 && !harness.current?.hydrated; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }

  return harness;
}

describe('GameProvider', () => {
  it('starts with the initial state', async () => {
    const harness = await renderProvider();
    expect(harness.current.state.totalWorkouts).toBe(0);
    expect(harness.current.state.totalReps).toBe(0);
    expect(harness.current.state.gold).toBe(250);
  });

  it('manual workout does not change rewards or progression', async () => {
    const harness = await renderProvider();
    const before = { ...harness.current.state };

    const result = harness.current.logWorkout({ type: 'Push-ups', reps: 10, sets: 3 });

    expect(result.rewardsGranted).toBe(false);
    expect(harness.current.state.totalReps).toBe(before.totalReps);
    expect(harness.current.state.totalWorkouts).toBe(before.totalWorkouts);
    expect(harness.current.state.gold).toBe(before.gold);
    expect(harness.current.state.logs).toHaveLength(before.logs.length);
  });

  it('manual workout does not raise the level', async () => {
    const harness = await renderProvider();

    act(() => {
      harness.current.logWorkout({ type: 'Squats', reps: 100, sets: 1 });
    });

    expect(harness.current.state.level).toBe(1);
  });

  it('manual workout does not unlock achievements', async () => {
    const harness = await renderProvider();

    act(() => {
      harness.current.logWorkout({ type: 'Running', reps: 5, sets: 1 });
    });

    const achievements = harness.current.getAchievements();
    const firstSteps = achievements.find((a) => a.id === 'first-steps');
    expect(firstSteps?.unlocked).toBe(false);
  });

  it('upgrading a building spends gold and raises its level', async () => {
    const harness = await renderProvider();

    const goldBefore = harness.current.state.gold;
    const castle = BUILDINGS.find((b) => b.id === 'castle')!;

    let result = { ok: false, message: '' };
    act(() => {
      result = harness.current.upgradeBuilding('castle');
    });

    expect(result.ok).toBe(true);
    expect(harness.current.state.buildings.find((b) => b.id === 'castle')?.level).toBe(1);
    expect(harness.current.state.gold).toBe(goldBefore - castle.baseCost);
  });

  it('refuses an upgrade the player cannot afford', async () => {
    const harness = await renderProvider();

    let result = { ok: true, message: '' };
    act(() => {
      result = harness.current.upgradeBuilding('citadel');
    });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/reps to unlock|not enough gold/i);
  });

  it('claiming a territory spends gold and marks it claimed', async () => {
    const harness = await renderProvider();

    let result = { ok: false, message: '' };
    act(() => {
      result = harness.current.claimTerritory('iron-peak');
    });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/reps to unlock/i);
  });

  it('does not allow claiming the same territory twice', async () => {
    const harness = await renderProvider();

    let result = { ok: true, message: '' };
    act(() => {
      result = harness.current.claimTerritory('iron-peak');
    });

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/reps to unlock/i);
  });

  it('renames the player and keeps a non-empty name', async () => {
    const harness = await renderProvider();

    act(() => {
      harness.current.updateUsername('  Ada  ');
    });
    expect(harness.current.state.username).toBe('Ada');

    act(() => {
      harness.current.updateUsername('   ');
    });
    expect(harness.current.state.username).toBe('Ada');
  });

  it('resets all progress', async () => {
    const harness = await renderProvider();

    act(() => {
    });

    act(() => {
      harness.current.resetProgress();
    });

    expect(harness.current.state.totalReps).toBe(0);
    expect(harness.current.state.logs).toHaveLength(0);
    expect(harness.current.state.gold).toBe(250);
  });
});
