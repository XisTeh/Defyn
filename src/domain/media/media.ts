import type { AuditedEntity } from '../shared/types';

export type MediaKind = 'profile-avatar' | 'nutrition-label' | 'progress-photo' | 'food-photo' | 'exercise-image';

export interface LocalMedia extends AuditedEntity {
  /** Perfil proprietário. Opcional apenas para mídia criada antes do sync 1.1C. */
  profileId?: string;
  kind: MediaKind;
  ownerType: 'profile' | 'food' | 'progress' | 'exercise';
  ownerId?: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  blob: Blob;
}

export interface MediaRepository {
  getById(id: string): Promise<LocalMedia | undefined>;
  save(media: LocalMedia, profileId?: string): Promise<void>;
  remove(id: string, profileId?: string): Promise<void>;
  list(): Promise<LocalMedia[]>;
  removeOrphans(referencedIds: ReadonlySet<string>): Promise<number>;
}

export function findOrphanMediaIds(media: readonly Pick<LocalMedia, 'id'>[], referencedIds: ReadonlySet<string>): string[] {
  return media.filter((item) => !referencedIds.has(item.id)).map((item) => item.id);
}
