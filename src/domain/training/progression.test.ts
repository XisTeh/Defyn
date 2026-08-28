import { describe, expect, it } from 'vitest';
import { createUuid } from '../../shared/ids/create-uuid';
import { suggestDoubleProgression } from './progression';
import { calculateTrainingAdherence, type WorkoutExerciseSnapshot, type WorkoutSession, type WorkoutSetLog } from './training';

const exercise: WorkoutExerciseSnapshot = { prescriptionId: 'p1', exerciseId: 'supino', name: 'Supino reto', primaryMuscle: 'chest', equipment: ['barbell'], metric: 'reps', workingSets: 3, target: { metric: 'reps', minimum: 8, maximum: 12 }, loadUnit: 'kg', restSeconds: 90, loadIncrement: 2.5 };
function logs(reps: number[]): WorkoutSetLog[] { return reps.map((actualReps, setIndex) => ({ id: `l${setIndex}`, profileId: 'a', sessionId: 's', exerciseId: 'supino', exerciseNameSnapshot: 'Supino antigo', setIndex, setType: 'working', target: { metric: 'reps', minimum: 8, maximum: 12 }, actualLoad: 30, loadUnit: 'kg', actualReps, completed: true, completedAt: '2026-08-21T12:00:00.000Z', createdAt: '2026-08-21T12:00:00.000Z', updatedAt: '2026-08-21T12:00:00.000Z' })); }

describe('dupla progressão', () => {
  it('sugere aumento somente em 12/12/12', () => { expect(suggestDoubleProgression(exercise, logs([12,12,12]))).toMatchObject({ kind: 'increase', suggestedLoad: 32.5 }); });
  it('mantém em 12/11/10', () => { expect(suggestDoubleProgression(exercise, logs([12,11,10])).kind).toBe('maintain'); });
  it('não aumenta em 8/7/6', () => { expect(suggestDoubleProgression(exercise, logs([8,7,6])).kind).toBe('review'); });
  it('não avalia série incompleta', () => { expect(suggestDoubleProgression(exercise, logs([12,12])).kind).toBe('review'); });
});

describe('aderência de treino', () => {
  const session = (status: WorkoutSession['status']): WorkoutSession => ({ id: createUuid(), profileId: 'a', planId: 'p', planVersion: 1, templateId: 't', templateName: 'Treino A', localDate: '2026-08-21', status, startedAt: '2026-08-21T12:00:00.000Z', currentExerciseIndex: 0, exercises: [], skippedExerciseIds: [], createdAt: '2026-08-21T12:00:00.000Z', updatedAt: '2026-08-21T12:00:00.000Z' });
  it('calcula apenas sessões concluídas e limita o resultado a 100%', () => { expect(calculateTrainingAdherence([session('completed'), session('active'), session('completed')], 3)).toBe(67); expect(calculateTrainingAdherence([session('completed'), session('completed')], 1)).toBe(100); });
  it('retorna zero quando não existe meta planejada', () => { expect(calculateTrainingAdherence([session('completed')], 0)).toBe(0); });
});
