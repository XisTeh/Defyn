import type { ProgressPeriod, ProgressPhotoCategory, ProgressPhotoMetadata, ProgressRecord } from './progress';

export interface ProgressRepository {
  saveRecord(record: ProgressRecord): Promise<void>;
  getRecord?(profileId: string, id: string): Promise<ProgressRecord | undefined>;
  listRecords(profileId: string, period?: ProgressPeriod): Promise<ProgressRecord[]>;
  removeRecord?(profileId: string, id: string): Promise<void>;
  savePhotoMetadata(photo: ProgressPhotoMetadata): Promise<void>;
  getPhotoMetadata?(profileId: string, id: string): Promise<ProgressPhotoMetadata | undefined>;
  listPhotoMetadata(profileId: string, period?: ProgressPeriod, category?: ProgressPhotoCategory): Promise<ProgressPhotoMetadata[]>;
  removePhoto?(profileId: string, id: string): Promise<void>;
  removeCheckIn?(profileId: string, id: string): Promise<void>;
  removeByProfile(profileId: string): Promise<void>;
}
