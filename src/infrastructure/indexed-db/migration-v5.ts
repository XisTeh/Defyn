import type { ProgressPhotoMetadata, ProgressRecord } from '../../domain/progress/progress';

export function migrateProgressRecordToV5(record: Partial<ProgressRecord> & { id: string; profileId: string; createdAt: string; updatedAt: string }): ProgressRecord {
  const localDate = record.localDate ?? record.date ?? record.createdAt.slice(0,10);
  return { ...record, localDate, occurredAt: record.occurredAt ?? `${localDate}T12:00:00`, source: record.source ?? 'migration' } as ProgressRecord;
}

export function migrateProgressPhotoToV5(photo: Partial<ProgressPhotoMetadata> & { id: string; profileId: string; createdAt: string; updatedAt: string }): ProgressPhotoMetadata {
  const localDate = photo.localDate ?? photo.date ?? photo.createdAt.slice(0,10);
  const category = photo.category ?? (photo.angle === 'front' ? 'front' : photo.angle === 'side' ? 'side' : photo.angle === 'back' ? 'back' : 'free');
  return { ...photo, localDate, occurredAt: photo.occurredAt ?? `${localDate}T12:00:00`, category } as ProgressPhotoMetadata;
}
