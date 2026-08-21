import type { ProgressionSuggestion, WorkoutExerciseSnapshot, WorkoutSetLog } from './training';

export function suggestDoubleProgression(exercise: WorkoutExerciseSnapshot, logs: readonly WorkoutSetLog[]): ProgressionSuggestion {
  const completed = logs.filter((log) => log.exerciseId === exercise.exerciseId && log.completed).sort((a, b) => a.setIndex - b.setIndex);
  if (completed.length < exercise.workingSets) return { exerciseId: exercise.exerciseId, kind: 'review', message: 'Complete as séries planejadas antes de avaliar progressão.' };
  const values = completed.map((log) => exercise.metric === 'seconds' ? log.durationSeconds : log.actualReps);
  if (values.some((value) => value === undefined)) return { exerciseId: exercise.exerciseId, kind: 'review', message: 'Registros incompletos não permitem sugerir progressão.' };
  const numeric = values as number[];
  const topReached = numeric.every((value) => value >= exercise.target.maximum);
  const belowRange = numeric.some((value) => value < exercise.target.minimum);
  const load = completed.find((log) => log.actualLoad !== undefined)?.actualLoad;
  if (topReached) return { exerciseId: exercise.exerciseId, kind: 'increase', message: 'Você atingiu o topo da faixa em todas as séries. Considere um pequeno aumento na próxima sessão.', suggestedLoad: load === undefined ? undefined : load + (exercise.loadIncrement ?? 2.5) };
  if (belowRange) return { exerciseId: exercise.exerciseId, kind: 'review', message: 'O desempenho ficou abaixo da faixa em parte da sessão. Mantenha ou ajuste a carga conforme necessário.' };
  return { exerciseId: exercise.exerciseId, kind: 'maintain', message: 'Mantenha a carga e tente consolidar o topo da faixa.' };
}
