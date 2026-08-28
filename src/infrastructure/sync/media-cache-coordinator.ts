import { MEDIA_BUCKET, parseMediaMetadataPayload, validateImageBlob } from '../../application/media/media-sync';
import { syncRecordKey } from '../../application/sync/sync-contract';
import type { LocalMedia } from '../../domain/media/media';
import type { DefynDatabase } from '../indexed-db/database';
import type { DefynSupabaseClient } from '../supabase/client';
import { MEDIA_CACHED_EVENT } from '../../application/media/media-events';

export class MediaCacheCoordinator {
  private readonly running = new Map<string, Promise<boolean>>();

  constructor(private readonly database: DefynDatabase, private readonly client: DefynSupabaseClient) {}

  async downloadAvatars(accountId: string): Promise<number> {
    const profiles = await this.database.profiles.toArray();
    return this.downloadMany(accountId, profiles.flatMap((profile) => profile.avatarMediaId ? [profile.avatarMediaId] : []), 3);
  }

  async downloadRecentPhotos(accountId: string, limit = 6): Promise<number> {
    const metadata = await this.database.syncMetadata.where('[accountId+entityType]').equals([accountId, 'media_metadata']).toArray();
    const ids = metadata
      .filter((item) => !item.deletedAt && item.remotePayload?.kind === 'progress-photo')
      .sort((left, right) => String(right.remotePayload?.updatedAt ?? '').localeCompare(String(left.remotePayload?.updatedAt ?? '')))
      .slice(0, limit)
      .map((item) => item.entityId);
    return this.downloadMany(accountId, ids, 3);
  }

  downloadOne(accountId: string, mediaId: string): Promise<boolean> {
    const existing = this.running.get(mediaId);
    if (existing) return existing;
    const operation = this.performDownload(accountId, mediaId).finally(() => this.running.delete(mediaId));
    this.running.set(mediaId, operation);
    return operation;
  }

  private async performDownload(accountId: string, mediaId: string): Promise<boolean> {
    const cached = await this.database.media.get(mediaId);
    if (cached) {
      await validateImageBlob(cached.blob, cached.mimeType);
      return false;
    }
    const metadata = await this.database.syncMetadata.get(syncRecordKey(accountId, 'media_metadata', mediaId));
    if (!metadata?.remotePayload || metadata.deletedAt) return false;
    const payload = parseMediaMetadataPayload(metadata.remotePayload);
    if (!payload.storagePath.startsWith(`${accountId}/${payload.profileId}/`)) throw new Error('Mídia remota fora da conta autenticada.');
    const downloaded = await this.client.storage.from(MEDIA_BUCKET).download(payload.storagePath);
    if (downloaded.error || !downloaded.data) throw new Error('Não foi possível baixar esta foto agora.');
    await validateImageBlob(downloaded.data, payload.mimeType);
    if (downloaded.data.size !== payload.sizeBytes) throw new Error('A foto baixada não corresponde à metadata protegida.');
    const media: LocalMedia = {
      id: payload.id,
      profileId: payload.profileId,
      kind: payload.kind,
      ownerType: payload.ownerType,
      ownerId: payload.ownerId,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
      width: payload.width,
      height: payload.height,
      blob: downloaded.data,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
    };
    try {
      await this.database.media.put(media);
    } catch (caught) {
      if (isQuotaError(caught)) throw new Error('Sem espaço local para manter esta foto offline. Nenhum arquivo foi apagado.', { cause: caught });
      throw caught;
    }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(MEDIA_CACHED_EVENT, { detail: { mediaId } }));
    return true;
  }

  private async downloadMany(accountId: string, mediaIds: string[], concurrency: number): Promise<number> {
    const queue = [...new Set(mediaIds)];
    let downloaded = 0;
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length) {
        const mediaId = queue.shift();
        if (mediaId && await this.downloadOne(accountId, mediaId)) downloaded += 1;
      }
    });
    await Promise.all(workers);
    return downloaded;
  }
}

function isQuotaError(caught: unknown): boolean {
  return caught instanceof DOMException && (caught.name === 'QuotaExceededError' || caught.name === 'NS_ERROR_DOM_QUOTA_REACHED');
}
