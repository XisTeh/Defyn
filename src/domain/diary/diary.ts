import type { NutrientValues, PortionUnit } from '../food/food';
import type { AuditedEntity, IsoDate } from '../shared/types';

export interface MealCategory extends AuditedEntity {
  profileId: string;
  name: string;
  order: number;
  hidden: boolean;
  approximateTime?: string;
}

export interface ConsumedItemSnapshot {
  sourceType: 'food' | 'recipe';
  sourceId: string;
  sourceUpdatedAt: string;
  displayName: string;
  brand?: string;
  consumedQuantity: number;
  consumedUnit: PortionUnit;
  nutrients: NutrientValues;
}

export interface DiaryEntry extends AuditedEntity {
  profileId: string;
  date: IsoDate;
  mealCategoryId: string;
  time?: string;
  item: ConsumedItemSnapshot;
  note?: string;
}

export interface FavoriteMeal extends AuditedEntity {
  profileId: string;
  name: string;
  mealCategoryName?: string;
  items: ConsumedItemSnapshot[];
}

export function totalDiaryNutrients(entries: readonly DiaryEntry[]): NutrientValues {
  const keys = ['caloriesKcal', 'proteinGrams', 'carbsGrams', 'fatGrams', 'fiberGrams', 'sugarsGrams', 'addedSugarsGrams', 'saturatedFatGrams', 'transFatGrams', 'sodiumMg'] as const;
  return Object.fromEntries(keys.map((key) => [key, entries.reduce((sum, entry) => sum + (entry.item.nutrients[key] ?? 0), 0)])) as NutrientValues;
}
