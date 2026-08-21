import { describe, expect, it } from 'vitest';
import { planDailyMeals, suggestFoodQuantity } from './meal-planner';
import type { Food } from '../food/food';
const timestamp = '2026-08-21T00:00:00.000Z';
function food(name: string, tags: string[] = []): Food { return { id: name, name, nameNormalized: name.toLowerCase(), searchTextNormalized: name.toLowerCase(), basePortion: { quantity: 100, unit: 'g' }, portions: [], nutrients: { caloriesKcal: 200, proteinGrams: 20, carbsGrams: 20, fatGrams: 4 }, dataSource: 'manual', tags, createdAt: timestamp, updatedAt: timestamp }; }
const target = { caloriesKcal: 2000, proteinGrams: 160, carbsGrams: 220, fatGrams: 60 };
describe('planejador determinístico', () => {
  it('distribui 100% da meta', () => { const plan = planDailyMeals({ target, mealNames: ['A','B','C','D'], preset: 'balanced', foods: [] }); expect(plan.targets.reduce((sum, meal) => sum + meal.ratio, 0)).toBeCloseTo(1); });
  it('divide de forma igual no preset equilibrado', () => expect(planDailyMeals({ target, mealNames: ['A','B','C','D'], preset: 'balanced', foods: [] }).targets[0]?.nutrients.caloriesKcal).toBe(500));
  it('torna refeições principais maiores', () => { const plan = planDailyMeals({ target, mealNames: ['Café','Almoço','Lanche','Jantar'], preset: 'main-meals-larger', foods: [] }); expect(plan.targets[1]!.ratio).toBeGreaterThan(plan.targets[0]!.ratio); });
  it('exclui alimento incompatível com restrição informada', () => { const plan = planDailyMeals({ target, mealNames: ['A'], preset: 'balanced', foods: [food('Leite',['lactose'])], restrictions: ['lactose'] }); expect(plan.compatibleFoods).toHaveLength(0); expect(plan.excludedFoods).toHaveLength(1); });
  it('avisa quando não há alimentos', () => expect(planDailyMeals({ target, mealNames: ['A'], preset: 'balanced', foods: [] }).warnings).toHaveLength(1));
  it('sugere quantidade arredondada e rejeita porção inviável', () => { expect(suggestFoodQuantity(food('Frango'), 'proteinGrams', 30)).toBe(150); expect(suggestFoodQuantity(food('Frango'), 'proteinGrams', 300)).toBeUndefined(); });
});
