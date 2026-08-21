import type { AuditedEntity } from '../shared/types';

export type HydrationConfiguration =
  | { mode: 'weight-based'; mlPerKg: number }
  | { mode: 'custom'; customTargetMl: number };

export interface HydrationContainer {
  id: string;
  name: string;
  amountMl: number;
}

export interface WaterEntry extends AuditedEntity {
  profileId: string;
  occurredAt: string;
  localDate: string;
  amountMl: number;
}

export const HYDRATION_PRESETS_ML_PER_KG = [30, 35, 40] as const;

export class HydrationDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HydrationDomainError';
  }
}

function positiveFinite(value: number, label: string, maximum: number): void {
  if (!Number.isFinite(value) || value <= 0 || value > maximum) {
    throw new HydrationDomainError(`${label} precisa ser um número positivo e razoável.`);
  }
}

export function calculateHydrationTarget(
  weightKg: number,
  configuration: HydrationConfiguration,
): number {
  positiveFinite(weightKg, 'Peso', 500);
  if (configuration.mode === 'custom') {
    positiveFinite(configuration.customTargetMl, 'Meta de água', 20_000);
    return configuration.customTargetMl;
  }
  positiveFinite(configuration.mlPerKg, 'Mililitros por quilo', 100);
  return weightKg * configuration.mlPerKg;
}

export function validateWaterAmount(amountMl: number): void {
  positiveFinite(amountMl, 'Quantidade de água', 10_000);
}

export function sumWaterEntries(entries: readonly WaterEntry[]): number {
  return entries.reduce((total, entry) => {
    validateWaterAmount(entry.amountMl);
    return total + entry.amountMl;
  }, 0);
}

export type HydrationPaceState = 'on-pace' | 'slightly-below' | 'well-below' | 'above-pace' | 'target-reached' | 'outside-window';
export interface HydrationPace { expectedMl: number; expectedPercentage: number; differenceMl: number; state: HydrationPaceState; elapsedRatio: number; }

function minutes(time: string): number {
  const matched = /^(\d{2}):(\d{2})$/.exec(time);
  if (!matched) throw new HydrationDomainError('Horário de rotina inválido.');
  const value = Number(matched[1]) * 60 + Number(matched[2]);
  if (Number(matched[1]) > 23 || Number(matched[2]) > 59) throw new HydrationDomainError('Horário de rotina inválido.');
  return value;
}

export function calculateHydrationPace(targetMl: number, consumedMl: number, wakeTime: string, sleepTime: string, now: Date): HydrationPace {
  positiveFinite(targetMl, 'Meta de água', 20_000);
  if (!Number.isFinite(consumedMl) || consumedMl < 0) throw new HydrationDomainError('Consumo de água inválido.');
  const wake = minutes(wakeTime);
  let sleep = minutes(sleepTime);
  let current = now.getHours() * 60 + now.getMinutes();
  if (sleep <= wake) sleep += 24 * 60;
  if (current < wake && sleep > 24 * 60) current += 24 * 60;
  const elapsedRatio = Math.max(0, Math.min(1, (current - wake) / (sleep - wake)));
  const expectedMl = targetMl * elapsedRatio;
  const differenceMl = consumedMl - expectedMl;
  const tolerance = Math.max(200, targetMl * 0.08);
  let state: HydrationPaceState;
  if (consumedMl >= targetMl) state = 'target-reached';
  else if (current < wake || current > sleep) state = 'outside-window';
  else if (differenceMl > tolerance) state = 'above-pace';
  else if (differenceMl >= -tolerance) state = 'on-pace';
  else if (differenceMl >= -tolerance * 2.25) state = 'slightly-below';
  else state = 'well-below';
  return { expectedMl, expectedPercentage: elapsedRatio * 100, differenceMl, state, elapsedRatio };
}

export function hydrationCheckpoints(targetMl: number): { label: string; ratio: number; targetMl: number }[] {
  positiveFinite(targetMl, 'Meta de água', 20_000);
  return [
    { label: 'Manhã', ratio: 0.33, targetMl: targetMl * 0.33 },
    { label: 'Tarde', ratio: 0.67, targetMl: targetMl * 0.67 },
    { label: 'Noite', ratio: 1, targetMl },
  ];
}
