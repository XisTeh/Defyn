import { describe, expect, it } from 'vitest';
import { calculateExerciseRecords, detectNewRecords } from './workout-records';
import type { WorkoutSetLog } from './training';

const log = (id: string, load: number, reps: number, unit: 'kg' | 'lb' = 'kg'): WorkoutSetLog => ({
  id, profileId: 'p', sessionId: id, exerciseId: 'supino', exerciseNameSnapshot: 'Supino', setIndex: 0,
  setType: 'working', target: { metric: 'reps', minimum: 8, maximum: 12 }, actualLoad: load, actualReps: reps,
  loadUnit: unit, completed: true, completedAt: '2026-08-23T10:00:00Z', createdAt: '2026-08-23T10:00:00Z', updatedAt: '2026-08-23T10:00:00Z',
});

describe('recordes observados de treino', () => {
  it('não mistura kg e lb nem estima 1RM', () => {
    expect(calculateExerciseRecords([log('a', 50, 10), log('b', 200, 5, 'lb')], 'kg')).toEqual({ loadUnit: 'kg', maximumLoad: 50, maximumReps: 10, bestRepsAtLoad: { load: 50, reps: 10 }, maximumSetVolume: 500 });
  });
  it('detecta carga, repetições naquela carga e volume separadamente', () => {
    const history = [log('a', 50, 10), log('b', 45, 12)];
    expect(detectNewRecords(log('c', 50, 11), history)).toEqual({ maximumLoad: false, repetitionsAtLoad: true, setVolume: true });
  });
  it('não declara recorde para série incompleta', () => expect(detectNewRecords({ ...log('c', 60, 8), completed: false }, [])).toEqual({ maximumLoad: false, repetitionsAtLoad: false, setVolume: false }));
});
