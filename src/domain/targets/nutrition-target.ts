import type { NutritionCalculationResult, NutritionCalculationInput } from '../nutrition/types';
import type { AuditedEntity, DateRange } from '../shared/types';

export interface NutritionTargetSnapshot extends AuditedEntity, DateRange {
  profileId: string;
  input: NutritionCalculationInput;
  result: NutritionCalculationResult;
}
