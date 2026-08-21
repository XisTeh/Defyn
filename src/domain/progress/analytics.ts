import type { DiaryEntry } from '../diary/diary';
import { totalDiaryNutrients } from '../diary/diary';
import { calculateHydrationTarget, type WaterEntry } from '../hydration/hydration';
import type { UserProfile } from '../profile/profile';
import type { NutritionTargetSnapshot } from '../targets/nutrition-target';
import type { WorkoutPlan, WorkoutSession, WorkoutSetLog } from '../training/training';
import { currentPlanVersion, sessionVolume } from '../training/training';
import type { ProgressPeriod, ProgressRecord } from './progress';

export interface WeightTrend { kind: 'up' | 'down' | 'stable' | 'insufficient'; changeKg?: number; currentAverageKg?: number; previousAverageKg?: number; message: string; }
export interface NutritionProgress { registeredDays: number; averageCalories?: number; averageCalorieTarget?: number; averageDifference?: number; proteinAverage?: number; proteinTargetAverage?: number; proteinDaysAtTarget: number; carbsAverage?: number; fatAverage?: number; }
export interface HydrationProgress { registeredDays: number; averageMl?: number; averageTargetMl?: number; daysAtTarget: number; }
export interface ExerciseProgress { exerciseId: string; name: string; bestLoad?: number; loadUnit?: 'kg' | 'lb'; bestReps?: number; bestVolume?: number; points: { localDate: string; load?: number; reps?: number; volume?: number }[]; }
export interface TrainingProgress { completedSessions: number; plannedSessions: number; adherence?: number; totalMinutes: number; averageMinutes?: number; completedSets: number; volumeKg: number; volumeLb: number; exerciseRecords: ExerciseProgress[]; weekly: { label: string; count: number }[]; }

const dayMs = 86_400_000;
function noon(date: string) { return new Date(`${date}T12:00:00`).getTime(); }
function inPeriod(date: string, period: ProgressPeriod) { return date <= period.endLocalDate && (!period.startLocalDate || date >= period.startLocalDate); }
function average(values: number[]): number | undefined { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined; }

export function calculateWeightTrend(records: readonly ProgressRecord[], endLocalDate: string): WeightTrend {
  const weighted = records.filter((item) => item.weightKg !== undefined && item.localDate <= endLocalDate).sort((a, b) => a.localDate.localeCompare(b.localDate));
  const end = noon(endLocalDate); const current = weighted.filter((item) => { const d = end - noon(item.localDate); return d >= 0 && d < 7 * dayMs; }).map((item) => item.weightKg as number); const previous = weighted.filter((item) => { const d = end - noon(item.localDate); return d >= 7 * dayMs && d < 14 * dayMs; }).map((item) => item.weightKg as number);
  if (current.length < 2 || previous.length < 2) return { kind: 'insufficient', message: 'Mais registros são necessários para calcular uma tendência de 7 dias.' };
  const currentAverageKg = average(current) as number; const previousAverageKg = average(previous) as number; const changeKg = currentAverageKg - previousAverageKg; const kind = Math.abs(changeKg) < 0.15 ? 'stable' : changeKg > 0 ? 'up' : 'down';
  return { kind, changeKg, currentAverageKg, previousAverageKg, message: kind === 'stable' ? 'A média dos últimos 7 dias ficou estável em relação aos 7 dias anteriores.' : `A média dos últimos 7 dias ficou ${kind === 'down' ? 'abaixo' : 'acima'} dos 7 dias anteriores.` };
}

function targetForDate(targets: readonly NutritionTargetSnapshot[], date: string) { const instant = `${date}T12:00:00.000Z`; return [...targets].reverse().find((target) => target.startsAt <= instant && (!target.endsAt || target.endsAt >= instant)); }

export function aggregateNutrition(entries: readonly DiaryEntry[], targets: readonly NutritionTargetSnapshot[], period: ProgressPeriod): NutritionProgress {
  const grouped = new Map<string, DiaryEntry[]>(); entries.filter((item) => inPeriod(item.date, period)).forEach((item) => grouped.set(item.date, [...(grouped.get(item.date) ?? []), item]));
  const days = [...grouped.entries()].map(([date, values]) => ({ nutrients: totalDiaryNutrients(values), target: targetForDate(targets, date)?.result })); const withTarget = days.filter((item) => item.target);
  return { registeredDays: days.length, averageCalories: average(days.map((d) => d.nutrients.caloriesKcal ?? 0)), averageCalorieTarget: average(withTarget.map((d) => d.target!.calorieTarget)), averageDifference: average(withTarget.map((d) => (d.nutrients.caloriesKcal ?? 0) - d.target!.calorieTarget)), proteinAverage: average(days.map((d) => d.nutrients.proteinGrams ?? 0)), proteinTargetAverage: average(withTarget.map((d) => d.target!.macros.protein.grams)), proteinDaysAtTarget: withTarget.filter((d) => (d.nutrients.proteinGrams ?? 0) >= d.target!.macros.protein.grams).length, carbsAverage: average(days.map((d) => d.nutrients.carbsGrams ?? 0)), fatAverage: average(days.map((d) => d.nutrients.fatGrams ?? 0)) };
}

