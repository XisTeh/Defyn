import type { AuditedEntity } from '../shared/types';
import type {
  ActivityPresetId,
  CalorieGoal,
  MacroConfiguration,
  MetabolicMethod,
  MetabolicSex,
} from '../nutrition/types';
import type { HydrationConfiguration, HydrationContainer } from '../hydration/hydration';

export type BodyGoal = 'fat-loss' | 'maintenance' | 'weight-gain' | 'custom';

export interface UnitPreferences {
  weight: 'kg' | 'lb';
  height: 'cm' | 'ft-in';
  energy: 'kcal';
}

export interface NutritionPlanningPreferences {
  mealsPerDay: number;
  mealTimes: string[];
  trainingTime?: string;
  preferredFoods: string[];
  dislikedFoods: string[];
  avoidedFoods: string[];
  dietaryRestrictions: string[];
  intolerances: string[];
  allergies: string[];
  supplements: string[];
  mealSizePreference: 'balanced' | 'main-meals-larger' | 'custom';
  flexiblePlanning: boolean;
}

export interface HydrationRoutine {
  wakeTime: string;
  sleepTime: string;
  remindersEnabled: boolean;
  preferredIntervalMinutes?: number;
  pacingMode: 'continuous' | 'checkpoints';
}

export interface UserProfile extends AuditedEntity {
  name: string;
  dateOfBirth: string;
  metabolicSex: MetabolicSex;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg?: number;
  goal: BodyGoal;
  activity: { presetId?: ActivityPresetId; factor: number };
  metabolicMethod: MetabolicMethod;
  calorieGoal: CalorieGoal;
  macroConfiguration: MacroConfiguration;
  hydrationConfiguration: HydrationConfiguration;
  hydrationContainers?: HydrationContainer[];
  units: UnitPreferences;
  avatarMediaId?: string;
  nutritionPlanning?: NutritionPlanningPreferences;
  hydrationRoutine?: HydrationRoutine;
  /** Present only in records created by database v1. */
  isPrimary?: boolean;
}

export function ageOnDate(dateOfBirth: string, onDate = new Date()): number {
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return Number.NaN;
  let age = onDate.getFullYear() - birth.getFullYear();
  const month = onDate.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && onDate.getDate() < birth.getDate())) age -= 1;
  return age;
}
