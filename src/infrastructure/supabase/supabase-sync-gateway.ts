import type { RemoteSyncGateway, OutboxEvent, PullCursor, PushResult, RemoteSyncRecord, SyncEntityType } from '../../application/sync/sync-contract';
import type { DefynSupabaseClient } from './client';
import { samePayload, toRemoteRow } from '../sync/sync-mapping';
import type { LocalMedia } from '../../domain/media/media';
import { MEDIA_BUCKET, parseMediaMetadataPayload, validateImageBlob } from '../../application/media/media-sync';

function remoteRecord(value: unknown): RemoteSyncRecord {
  if (!value || typeof value !== 'object') throw new Error('Resposta remota de sincronização inválida.');
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.updated_at !== 'string') throw new Error('Registro remoto sem cursor válido.');
  return {
    ...row,
    id: row.id,
    updated_at: row.updated_at,
    payload: row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload) ? row.payload as Record<string, unknown> : {},
    revision: typeof row.revision === 'number' ? row.revision : undefined,
    deleted_at: typeof row.deleted_at === 'string' ? row.deleted_at : null,
  };
}

function errorCode(error: unknown): string | undefined {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : undefined;
}

function errorMessage(error: unknown): string {
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'Falha na sincronização remota.';
}

export class SupabaseSyncGateway implements RemoteSyncGateway {
  constructor(private readonly client: DefynSupabaseClient, private readonly localMedia?: (id: string) => Promise<LocalMedia | undefined>) {}

  async push(event: OutboxEvent, expectedRevision?: number): Promise<PushResult> {
    if (event.entityType === 'media_metadata') await this.syncMediaObject(event, expectedRevision);
    return this.pushRow(event, expectedRevision);
  }

  private async pushRow(event: OutboxEvent, expectedRevision?: number): Promise<PushResult> {
    const row = toRemoteRow(event);
    const table = this.client.from(event.entityType);
    if (expectedRevision !== undefined) {
      const updated = await table.update(row as never).eq('id', event.entityId).eq('revision', expectedRevision).select('*').maybeSingle();
      if (updated.error) throw new Error(errorMessage(updated.error));
      if (updated.data) return { status: 'success', record: remoteRecord(updated.data) };
      const current = await this.fetchOne(event);
      if (current) return { status: 'conflict', record: current };
    }

    const inserted = await table.insert(row as never).select('*').single();
    if (!inserted.error) return { status: 'success', record: remoteRecord(inserted.data) };
    if (errorCode(inserted.error) !== '23505') throw new Error(errorMessage(inserted.error));
    const current = await this.fetchOne(event);
    if (!current) throw new Error('O registro remoto não pôde ser confirmado.');
    const expectedDeleted = event.operation === 'DELETE';
    if (samePayload(event.payload, current.payload ?? {}) && Boolean(current.deleted_at) === expectedDeleted) {
      return { status: 'success', record: current };
    }
    return { status: 'conflict', record: current };
  }

  private async syncMediaObject(event: OutboxEvent, expectedRevision?: number): Promise<void> {
    const payload = parseMediaMetadataPayload(event.payload);
    if (!payload.storagePath.startsWith(`${event.accountId}/${event.profileId}/`)) throw new Error('Caminho de mídia não pertence à sessão atual.');
    if (expectedRevision !== undefined) {
      const current = await this.fetchOne(event);
      if (current && current.revision !== expectedRevision) return;
    }
    if (event.operation === 'DELETE') {
      const removed = await this.client.storage.from(MEDIA_BUCKET).remove([payload.storagePath]);
      if (removed.error && !isMissingObject(removed.error)) throw new Error(errorMessage(removed.error));
      return;
    }
    const media = await this.localMedia?.(event.entityId);
    if (!media) throw new Error('A foto local necessária para o upload não foi encontrada.');
    await validateImageBlob(media.blob, payload.mimeType);
    if (media.blob.size !== payload.sizeBytes) throw new Error('A foto local não corresponde à metadata de sincronização.');
    const uploaded = await this.client.storage.from(MEDIA_BUCKET).upload(payload.storagePath, media.blob, { contentType: payload.mimeType, upsert: expectedRevision !== undefined, cacheControl: '3600' });
    if (!uploaded.error) return;
    const existing = await this.client.storage.from(MEDIA_BUCKET).download(payload.storagePath);
    if (existing.error || !existing.data) throw new Error(errorMessage(uploaded.error));
    await validateImageBlob(existing.data, payload.mimeType);
    if (existing.data.size !== payload.sizeBytes || !await sameBlobBytes(existing.data, media.blob)) throw new Error('Já existe um objeto diferente para esta mídia.');
  }

  async pull(entityType: SyncEntityType, cursor: PullCursor | undefined, limit: number): Promise<RemoteSyncRecord[]> {
    let query = this.client.from(entityType).select('*').order('updated_at', { ascending: true }).order('id', { ascending: true }).limit(limit);
    if (cursor) query = query.or(`updated_at.gt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.gt.${cursor.entityId})`);
    const result = await query;
    if (result.error) throw new Error(errorMessage(result.error));
    return (result.data ?? []).map(remoteRecord);
  }

  private async fetchOne(event: OutboxEvent): Promise<RemoteSyncRecord | undefined> {
    const result = await this.client.from(event.entityType).select('*').eq('id', event.entityId).maybeSingle();
    if (result.error) throw new Error(errorMessage(result.error));
    return result.data ? remoteRecord(result.data) : undefined;
  }
}

function isMissingObject(error: unknown): boolean {
  const normalized = errorMessage(error).toLowerCase();
  return normalized.includes('not found') || normalized.includes('does not exist') || normalized.includes('404');
}

async function sameBlobBytes(left: Blob, right: Blob): Promise<boolean> {
  const [leftBytes, rightBytes] = await Promise.all([left.arrayBuffer(), right.arrayBuffer()]);
  if (leftBytes.byteLength !== rightBytes.byteLength) return false;
  const a = new Uint8Array(leftBytes); const b = new Uint8Array(rightBytes);
  return a.every((value, index) => value === b[index]);
}
