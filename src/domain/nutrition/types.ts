export type MetabolicSex = 'male' | 'female';
export type MetabolicMethod = 'harris-benedict-original' | 'mifflin-st-jeor';
export type ActivityPresetId = 'video-light' | 'video-moderate' | 'video-high';

export interface BmrInput {
  sex: MetabolicSex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
}

export interface MetabolicStrategy {
  readonly id: MetabolicMethod;
  calculate(input: BmrInput): number;
}

export type CalorieGoal =
  | { mode: 'deficit'; adjustmentKcal: number }
  | { mode: 'maintenance'; adjustmentKcal?: 0 }
  | { mode: 'surplus'; adjustmentKcal: number }
  | { mode: 'custom'; targetKcal: number };

export type MacroAmount =
  | { mode: 'per-kg'; gramsPerKg: number }
  | { mode: 'absolute'; grams: number };

export type MacroConfiguration =
  | { mode: 'derived-carbs'; protein: MacroAmount; fat: MacroAmount }
  | { mode: 'manual'; proteinGrams: number; carbGrams: number; fatGrams: number };

export interface NutritionCalculationInput extends BmrInput {
  metabolicMethod: MetabolicMethod;
  activityFactor: number;
  calorieGoal: CalorieGoal;
  macros: MacroConfiguration;
}

export interface MacroResult {
  grams: number;
  calories: number;
}

export interface NutritionCalculationResult {
  bmr: number;
  metabolicMethod: MetabolicMethod;
  activityFactor: number;
  tdee: number;
  calorieAdjustment: number;
  calorieTarget: number;
  macros: {
    protein: MacroResult;
    carbs: MacroResult;
    fat: MacroResult;
  };
}
