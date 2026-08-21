import type { WaterEntry } from './hydration';

export interface WaterRepository {
  listByProfileAndDate(profileId: string, localDate: string): Promise<WaterEntry[]>;
  listByPeriod?(profileId: string, startLocalDate: string | undefined, endLocalDate: string): Promise<WaterEntry[]>;
  save(entry: WaterEntry): Promise<void>;
  remove(id: string): Promise<void>;
  removeByProfile(profileId: string): Promise<void>;
}
