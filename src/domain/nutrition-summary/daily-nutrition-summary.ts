import type { AuditedEntity } from '../shared/types';

export interface DailyNutritionSummary extends AuditedEntity {
  profileId: string;
  localDate: string;
  caloriesKcal?: number;
  proteinG?: number;
  carbohydratesG?: number;
  fatG?: number;
  note?: string;
}

export type DailyNutritionValues = Pick<
  DailyNutritionSummary,
  'caloriesKcal' | 'proteinG' | 'carbohydratesG' | 'fatG' | 'note'
>;

export function validateDailyNutritionValues(values: DailyNutritionValues): void {
  const metrics = [values.caloriesKcal, values.proteinG, values.carbohydratesG, values.fatG];
  if (metrics.some((value) => value !== undefined && (!Number.isFinite(value) || value < 0))) {
    throw new Error('Use apenas números maiores ou iguais a zero no resumo nutricional.');
  }
}

export function hasDailyNutritionContent(values: DailyNutritionValues): boolean {
  return values.caloriesKcal !== undefined
    || values.proteinG !== undefined
    || values.carbohydratesG !== undefined
    || values.fatG !== undefined
    || Boolean(values.note?.trim());
}
