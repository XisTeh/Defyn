import { describe, expect, it } from 'vitest';
import { createMediaMetadataPayload } from '../../application/media/media-sync';
import { syncRecordKey } from '../../application/sync/sync-contract';
import type { LocalMedia } from '../../domain/media/media';
import { MediaCacheCoordinator } from './media-cache-coordinator';

const accountId = '11111111-1111-4111-8111-111111111111';
const profileId = '22222222-2222-4222-8222-222222222222';
const mediaId = '33333333-3333-4333-8333-333333333333';
const timestamp = '2026-08-27T12:00:00.000Z';

function setup() {
  const blob = new Blob([Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])], { type: 'image/png' });
  const source: LocalMedia = { id: mediaId, profileId, kind: 'progress-photo', ownerType: 'progress', ownerId: mediaId, mimeType: blob.type, sizeBytes: blob.size, width: 1, height: 1, blob, createdAt: timestamp, updatedAt: timestamp };
  const cache = new Map<string, LocalMedia>(); let downloads = 0;
  const payload = createMediaMetadataPayload(accountId, profileId, source);
  const database = {
    media: { get: (id: string) => Promise.resolve(cache.get(id)), put: (value: LocalMedia) => { cache.set(value.id, value); return Promise.resolve(value.id); } },
    syncMetadata: { get: () => Promise.resolve({ id: syncRecordKey(accountId, 'media_metadata', mediaId), accountId, entityType: 'media_metadata', entityId: mediaId, state: 'SYNCED', remotePayload: payload }) },
  };
  const client = { storage: { from: () => ({ download: async () => { downloads += 1; return { data: blob, error: null }; } }) } };
  return { cache, coordinator: new MediaCacheCoordinator(database as never, client as never), downloads: () => downloads };
}

describe('cache offline de mídia', () => {
  it('baixa, valida e persiste o Blob local', async () => { const value = setup(); await expect(value.coordinator.downloadOne(accountId, mediaId)).resolves.toBe(true); expect(value.cache.get(mediaId)?.blob.size).toBe(8); expect(value.downloads()).toBe(1); });
  it('reabre do cache sem novo download', async () => { const value = setup(); await value.coordinator.downloadOne(accountId, mediaId); await expect(value.coordinator.downloadOne(accountId, mediaId)).resolves.toBe(false); expect(value.downloads()).toBe(1); });
});
