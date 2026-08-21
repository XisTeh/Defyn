import { describe, expect, it } from 'vitest';
import { calculateRecipeNutrition } from './recipe';
const ingredients = [{ foodId: 'a', quantity: 100, unit: 'g', nutrientSnapshot: { caloriesKcal: 200, proteinGrams: 20, carbsGrams: 10, fatGrams: 8 } }, { foodId: 'b', quantity: 50, unit: 'g', nutrientSnapshot: { caloriesKcal: 100, proteinGrams: 5, carbsGrams: 15, fatGrams: 2 } }];
describe('nutrição de receitas', () => {
  it('soma ingredientes', () => expect(calculateRecipeNutrition(ingredients, 2).total.caloriesKcal).toBe(300));
  it('divide pelo rendimento', () => expect(calculateRecipeNutrition(ingredients, 2).perServing.proteinGrams).toBe(12.5));
  it('suporta porção fracionada', () => expect((calculateRecipeNutrition(ingredients, 2).perServing.caloriesKcal ?? 0) * 0.5).toBe(75));
  it('rejeita rendimento impossível', () => expect(() => calculateRecipeNutrition(ingredients, 0)).toThrow(/rendimento/));
});
