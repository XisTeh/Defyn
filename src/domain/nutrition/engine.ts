import { NutritionDomainError } from './errors';
import type {
  BmrInput,
  MacroAmount,
  MetabolicMethod,
  MetabolicStrategy,
  NutritionCalculationInput,
  NutritionCalculationResult,
} from './types';

export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

function finite(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new NutritionDomainError('NOT_FINITE', `${field} precisa ser um número finito.`, field);
  }
}

function range(value: number, min: number, max: number, field: string): void {
  finite(value, field);
  if (value < min || value > max) {
    throw new NutritionDomainError(
      'OUT_OF_RANGE',
      `${field} precisa estar entre ${min} e ${max}.`,
      field,
    );
  }
}

export function validateBmrInput(input: BmrInput): void {
  range(input.weightKg, 1, 500, 'Peso');
  range(input.heightCm, 50, 280, 'Altura');
  range(input.ageYears, 13, 120, 'Idade');
}

const harrisBenedictOriginal: MetabolicStrategy = {
  id: 'harris-benedict-original',
  calculate(input) {
    validateBmrInput(input);
    return input.sex === 'male'
      ? 66.5 + 13.75 * input.weightKg + 5.003 * input.heightCm - 6.75 * input.ageYears
      : 655.1 + 9.563 * input.weightKg + 1.85 * input.heightCm - 4.676 * input.ageYears;
  },
};

const mifflinStJeor: MetabolicStrategy = {
  id: 'mifflin-st-jeor',
  calculate(input) {
    validateBmrInput(input);
    const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears;
    return base + (input.sex === 'male' ? 5 : -161);
  },
};

const strategies: Record<MetabolicMethod, MetabolicStrategy> = {
  'harris-benedict-original': harrisBenedictOriginal,
  'mifflin-st-jeor': mifflinStJeor,
};

export function calculateBmr(method: MetabolicMethod, input: BmrInput): number {
  return strategies[method].calculate(input);
}

export function calculateTdee(bmr: number, activityFactor: number): number {
  finite(bmr, 'TMB');
  finite(activityFactor, 'Fator de atividade');
  if (bmr <= 0 || activityFactor <= 0 || activityFactor > 3) {
    throw new NutritionDomainError(
      'INVALID_ACTIVITY_FACTOR',
      'TMB e fator de atividade precisam ser positivos e coerentes.',
      'Fator de atividade',
    );
  }
  return bmr * activityFactor;
}

function macroGrams(amount: MacroAmount, weightKg: number, field: string): number {
  const value = amount.mode === 'per-kg' ? amount.gramsPerKg * weightKg : amount.grams;
  range(value, 0, 2_000, field);
  return value;
}

function calorieTarget(input: NutritionCalculationInput, tdee: number): {
  adjustment: number;
  target: number;
} {
  const goal = input.calorieGoal;
  let adjustment = 0;
  let target = tdee;
  if (goal.mode === 'deficit') {
    range(goal.adjustmentKcal, 0, 10_000, 'Déficit');
    adjustment = -goal.adjustmentKcal;
    target = tdee + adjustment;
  } else if (goal.mode === 'surplus') {
    range(goal.adjustmentKcal, 0, 10_000, 'Superávit');
    adjustment = goal.adjustmentKcal;
    target = tdee + adjustment;
  } else if (goal.mode === 'custom') {
    finite(goal.targetKcal, 'Meta calórica');
    target = goal.targetKcal;
    adjustment = target - tdee;
  }
  if (!Number.isFinite(target) || target <= 0) {
    throw new NutritionDomainError(
      'INVALID_CALORIE_TARGET',
      'O ajuste resulta em uma meta calórica impossível. Revise os valores.',
      'Meta calórica',
    );
  }
  return { adjustment, target };
}

export function calculateNutritionTargets(
  input: NutritionCalculationInput,
): NutritionCalculationResult {
  const bmr = calculateBmr(input.metabolicMethod, input);
  const tdee = calculateTdee(bmr, input.activityFactor);
  const { adjustment, target } = calorieTarget(input, tdee);

  let proteinGrams: number;
  let fatGrams: number;
  let carbGrams: number;
  if (input.macros.mode === 'manual') {
    proteinGrams = input.macros.proteinGrams;
    fatGrams = input.macros.fatGrams;
    carbGrams = input.macros.carbGrams;
    range(proteinGrams, 0, 2_000, 'Proteína');
    range(fatGrams, 0, 2_000, 'Gordura');
    range(carbGrams, 0, 2_000, 'Carboidrato');
  } else {
    proteinGrams = macroGrams(input.macros.protein, input.weightKg, 'Proteína');
    fatGrams = macroGrams(input.macros.fat, input.weightKg, 'Gordura');
    const remaining =
      target - proteinGrams * KCAL_PER_GRAM.protein - fatGrams * KCAL_PER_GRAM.fat;
    if (remaining < 0) {
      throw new NutritionDomainError(
        'NEGATIVE_CARBOHYDRATES',
        'Proteína e gordura ultrapassam a meta calórica. Revise os macros.',
        'Carboidrato',
      );
    }
    carbGrams = remaining / KCAL_PER_GRAM.carbs;
  }

  const result: NutritionCalculationResult = {
    bmr,
    metabolicMethod: input.metabolicMethod,
    activityFactor: input.activityFactor,
    tdee,
    calorieAdjustment: adjustment,
    calorieTarget: target,
    macros: {
      protein: { grams: proteinGrams, calories: proteinGrams * KCAL_PER_GRAM.protein },
      carbs: { grams: carbGrams, calories: carbGrams * KCAL_PER_GRAM.carbs },
      fat: { grams: fatGrams, calories: fatGrams * KCAL_PER_GRAM.fat },
    },
  };

  const allNumbers = [
    result.bmr,
    result.tdee,
    result.calorieTarget,
    result.macros.protein.grams,
    result.macros.carbs.grams,
    result.macros.fat.grams,
  ];
  if (!allNumbers.every(Number.isFinite)) {
    throw new NutritionDomainError('NOT_FINITE', 'O cálculo produziu um valor inválido.');
  }
  return result;
}

export function presentationRound(value: number): number {
  finite(value, 'Valor');
  return Math.round(value);
}
