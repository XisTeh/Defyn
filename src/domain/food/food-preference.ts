import type { AuditedEntity } from '../shared/types';

export interface FoodPreference extends AuditedEntity {
  profileId: string;
  foodId: string;
  favorite: boolean;
  useCount: number;
  lastUsedAt?: string;
}
