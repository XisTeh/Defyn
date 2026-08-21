import type { NutrientValues, PortionUnit } from '../food/food';
import type { AuditedEntity } from '../shared/types';

export interface RecipeIngredient {
  foodId: string;
  foodName?: string;
  quantity: number;
  unit: PortionUnit;
  nutrientSnapshot?: NutrientValues;
}

export interface Recipe extends AuditedEntity {
  name: string;
  nameNormalized?: string;
  ingredients: RecipeIngredient[];
  yieldDescription?: string;
  servings: number;
  /** Optional snapshot used only when a historical recipe version must be frozen. */
  nutritionSnapshot?: { total: NutrientValues; perServing: NutrientValues };
}

export function calculateRecipeNutrition(ingredients: readonly RecipeIngredient[], servings: number): { total: NutrientValues; perServing: NutrientValues } {
  if (!Number.isFinite(servings) || servings <= 0) throw new Error('O rendimento da receita precisa ser positivo.');
  const keys = ['caloriesKcal', 'proteinGrams', 'carbsGrams', 'fatGrams', 'fiberGrams', 'sugarsGrams', 'addedSugarsGrams', 'saturatedFatGrams', 'transFatGrams', 'sodiumMg'] as const;
  const total = Object.fromEntries(keys.map((key) => [key, ingredients.reduce((sum, item) => sum + (item.nutrientSnapshot?.[key] ?? 0), 0)])) as NutrientValues;
  const perServing = Object.fromEntries(keys.map((key) => [key, (total[key] ?? 0) / servings])) as NutrientValues;
  return { total, perServing };
}
