import type { NutritionTargetSnapshot } from './nutrition-target';

export interface NutritionTargetRepository {
  save(snapshot: NutritionTargetSnapshot): Promise<void>;
  getActiveForProfile(profileId: string): Promise<NutritionTargetSnapshot | undefined>;
  listForProfile(profileId: string): Promise<NutritionTargetSnapshot[]>;
  removeByProfile(profileId: string): Promise<void>;
}
