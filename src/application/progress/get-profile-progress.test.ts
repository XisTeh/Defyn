import { describe, expect, it } from 'vitest';
import type { ProgressPhotoMetadata, ProgressRecord } from '../../domain/progress/progress';
import type { ProgressRepository } from '../../domain/progress/repository';
import { GetProfileProgressService } from './get-profile-progress';

describe('isolamento de progresso', () => {
  it('retorna somente pesagens e fotos do perfil solicitado', async () => {
    const records = [record('weight-a', 'profile-a'), record('weight-b', 'profile-b')];
    const photos = [photo('photo-a', 'profile-a'), photo('photo-b', 'profile-b')];
    const repository: ProgressRepository = {
      saveRecord: async () => undefined,
      listRecords: async (profileId) => records.filter((item) => item.profileId === profileId),
      savePhotoMetadata: async () => undefined,
      listPhotoMetadata: async (profileId) => photos.filter((item) => item.profileId === profileId),
      removeByProfile: async () => undefined,
    };
    const result = await new GetProfileProgressService(repository).execute('profile-a');
    expect(result.records.map((item) => item.id)).toEqual(['weight-a']);
    expect(result.photos.map((item) => item.id)).toEqual(['photo-a']);
  });
});

function record(id: string, profileId: string): ProgressRecord {
  return { id, profileId, date: '2026-08-21', localDate: '2026-08-21', occurredAt: '2026-08-21T00:00:00.000Z', source: 'manual', weightKg: 80, createdAt: '2026-08-21T00:00:00.000Z', updatedAt: '2026-08-21T00:00:00.000Z' };
}

function photo(id: string, profileId: string): ProgressPhotoMetadata {
  return { id, profileId, date: '2026-08-21', localDate: '2026-08-21', occurredAt: '2026-08-21T00:00:00.000Z', angle: 'front', category: 'front', createdAt: '2026-08-21T00:00:00.000Z', updatedAt: '2026-08-21T00:00:00.000Z' };
}
