import { describe, expect, it } from 'vitest';
import { calculationNutrition, ensureCanonicalNutritionLabel, nutritionForAmount, validateNutritionLabelStructure } from './nutrition-label';

const fullNutrition = {
  caloriesKcal: 420, energyKj: 1764, carbsGrams: 50, sugarsGrams: 12, addedSugarsGrams: 8,
  proteinGrams: 20, fatGrams: 16, saturatedFatGrams: 6, transFatGrams: 0,
  fiberGrams: 5, sodiumMg: 500, other: { calcium: { value: 200, unit: 'mg' } },
};

describe('modelo completo do rótulo nutricional', () => {
  it.each([[70, .7], [80, .8]])('escala todos os nutrientes de 100 g para %d g', (amount, ratio) => {
    const scaled = nutritionForAmount(fullNutrition, 100, amount);
    expect(scaled.caloriesKcal).toBeCloseTo(420 * ratio);
    expect(scaled.energyKj).toBeCloseTo(1764 * ratio);
    expect(scaled.sodiumMg).toBeCloseTo(500 * ratio);
    expect(scaled.other?.calcium?.value).toBeCloseTo(200 * ratio);
  });

  it.each([[70, 70 / 60], [30, .5]])('escala todos os nutrientes de 60 g para %d g', (amount, ratio) => {
    const scaled = nutritionForAmount({ proteinGrams: 12, sodiumMg: 300, sugarsGrams: 7.2 }, 60, amount);
    expect(scaled.proteinGrams).toBeCloseTo(12 * ratio);
    expect(scaled.sodiumMg).toBeCloseTo(300 * ratio);
    expect(scaled.sugarsGrams).toBeCloseTo(7.2 * ratio);
  });

  it('prefere a coluna explícita de 100 g sem sobrescrever o arredondamento da porção', () => {
    const label = ensureCanonicalNutritionLabel({ version: 1, declaredServing: { quantity: 60, unit: 'g' }, columns: [
      { id: 'hundred', label: '100 g', kind: 'amount', basis: { quantity: 100, unit: 'g' }, values: { caloriesKcal: 421 }, source: 'explicit' },
      { id: 'serving', label: '60 g', kind: 'amount', basis: { quantity: 60, unit: 'g' }, values: { caloriesKcal: 252 }, source: 'explicit' },
    ] });
    expect(label.calculationBasis).toMatchObject({ columnId: 'hundred', source: 'explicit' });
    expect(calculationNutrition(label).caloriesKcal).toBe(421);
    expect(label.columns.find((column) => column.id === 'serving')?.values?.caloriesKcal).toBe(252);
  });

  it('marca a base 100 derivada e preserva a coluna original', () => {
    const label = ensureCanonicalNutritionLabel({ version: 1, declaredServing: { quantity: 60, unit: 'g' }, columns: [
      { id: 'serving', label: '60 g', kind: 'amount', basis: { quantity: 60, unit: 'g' }, values: { caloriesKcal: 252, sodiumMg: 300 }, source: 'explicit' },
    ] });
    expect(label.calculationBasis.source).toBe('derived');
    expect(calculationNutrition(label)).toMatchObject({ caloriesKcal: 420, sodiumMg: 500 });
    expect(label.columns[0]?.values).toMatchObject({ caloriesKcal: 252, sodiumMg: 300 });
  });

  it('alerta sobre incoerência proporcional e preserva os dois valores', () => {
    const label = ensureCanonicalNutritionLabel({ version: 1, declaredServing: { quantity: 50, unit: 'g' }, columns: [
      { id: 'hundred', label: '100 g', kind: 'amount', basis: { quantity: 100, unit: 'g' }, values: { proteinGrams: 20 }, source: 'explicit' },
      { id: 'serving', label: '50 g', kind: 'amount', basis: { quantity: 50, unit: 'g' }, values: { proteinGrams: 2 }, source: 'explicit' },
    ] });
    expect(validateNutritionLabelStructure(label)[0]?.kind).toBe('proportion');
    expect(label.columns.map((column) => column.values?.proteinGrams)).toEqual([20, 2]);
  });
});
