import type { DailyNutritionSummary } from './daily-nutrition-summary';

export interface DailyNutritionSummaryRepository {
  get(profileId: string, localDate: string): Promise<DailyNutritionSummary | undefined>;
  listByPeriod(profileId: string, startLocalDate: string | undefined, endLocalDate: string): Promise<DailyNutritionSummary[]>;
  save(summary: DailyNutritionSummary): Promise<void>;
  remove(profileId: string, localDate: string): Promise<void>;
  removeByProfile(profileId: string): Promise<void>;
}
