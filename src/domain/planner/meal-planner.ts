import type { Food, NutrientValues } from '../food/food';

export type MealDistributionPreset = 'balanced' | 'main-meals-larger' | 'custom';
export interface MealTarget { name: string; time?: string; ratio: number; nutrients: Required<Pick<NutrientValues, 'caloriesKcal' | 'proteinGrams' | 'carbsGrams' | 'fatGrams'>>; }
export interface MealPlanResult { targets: MealTarget[]; compatibleFoods: Food[]; excludedFoods: { food: Food; reasons: string[] }[]; warnings: string[]; metadata: { kind: 'defyn-preset'; preset: MealDistributionPreset; version: 1; explanation: string }; }

function ratios(count: number, preset: MealDistributionPreset): number[] {
  if (count < 1 || count > 8) throw new Error('Escolha entre 1 e 8 refeições.');
  if (preset === 'main-meals-larger' && count >= 3) {
    const base = Array.from({ length: count }, () => 0.12);
    const main = count === 3 ? [0, 2] : [1, count - 1];
    const remaining = 1 - base.reduce((sum, value) => sum + value, 0);
    main.forEach((index) => { base[index] = (base[index] ?? 0) + remaining / main.length; });
    return base;
  }
  return Array.from({ length: count }, () => 1 / count);
}

export function planDailyMeals(input: {
  target: { caloriesKcal: number; proteinGrams: number; carbsGrams: number; fatGrams: number };
  mealNames: string[];
  mealTimes?: string[];
  preset: MealDistributionPreset;
  foods: Food[];
  restrictions?: string[];
}): MealPlanResult {
  const distribution = ratios(input.mealNames.length, input.preset);
  const restrictions = (input.restrictions ?? []).map((item) => item.toLocaleLowerCase('pt-BR').trim()).filter(Boolean);
  const excludedFoods: MealPlanResult['excludedFoods'] = [];
  const compatibleFoods = input.foods.filter((food) => {
    const searchable = [...(food.allergens ?? []), ...(food.tags ?? []), food.name, food.description ?? ''].join(' ').toLocaleLowerCase('pt-BR');
    const reasons = restrictions.filter((rule) => searchable.includes(rule));
    if (reasons.length) excludedFoods.push({ food, reasons });
    return reasons.length === 0;
  });
  const warnings: string[] = [];
  if (!compatibleFoods.length) warnings.push('Nenhum alimento compatível está disponível. Adicione alimentos ou revise as restrições informadas.');
  if (input.foods.length && excludedFoods.length) warnings.push(`${excludedFoods.length} alimento(s) foram excluídos por restrições informadas pelo usuário.`);
  const targets = input.mealNames.map((name, index) => ({
    name,
    time: input.mealTimes?.[index],
    ratio: distribution[index] ?? 0,
    nutrients: {
      caloriesKcal: input.target.caloriesKcal * (distribution[index] ?? 0),
      proteinGrams: input.target.proteinGrams * (distribution[index] ?? 0),
      carbsGrams: input.target.carbsGrams * (distribution[index] ?? 0),
      fatGrams: input.target.fatGrams * (distribution[index] ?? 0),
    },
  }));
  return { targets, compatibleFoods, excludedFoods, warnings, metadata: { kind: 'defyn-preset', preset: input.preset, version: 1, explanation: input.preset === 'main-meals-larger' ? 'Preset do DEFYN que reserva mais energia para almoço e jantar.' : 'Preset do DEFYN que distribui as metas de forma semelhante.' } };
}

export function suggestFoodQuantity(food: Food, nutrient: keyof Pick<NutrientValues, 'caloriesKcal' | 'proteinGrams' | 'carbsGrams' | 'fatGrams'>, missing: number, minimum = 5, maximum = 500, step = 5): number | undefined {
  const base = food.nutrients[nutrient];
  if (!base || missing <= 0) return undefined;
  const raw = missing * food.basePortion.quantity / base;
  const rounded = Math.round(raw / step) * step;
  if (rounded < minimum || rounded > maximum) return undefined;
  return rounded;
}
