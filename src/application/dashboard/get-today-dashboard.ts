import { calculateHydrationPace, calculateHydrationTarget, sumWaterEntries, type HydrationPace, type WaterEntry } from '../../domain/hydration/hydration';
import type { WaterRepository } from '../../domain/hydration/repository';
import type { DiaryRepository } from '../../domain/diary/repository';
import type { UserProfile } from '../../domain/profile/profile';
import type { ProfileRepository } from '../../domain/profile/repository';
import type { NutritionTargetSnapshot } from '../../domain/targets/nutrition-target';
import type { NutritionTargetRepository } from '../../domain/targets/repository';
import { toLocalDateKey } from '../../domain/shared/local-date';

export interface TodayDashboard {
  profile: UserProfile;
  nutritionTarget: NutritionTargetSnapshot;
  localDate: string;
  consumedCalories: number;
  remainingCalories: number;
  macros: {
    protein: { consumed: number; target: number; remaining: number };
    carbs: { consumed: number; target: number; remaining: number };
    fat: { consumed: number; target: number; remaining: number };
  };
  hydration: {
    targetMl: number;
    consumedMl: number;
    remainingMl: number;
    percentage: number;
    entries: WaterEntry[];
    pace: HydrationPace;
  };
  meals: { id: string; name: string; caloriesKcal: number; itemCount: number }[];
}

export class GetTodayDashboardService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly targets: NutritionTargetRepository,
    private readonly diary: DiaryRepository,
    private readonly water: WaterRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(profileId: string): Promise<TodayDashboard> {
    const profile = await this.profiles.getById(profileId);
    const nutritionTarget = await this.targets.getActiveForProfile(profileId);
    if (!profile || !nutritionTarget) throw new Error('Perfil ou meta ativa não encontrado.');
    const localDate = toLocalDateKey(this.now());
    const [diaryEntries, waterEntries, mealCategories] = await Promise.all([
      this.diary.listEntries(profileId, localDate),
      this.water.listByProfileAndDate(profileId, localDate),
      this.diary.listMealCategories(profileId),
    ]);
    const consumed = diaryEntries.reduce(
      (total, entry) => ({
        calories: total.calories + (entry.item.nutrients.caloriesKcal ?? 0),
        protein: total.protein + (entry.item.nutrients.proteinGrams ?? 0),
        carbs: total.carbs + (entry.item.nutrients.carbsGrams ?? 0),
        fat: total.fat + (entry.item.nutrients.fatGrams ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
    const target = nutritionTarget.result;
    const waterTarget = calculateHydrationTarget(
      profile.currentWeightKg,
      profile.hydrationConfiguration,
    );
    const waterConsumed = sumWaterEntries(waterEntries);
    const routine = profile.hydrationRoutine ?? { wakeTime: '07:00', sleepTime: '23:00' };
    const macro = (value: number, targetValue: number) => ({
      consumed: value,
      target: targetValue,
      remaining: Math.max(0, targetValue - value),
    });
    return {
      profile,
      nutritionTarget,
      localDate,
      consumedCalories: consumed.calories,
      remainingCalories: Math.max(0, target.calorieTarget - consumed.calories),
      macros: {
        protein: macro(consumed.protein, target.macros.protein.grams),
        carbs: macro(consumed.carbs, target.macros.carbs.grams),
        fat: macro(consumed.fat, target.macros.fat.grams),
      },
      hydration: {
        targetMl: waterTarget,
        consumedMl: waterConsumed,
        remainingMl: Math.max(0, waterTarget - waterConsumed),
        percentage: waterTarget === 0 ? 0 : (waterConsumed / waterTarget) * 100,
        entries: waterEntries.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
        pace: calculateHydrationPace(waterTarget, waterConsumed, routine.wakeTime, routine.sleepTime, this.now()),
      },
      meals: mealCategories.map((meal) => { const items = diaryEntries.filter((entry) => entry.mealCategoryId === meal.id); return { id: meal.id, name: meal.name, itemCount: items.length, caloriesKcal: items.reduce((sum, entry) => sum + (entry.item.nutrients.caloriesKcal ?? 0), 0) }; }),
    };
  }
}
