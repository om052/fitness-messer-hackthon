import {
  ACHIEVEMENTS,
  BUILDINGS,
  DAILY_CHALLENGE_TARGET,
  GOLD_PER_REP,
  TERRITORIES,
  buildingCost,
  createInitialState,
  levelForReps,
  levelProgress,
  repsNeededForNextLevel,
  toDateKey,
  workoutsOnDate,
} from '@/lib/game';

describe('levelForReps', () => {
  it('returns level 1 with no reps', () => {
    expect(levelForReps(0)).toBe(1);
  });

  it('advances a level at each threshold', () => {
    expect(levelForReps(99)).toBe(1);
    expect(levelForReps(100)).toBe(2);
    expect(levelForReps(250)).toBe(3);
    expect(levelForReps(500)).toBe(4);
  });

  it('never returns a level below 1', () => {
    expect(levelForReps(-50)).toBe(1);
  });
});

describe('levelProgress', () => {
  it('is 0 at the start of a level', () => {
    expect(levelProgress(0)).toBe(0);
  });

  it('resets to 0 when a new level is reached', () => {
    expect(levelProgress(100)).toBe(0);
  });

  it('is 100 just before the next threshold', () => {
    expect(levelProgress(249)).toBeCloseTo(100 - 100 / 150, 5);
  });

  it('stays within 0-100', () => {
    expect(levelProgress(37)).toBeGreaterThanOrEqual(0);
    expect(levelProgress(37)).toBeLessThanOrEqual(100);
  });
});

describe('repsNeededForNextLevel', () => {
  it('reports the remaining reps to the next level', () => {
    expect(repsNeededForNextLevel(0)).toBe(100);
    expect(repsNeededForNextLevel(40)).toBe(60);
  });
});

describe('buildingCost', () => {
  it('scales with the current level', () => {
    const castle = BUILDINGS.find((b) => b.id === 'castle')!;
    expect(buildingCost(castle, 0)).toBe(castle.baseCost);
    expect(buildingCost(castle, 1)).toBe(castle.baseCost * 2);
  });
});

describe('createInitialState', () => {
  it('starts with the starter territory already claimed', () => {
    const state = createInitialState();
    const starter = state.territories.find((t) => t.id === 'starter-valley');
    expect(starter?.claimed).toBe(true);
  });

  it('has one entry per building and territory definition', () => {
    const state = createInitialState();
    expect(state.buildings).toHaveLength(BUILDINGS.length);
    expect(state.territories).toHaveLength(TERRITORIES.length);
  });

  it('starts with no workouts and no unlocked achievements', () => {
    const state = createInitialState();
    expect(state.totalWorkouts).toBe(0);
    expect(state.totalReps).toBe(0);
    expect(state.unlockedAchievements).toHaveLength(0);
  });
});

describe('toDateKey', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('workoutsOnDate', () => {
  it('counts only logs that happened on the given date', () => {
    const state = createInitialState();
    const today = toDateKey();
    state.logs = [
      { id: '1', type: 'Squat', reps: 10, sets: 3, timestamp: '', date: today, goldEarned: 60 },
      { id: '2', type: 'Run', reps: 5, sets: 1, timestamp: '', date: '2020-01-01', goldEarned: 10 },
    ];
    expect(workoutsOnDate(state, today)).toBe(1);
    expect(workoutsOnDate(state, '2020-01-01')).toBe(1);
  });
});

describe('achievement definitions', () => {
  it('every achievement has a unique id', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('first steps unlocks after a single workout', () => {
    const state = createInitialState();
    state.totalWorkouts = 1;
    const first = ACHIEVEMENTS.find((a) => a.id === 'first-steps')!;
    expect(first.progress(state).current).toBeGreaterThanOrEqual(first.progress(state).goal);
  });
});

describe('game economy', () => {
  it('gold per rep is positive and the daily target is reachable', () => {
    expect(GOLD_PER_REP).toBeGreaterThan(0);
    expect(DAILY_CHALLENGE_TARGET).toBeGreaterThan(0);
  });
});
