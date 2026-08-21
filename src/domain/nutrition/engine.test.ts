import { describe, expect, it } from 'vitest';
import {
  calculateBmr,
  calculateNutritionTargets,
  calculateTdee,
  NutritionDomainError,
  presentationRound,
  VIDEO_MACRO_PRESET,
} from './index';

const person = { weightKg: 80, heightCm: 180, ageYears: 30 } as const;

describe('taxa metabólica basal', () => {
  it('calcula Harris-Benedict original para homem', () => {
    expect(calculateBmr('harris-benedict-original', { ...person, sex: 'male' })).toBeCloseTo(1864.54, 8);
  });

  it('calcula Harris-Benedict original para mulher', () => {
    expect(calculateBmr('harris-benedict-original', { ...person, sex: 'female' })).toBeCloseTo(1612.86, 8);
  });

  it('protege a constante feminina 655.1 contra regressão para 65.71', () => {
    const value = calculateBmr('harris-benedict-original', { sex: 'female', weightKg: 60, heightCm: 165, ageYears: 40 });
    expect(value).toBeCloseTo(1347.09, 8);
    expect(value).toBeGreaterThan(1_000);
  });

  it('calcula Mifflin-St Jeor para homem', () => {
    expect(calculateBmr('mifflin-st-jeor', { ...person, sex: 'male' })).toBe(1780);
  });

  it('calcula Mifflin-St Jeor para mulher', () => {
    expect(calculateBmr('mifflin-st-jeor', { ...person, sex: 'female' })).toBe(1614);
  });
});

describe('gasto e objetivo energético', () => {
  it('calcula GET sem arredondar prematuramente', () => {
    expect(calculateTdee(1780.25, 1.3)).toBeCloseTo(2314.325, 10);
  });

  it('aplica déficit configurável', () => {
    const result = calculateNutritionTargets(baseInput({ mode: 'deficit', adjustmentKcal: 400 }));
    expect(result.tdee).toBe(2670);
    expect(result.calorieAdjustment).toBe(-400);
    expect(result.calorieTarget).toBe(2270);
  });

  it('mantém o GET no objetivo de manutenção', () => {
    const result = calculateNutritionTargets(baseInput({ mode: 'maintenance' }));
    expect(result.calorieAdjustment).toBe(0);
    expect(result.calorieTarget).toBe(2670);
  });

  it('aplica superávit configurável', () => {
    const result = calculateNutritionTargets(baseInput({ mode: 'surplus', adjustmentKcal: 250 }));
    expect(result.calorieAdjustment).toBe(250);
    expect(result.calorieTarget).toBe(2920);
  });

  it('aceita meta calórica personalizada', () => {
    const result = calculateNutritionTargets(baseInput({ mode: 'custom', targetKcal: 2400 }));
    expect(result.calorieTarget).toBe(2400);
    expect(result.calorieAdjustment).toBe(-270);
  });
});

describe('macronutrientes', () => {
  it('calcula proteína a 2 g/kg', () => {
    const result = calculateNutritionTargets(baseInput({ mode: 'deficit', adjustmentKcal: 400 }));
    expect(result.macros.protein).toEqual({ grams: 160, calories: 640 });
  });

  it('calcula gordura a 1 g/kg e 9 kcal/g', () => {
    const result = calculateNutritionTargets(baseInput({ mode: 'deficit', adjustmentKcal: 400 }));
    expect(result.macros.fat).toEqual({ grams: 80, calories: 720 });
  });

  it('destina as calorias restantes aos carboidratos', () => {
    const result = calculateNutritionTargets(baseInput({ mode: 'deficit', adjustmentKcal: 400 }));
    expect(result.macros.carbs).toEqual({ grams: 227.5, calories: 910 });
  });

  it('aceita proteína e gordura absolutas', () => {
    const input = baseInput({ mode: 'maintenance' });
    const result = calculateNutritionTargets({
      ...input,
      macros: {
        mode: 'derived-carbs',
        protein: { mode: 'absolute', grams: 150 },
        fat: { mode: 'absolute', grams: 70 },
      },
    });
    expect(result.macros.protein.grams).toBe(150);
    expect(result.macros.fat.grams).toBe(70);
    expect(result.macros.carbs.grams).toBe(360);
  });

  it('aceita macros totalmente manuais', () => {
    const input = baseInput({ mode: 'custom', targetKcal: 2100 });
    const result = calculateNutritionTargets({
      ...input,
      macros: { mode: 'manual', proteinGrams: 170, carbGrams: 220, fatGrams: 60 },
    });
    expect(result.macros.protein.calories).toBe(680);
    expect(result.macros.carbs.calories).toBe(880);
    expect(result.macros.fat.calories).toBe(540);
  });
});

describe('validações e precisão', () => {
  it.each([
    ['peso zero', { weightKg: 0 }],
    ['peso negativo', { weightKg: -1 }],
    ['altura zero', { heightCm: 0 }],
    ['altura negativa', { heightCm: -170 }],
    ['idade absurda', { ageYears: 121 }],
  ])('rejeita %s', (_name, change) => {
    expect(() => calculateBmr('mifflin-st-jeor', { ...person, sex: 'male', ...change })).toThrow(NutritionDomainError);
  });

  it('rejeita fator de atividade zero', () => {
    expect(() => calculateTdee(1800, 0)).toThrowError(/positivos/);
  });

  it('rejeita NaN e Infinity', () => {
    expect(() => calculateTdee(Number.NaN, 1.5)).toThrowError(/finito/);
    expect(() => calculateTdee(1800, Number.POSITIVE_INFINITY)).toThrowError(/finito/);
  });

  it('rejeita déficit maior que o GET', () => {
    expect(() => calculateNutritionTargets(baseInput({ mode: 'deficit', adjustmentKcal: 3000 }))).toThrowError(/impossível/);
  });

  it('rejeita configuração que produziria carboidrato negativo', () => {
    expect(() => calculateNutritionTargets({
      ...baseInput({ mode: 'custom', targetKcal: 900 }),
      macros: VIDEO_MACRO_PRESET,
    })).toThrowError(/ultrapassam/);
  });

  it('mantém precisão no motor e arredonda apenas para apresentação', () => {
    const result = calculateNutritionTargets({
      ...baseInput({ mode: 'custom', targetKcal: 2222 }),
      weightKg: 77.7,
    });
    expect(result.macros.carbs.grams).toBeCloseTo(225.275, 10);
    expect(presentationRound(result.macros.carbs.grams)).toBe(225);
    expect(result.macros.carbs.grams).not.toBe(225);
  });
});

function baseInput(calorieGoal: Parameters<typeof calculateNutritionTargets>[0]['calorieGoal']) {
  return {
    ...person,
    sex: 'male' as const,
    metabolicMethod: 'mifflin-st-jeor' as const,
    activityFactor: 1.5,
    calorieGoal,
    macros: VIDEO_MACRO_PRESET,
  };
}