export function aggregateHydration(entries: readonly WaterEntry[], profile: UserProfile, records: readonly ProgressRecord[], period: ProgressPeriod): HydrationProgress {
  const grouped = new Map<string, number>(); entries.filter((item) => inPeriod(item.localDate, period)).forEach((item) => grouped.set(item.localDate, (grouped.get(item.localDate) ?? 0) + item.amountMl));
  const weightAt = (date: string) => [...records].filter((r) => r.weightKg && r.localDate <= date).sort((a,b) => b.localDate.localeCompare(a.localDate))[0]?.weightKg ?? profile.currentWeightKg;
  const days = [...grouped.entries()].map(([date, ml]) => ({ ml, target: calculateHydrationTarget(weightAt(date), profile.hydrationConfiguration) }));
  return { registeredDays: days.length, averageMl: average(days.map((d) => d.ml)), averageTargetMl: average(days.map((d) => d.target)), daysAtTarget: days.filter((d) => d.ml >= d.target).length };
}

export function aggregateTraining(sessions: readonly WorkoutSession[], logs: readonly WorkoutSetLog[], plans: readonly WorkoutPlan[], period: ProgressPeriod): TrainingProgress {
  const completed = sessions.filter((s) => s.status === 'completed' && inPeriod(s.localDate, period)); let plannedSessions = 0;
  if (period.startLocalDate) for (let time = noon(period.startLocalDate); time <= noon(period.endLocalDate); time += dayMs) { const date = new Date(time); const key = date.toISOString().slice(0,10); const plan = plans.filter((p) => p.status === 'active' && p.startDate <= key).sort((a,b) => b.startDate.localeCompare(a.startDate))[0]; if (plan) { const day = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getDay()]; if (currentPlanVersion(plan).templates.some((t) => t.scheduledDay === day)) plannedSessions += 1; } }
  const completedIds = new Set(completed.map((s)=>s.id)); const completedLogs = logs.filter((l) => l.completed && completedIds.has(l.sessionId)); const exerciseMap = new Map<string, ExerciseProgress>();
  completedLogs.forEach((log) => { const session = completed.find((s) => s.id === log.sessionId); if (!session) return; const current = exerciseMap.get(log.exerciseId) ?? { exerciseId: log.exerciseId, name: log.exerciseNameSnapshot, points: [] }; const point = { localDate: session.localDate, load: log.actualLoad, reps: log.actualReps, volume: log.actualLoad !== undefined && log.actualReps !== undefined && (log.loadUnit === 'kg' || log.loadUnit === 'lb') ? log.actualLoad * log.actualReps : undefined }; current.points.push(point); if ((log.loadUnit === 'kg' || log.loadUnit === 'lb') && (current.bestLoad === undefined || (log.actualLoad ?? 0) > current.bestLoad)) { current.bestLoad = log.actualLoad; current.loadUnit = log.loadUnit; } current.bestReps = Math.max(current.bestReps ?? 0, log.actualReps ?? 0) || undefined; current.bestVolume = Math.max(current.bestVolume ?? 0, point.volume ?? 0) || undefined; exerciseMap.set(log.exerciseId, current); });
  const weeklyMap = new Map<string, number>(); completed.forEach((s) => { const d = new Date(`${s.localDate}T12:00:00`); d.setDate(d.getDate() - ((d.getDay()+6)%7)); const key=d.toISOString().slice(0,10); weeklyMap.set(key,(weeklyMap.get(key)??0)+1); }); const durations = completed.map((s) => s.completedAt ? Math.max(0,(new Date(s.completedAt).getTime()-new Date(s.startedAt).getTime())/60000) : 0);
  return { completedSessions: completed.length, plannedSessions, adherence: plannedSessions ? Math.min(100,Math.round(completed.length/plannedSessions*100)) : undefined, totalMinutes: Math.round(durations.reduce((a,b)=>a+b,0)), averageMinutes: average(durations), completedSets: completedLogs.length, volumeKg: sessionVolume(completedLogs.filter((l)=>l.loadUnit==='kg')), volumeLb: sessionVolume(completedLogs.filter((l)=>l.loadUnit==='lb')), exerciseRecords:[...exerciseMap.values()], weekly:[...weeklyMap].sort().map(([label,count])=>({label,count})) };
}
