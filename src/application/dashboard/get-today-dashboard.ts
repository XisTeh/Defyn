import { calculateHydrationPace, calculateHydrationTarget, sumWaterEntries, type HydrationPace, type WaterEntry } from '../../domain/hydration/hydration';
import type { WaterRepository } from '../../domain/hydration/repository';
import type { DailyNutritionSummary } from '../../domain/nutrition-summary/daily-nutrition-summary';
import type { DailyNutritionSummaryRepository } from '../../domain/nutrition-summary/repository';
import type { UserProfile } from '../../domain/profile/profile';
import type { ProfileRepository } from '../../domain/profile/repository';
import type { NutritionTargetSnapshot } from '../../domain/targets/nutrition-target';
import type { NutritionTargetRepository } from '../../domain/targets/repository';
import { toLocalDateKey } from '../../domain/shared/local-date';

export interface TodayDashboard {
  profile: UserProfile;
  nutritionTarget: NutritionTargetSnapshot;
  nutritionSummary?: DailyNutritionSummary;
  localDate: string;
  hydration: {
    targetMl: number;
    consumedMl: number;
    remainingMl: number;
    percentage: number;
    entries: WaterEntry[];
    pace: HydrationPace;
  };
}

export class GetTodayDashboardService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly targets: NutritionTargetRepository,
    private readonly nutritionSummaries: DailyNutritionSummaryRepository,
    private readonly water: WaterRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(profileId: string): Promise<TodayDashboard> {
    const profile = await this.profiles.getById(profileId);
    const nutritionTarget = await this.targets.getActiveForProfile(profileId);
    if (!profile || !nutritionTarget) throw new Error('Perfil ou meta ativa não encontrado.');
    const localDate = toLocalDateKey(this.now());
    const [nutritionSummary, waterEntries] = await Promise.all([
      this.nutritionSummaries.get(profileId, localDate),
      this.water.listByProfileAndDate(profileId, localDate),
    ]);
    const waterTarget = calculateHydrationTarget(profile.currentWeightKg, profile.hydrationConfiguration);
    const waterConsumed = sumWaterEntries(waterEntries);
    const routine = profile.hydrationRoutine ?? { wakeTime: '07:00', sleepTime: '23:00' };
    return {
      profile,
      nutritionTarget,
      nutritionSummary,
      localDate,
      hydration: {
        targetMl: waterTarget,
        consumedMl: waterConsumed,
        remainingMl: Math.max(0, waterTarget - waterConsumed),
        percentage: waterTarget === 0 ? 0 : (waterConsumed / waterTarget) * 100,
        entries: waterEntries.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
        pace: calculateHydrationPace(waterTarget, waterConsumed, routine.wakeTime, routine.sleepTime, this.now()),
      },
    };
  }
}
