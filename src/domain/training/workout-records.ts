import type { LoadUnit, WorkoutSetLog } from './training';

export interface ExerciseRecords {
  loadUnit?: Extract<LoadUnit, 'kg' | 'lb'>;
  maximumLoad?: number;
  maximumReps?: number;
  bestRepsAtLoad?: { load: number; reps: number };
  maximumSetVolume?: number;
}

export interface RecordFlags {
  maximumLoad: boolean;
  repetitionsAtLoad: boolean;
  setVolume: boolean;
}

function comparable(log: WorkoutSetLog, unit?: LoadUnit) {
  return log.completed && log.actualLoad !== undefined && log.actualReps !== undefined
    && (log.loadUnit === 'kg' || log.loadUnit === 'lb') && (!unit || log.loadUnit === unit);
}

/** Real, directly observed records. Units are never converted or mixed. */
export function calculateExerciseRecords(logs: readonly WorkoutSetLog[], unit?: Extract<LoadUnit, 'kg' | 'lb'>): ExerciseRecords {
  const eligible = logs.filter((log) => comparable(log, unit));
  const resolvedUnit = unit ?? eligible[0]?.loadUnit as Extract<LoadUnit, 'kg' | 'lb'> | undefined;
  const sameUnit = resolvedUnit ? eligible.filter((log) => log.loadUnit === resolvedUnit) : [];
  if (!sameUnit.length) return {};
  const maximumLoad = Math.max(...sameUnit.map((log) => log.actualLoad ?? 0));
  const maximumReps = Math.max(...sameUnit.map((log) => log.actualReps ?? 0));
  const bestRepsLog = sameUnit.reduce((best, log) => (log.actualReps ?? 0) > (best.actualReps ?? 0) ? log : best);
  return {
    loadUnit: resolvedUnit,
    maximumLoad,
    maximumReps,
    bestRepsAtLoad: { load: bestRepsLog.actualLoad ?? 0, reps: bestRepsLog.actualReps ?? 0 },
    maximumSetVolume: Math.max(...sameUnit.map((log) => (log.actualLoad ?? 0) * (log.actualReps ?? 0))),
  };
}

export function detectNewRecords(log: WorkoutSetLog, history: readonly WorkoutSetLog[]): RecordFlags {
  if (!comparable(log)) return { maximumLoad: false, repetitionsAtLoad: false, setVolume: false };
  const prior = history.filter((item) => item.id !== log.id && comparable(item, log.loadUnit));
  const load = log.actualLoad ?? 0; const reps = log.actualReps ?? 0; const volume = load * reps;
  return {
    maximumLoad: !prior.length || prior.every((item) => (item.actualLoad ?? 0) < load),
    repetitionsAtLoad: !prior.some((item) => item.actualLoad === load) || prior.filter((item) => item.actualLoad === load).every((item) => (item.actualReps ?? 0) < reps),
    setVolume: !prior.length || prior.every((item) => (item.actualLoad ?? 0) * (item.actualReps ?? 0) < volume),
  };
}

export function formatSet(log: WorkoutSetLog): string {
  if (log.durationSeconds !== undefined) return `${log.durationSeconds}s`;
  const load = log.actualLoad === undefined ? '—' : log.actualLoad.toLocaleString('pt-BR');
  const unit = log.loadUnit === 'none' ? '' : ` ${log.loadUnit}`;
  return `${load}${unit} × ${log.actualReps ?? '—'}`;
}
