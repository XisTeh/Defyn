import { describe, expect, it } from 'vitest';
import { createMediaMetadataPayload } from '../../application/media/media-sync';
import { syncRecordKey, type OutboxEvent } from '../../application/sync/sync-contract';
import type { LocalMedia } from '../../domain/media/media';
import { SupabaseSyncGateway } from './supabase-sync-gateway';

const accountId = '11111111-1111-4111-8111-111111111111';
const profileId = '22222222-2222-4222-8222-222222222222';
const mediaId = '33333333-3333-4333-8333-333333333333';
const timestamp = '2026-08-27T12:00:00.000Z';

function fixture() {
  const blob = new Blob([Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])], { type: 'image/png' });
  const media: LocalMedia = { id: mediaId, profileId, kind: 'profile-avatar', ownerType: 'profile', ownerId: profileId, mimeType: blob.type, sizeBytes: blob.size, width: 1, height: 1, blob, createdAt: timestamp, updatedAt: timestamp };
  const payload = createMediaMetadataPayload(accountId, profileId, media);
  const event: OutboxEvent = { id: syncRecordKey(accountId, 'media_metadata', mediaId), accountId, profileId, entityType: 'media_metadata', entityId: mediaId, operation: 'UPSERT', payload, createdAt: timestamp, attempts: 0 };
  return { media, event };
}

function fakeClient(log: string[]) {
  return {
    storage: { from: () => ({
      upload: async () => { log.push('storage-upload'); return { data: {}, error: null }; },
      download: async () => ({ data: null, error: { message: 'not found' } }),
      remove: async () => { log.push('storage-delete'); return { data: [], error: null }; },
    }) },
    from: () => ({ insert: (row: Record<string, unknown>) => ({ select: () => ({ single: async () => { log.push('metadata-write'); return { data: { ...row, updated_at: timestamp, revision: 1 }, error: null }; } }) }) }),
  };
}

describe('Supabase media gateway', () => {
  it('faz upload privado antes de confirmar metadata', async () => {
    const log: string[] = []; const { media, event } = fixture();
    await new SupabaseSyncGateway(fakeClient(log) as never, async () => media).push(event);
    expect(log).toEqual(['storage-upload', 'metadata-write']);
  });

  it('remove o objeto antes de confirmar o tombstone', async () => {
    const log: string[] = []; const { media, event } = fixture();
    await new SupabaseSyncGateway(fakeClient(log) as never, async () => media).push({ ...event, operation: 'DELETE' });
    expect(log).toEqual(['storage-delete', 'metadata-write']);
  });
});
