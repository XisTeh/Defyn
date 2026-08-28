import type { LocalMedia, MediaKind } from '../../domain/media/media';
import type { ProgressPhotoMetadata } from '../../domain/progress/progress';

export const MEDIA_BUCKET = 'defyn-media';
export const MAX_SYNC_MEDIA_BYTES = 15 * 1024 * 1024;
export const SYNC_MEDIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type SyncMediaMimeType = typeof SYNC_MEDIA_MIME_TYPES[number];

const extensionByMime: Record<SyncMediaMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface MediaMetadataPayload extends Record<string, unknown> {
  id: string;
  profileId: string;
  kind: MediaKind;
  ownerType: LocalMedia['ownerType'];
  ownerId?: string;
  storagePath: string;
  mimeType: SyncMediaMimeType;
  sizeBytes: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
  progressPhoto?: ProgressPhotoMetadata;
}

export function isSyncMediaMimeType(value: unknown): value is SyncMediaMimeType {
  return typeof value === 'string' && SYNC_MEDIA_MIME_TYPES.includes(value as SyncMediaMimeType);
}

export function mediaStoragePath(accountId: string, profileId: string, mediaId: string, mimeType: SyncMediaMimeType): string {
  if (![accountId, profileId, mediaId].every(isSafePathSegment)) throw new Error('Identificador de mídia inválido.');
  return `${accountId}/${profileId}/${mediaId}.${extensionByMime[mimeType]}`;
}

export function createMediaMetadataPayload(
  accountId: string,
  profileId: string,
  media: LocalMedia,
  progressPhoto?: ProgressPhotoMetadata,
): MediaMetadataPayload {
  if (!isSyncMediaMimeType(media.mimeType)) throw new Error('Formato de mídia não permitido para sincronização.');
  if (media.sizeBytes !== media.blob.size || media.sizeBytes <= 0 || media.sizeBytes > MAX_SYNC_MEDIA_BYTES) throw new Error('Tamanho de mídia inválido para sincronização.');
  return {
    id: media.id,
    profileId,
    kind: media.kind,
    ownerType: media.ownerType,
    ownerId: media.ownerId,
    storagePath: mediaStoragePath(accountId, profileId, media.id, media.mimeType),
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes,
    width: media.width,
    height: media.height,
    createdAt: media.createdAt,
    updatedAt: media.updatedAt,
    progressPhoto,
  };
}

export function parseMediaMetadataPayload(value: Record<string, unknown>): MediaMetadataPayload {
  const kind = value.kind;
  const ownerType = value.ownerType;
  if (
    typeof value.id !== 'string' || typeof value.profileId !== 'string' ||
    !isMediaKind(kind) || !isOwnerType(ownerType) || !isSyncMediaMimeType(value.mimeType) ||
    typeof value.storagePath !== 'string' || typeof value.sizeBytes !== 'number' ||
    typeof value.width !== 'number' || typeof value.height !== 'number' ||
    typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string'
  ) throw new Error('Metadata de mídia inválida.');
  const expectedPath = mediaStoragePath(value.storagePath.split('/')[0] ?? '', value.profileId, value.id, value.mimeType);
  if (expectedPath !== value.storagePath) throw new Error('Caminho de mídia inválido.');
  return value as MediaMetadataPayload;
}

export async function validateImageBlob(blob: Blob, expectedMime?: string): Promise<SyncMediaMimeType> {
  if (blob.size <= 0 || blob.size > MAX_SYNC_MEDIA_BYTES) throw new Error('Arquivo de mídia vazio ou acima do limite permitido.');
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const detected = detectMime(bytes);
  if (!detected || !isSyncMediaMimeType(blob.type) || blob.type !== detected || (expectedMime && expectedMime !== detected)) {
    throw new Error('O conteúdo da mídia não corresponde a JPEG, PNG ou WebP válido.');
  }
  return detected;
}

function detectMime(bytes: Uint8Array): SyncMediaMimeType | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'image/webp';
  return undefined;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

function isSafePathSegment(value: string): boolean {
  return /^[0-9a-f-]{20,}$/i.test(value) && !value.includes('/') && !value.includes('..');
}

function isMediaKind(value: unknown): value is MediaKind {
  return ['profile-avatar', 'progress-photo'].includes(String(value));
}

function isOwnerType(value: unknown): value is LocalMedia['ownerType'] {
  return value === 'profile' || value === 'progress';
}
