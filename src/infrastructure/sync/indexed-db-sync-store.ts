import type { Table } from 'dexie';
import type {
  LocalSyncGateway,
} from '../../application/sync/sync-engine';
import {
  isUuid,
  shouldCancelUnsyncedCreation,
  syncRecordKey,
  type MutableSyncEntityType,
  type OutboxEvent,
  type PullCursor,
  type RemoteSyncRecord,
  type SyncConflict,
  type SyncEntityType,
  type SyncMetadata,
} from '../../application/sync/sync-contract';
import { LOCAL_OWNER_ACCOUNT_ID_KEY, isInstallationOnlyPreference } from '../../application/auth/local-installation-ownership';
import type { DefynDatabase } from '../indexed-db/database';
import { payloadFromRemote, samePayload } from './sync-mapping';
import { createMediaMetadataPayload } from '../../application/media/media-sync';
import type { ProgressPhotoMetadata } from '../../domain/progress/progress';

export const SYNC_ENROLLMENT_ACCOUNT_ID_KEY = 'sync:enrollmentAccountId';
export const SYNC_LAST_SUCCESS_AT_KEY = 'sync:lastSuccessAt';
export const SYNC_INITIAL_PULL_COMPLETE_KEY = 'sync:initialPullCompleteAccountId';

type SyncableRecord = { id: string; createdAt?: string; updatedAt?: string; profileId?: string };

function recordPayload(value: object): Record<string, unknown> {
  return value as unknown as Record<string, unknown>;
}

function notifyMutation(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('defyn:local-mutation'));
}

export async function enrolledSyncAccount(database: DefynDatabase): Promise<string | undefined> {
  const [owner, enrollment] = await Promise.all([
    database.preferences.get(LOCAL_OWNER_ACCOUNT_ID_KEY),
    database.preferences.get(SYNC_ENROLLMENT_ACCOUNT_ID_KEY),
  ]);
  return typeof owner?.value === 'string' && owner.value === enrollment?.value ? owner.value : undefined;
}

export async function enqueueSyncMutation(
  database: DefynDatabase,
  accountId: string,
  entityType: MutableSyncEntityType,
  entityId: string,
  payload: Record<string, unknown>,
  operation: 'UPSERT' | 'DELETE',
  profileId?: string,
): Promise<void> {
  const id = syncRecordKey(accountId, entityType, entityId);
  const previous = await database.syncOutbox.get(id);
  const metadata = await database.syncMetadata.get(id);
  const createdAt = new Date().toISOString();
  if (operation === 'DELETE' && shouldCancelUnsyncedCreation(previous, metadata)) {
    await database.syncOutbox.delete(id);
    await database.syncMetadata.delete(id);
    return;
  }
  await database.syncOutbox.put({
    id, accountId, entityType, entityId, operation, profileId, payload,
    createdAt: operation === 'DELETE' ? createdAt : previous?.createdAt ?? createdAt,
    attempts: 0,
  });
  await database.syncMetadata.put({
    id, accountId, entityType, entityId,
    state: operation === 'DELETE' ? 'PENDING_DELETE' : 'PENDING_UPLOAD',
    remoteRevision: metadata?.remoteRevision,
    lastSyncedAt: metadata?.lastSyncedAt,
    deletedAt: operation === 'DELETE' ? createdAt : undefined,
  });
}

export async function saveSyncable<T extends SyncableRecord, TInsert>(
  database: DefynDatabase,
  table: Table<T, string, TInsert>,
  entityType: MutableSyncEntityType,
  value: T,
  profileId = value.profileId,
): Promise<void> {
  await database.transaction('rw', [table, database.preferences, database.syncOutbox, database.syncMetadata], async () => {
    await table.put(value as unknown as TInsert);
    const accountId = await enrolledSyncAccount(database);
    if (accountId) await enqueueSyncMutation(database, accountId, entityType, value.id, recordPayload(value), 'UPSERT', profileId);
  });
  notifyMutation();
}

export async function removeSyncable<T extends SyncableRecord, TInsert>(
  database: DefynDatabase,
  table: Table<T, string, TInsert>,
  entityType: MutableSyncEntityType,
  entityId: string,
  profileId?: string,
): Promise<void> {
  await database.transaction('rw', [table, database.preferences, database.syncOutbox, database.syncMetadata], async () => {
    const existing = await table.get(entityId);
    if (!existing) return;
    await table.delete(entityId);
    const accountId = await enrolledSyncAccount(database);
    if (accountId) await enqueueSyncMutation(database, accountId, entityType, entityId, recordPayload(existing), 'DELETE', profileId ?? existing.profileId);
  });
  notifyMutation();
}

export async function saveProfileSettings<T extends SyncableRecord, TInsert>(
  database: DefynDatabase,
  table: Table<T, string, TInsert>,
  value: T,
): Promise<void> {
  await database.transaction('rw', [table, database.trainingProfiles, database.routineProfiles, database.preferences, database.syncOutbox, database.syncMetadata], async () => {
    await table.put(value as unknown as TInsert);
    const accountId = await enrolledSyncAccount(database);
    if (!accountId || !value.profileId) return;
    const [trainingProfile, routineProfile] = await Promise.all([
      database.trainingProfiles.where('profileId').equals(value.profileId).first(),
      database.routineProfiles.where('profileId').equals(value.profileId).first(),
    ]);
    const payload = { id: value.profileId, profileId: value.profileId, trainingProfile, routineProfile, createdAt: value.createdAt, updatedAt: value.updatedAt };
    await enqueueSyncMutation(database, accountId, 'profile_settings', value.profileId, recordPayload(payload), 'UPSERT', value.profileId);
  });
  notifyMutation();
}

export async function saveAccountPreference(database: DefynDatabase, key: string, value: string | number | boolean): Promise<void> {
  await database.transaction('rw', [database.preferences, database.syncOutbox, database.syncMetadata], async () => {
    await database.preferences.put({ key, value });
    const accountId = await enrolledSyncAccount(database);
    if (!accountId || isInstallationOnlyPreference(key)) return;
    const timestamp = new Date().toISOString();
    await enqueueSyncMutation(database, accountId, 'account_preferences', accountId, { id: accountId, key, value, createdAt: timestamp, updatedAt: timestamp }, 'UPSERT');
  });
  notifyMutation();
}

export async function removeAccountPreference(database: DefynDatabase, key: string): Promise<void> {
  await database.transaction('rw', [database.preferences, database.syncOutbox, database.syncMetadata], async () => {
    const existing = await database.preferences.get(key);
    await database.preferences.delete(key);
    const accountId = await enrolledSyncAccount(database);
    if (!accountId || !existing || isInstallationOnlyPreference(key)) return;
    const timestamp = new Date().toISOString();
    await enqueueSyncMutation(database, accountId, 'account_preferences', accountId, { id: accountId, key, value: existing.value, createdAt: timestamp, updatedAt: timestamp }, 'DELETE');
  });
  notifyMutation();
}

export interface BootstrapSummary {
  profiles: number;
  settings: number;
  nutritionTargets: number;
  nutritionSummaries: number;
  hydration: number;
  routineDays: number;
  sleep: number;
  trainingPlans: number;
  workoutSessions: number;
  workoutSets: number;
  progressRecords: number;
  checkIns: number;
  photos: number;
  total: number;
}

export class IndexedDbSyncStore implements LocalSyncGateway {
  constructor(private readonly database: DefynDatabase) {}

  async isEnrolled(accountId: string): Promise<boolean> {
    return (await enrolledSyncAccount(this.database)) === accountId;
  }

  async hasSyncableData(): Promise<boolean> {
    const summary = await this.bootstrapSummary();
    return summary.total > 0;
  }

  async bootstrapSummary(): Promise<BootstrapSummary> {
    const [profiles, nutritionTargets, nutritionSummaries, hydration, routineDays, sleep, trainingPlans, workoutSessions, workoutSets, records, media] = await Promise.all([
      this.database.profiles.count(),
      this.database.nutritionTargets.count(), this.database.dailyNutritionSummaries.count(), this.database.waterEntries.count(),
      this.database.routineDays.count(), this.database.sleepRecords.count(), this.database.workoutPlans.count(),
      this.database.workoutSessions.count(), this.database.workoutSetLogs.count(), this.database.progressRecords.toArray(),
      this.database.media.filter((item) => item.kind === 'profile-avatar' || item.kind === 'progress-photo').count(),
    ]);
    const progressRecords = records.filter((item) => item.source !== 'check-in').length;
    const checkIns = records.length - progressRecords;
    const settings = new Set([
      ...(await this.database.trainingProfiles.toArray()).map((item) => item.profileId),
      ...(await this.database.routineProfiles.toArray()).map((item) => item.profileId),
    ]).size;
    const total = profiles + settings + nutritionTargets + nutritionSummaries + hydration + routineDays + sleep + trainingPlans + workoutSessions + workoutSets + records.length + media;
    return { profiles, settings, nutritionTargets, nutritionSummaries, hydration, routineDays, sleep, trainingPlans, workoutSessions, workoutSets, progressRecords, checkIns, photos: media, total };
  }

  async activateEmptyInstallation(accountId: string): Promise<void> {
    await this.validateOwner(accountId);
    await this.database.preferences.put({ key: SYNC_ENROLLMENT_ACCOUNT_ID_KEY, value: accountId });
  }

  async isInitialPullComplete(accountId: string): Promise<boolean> {
    return (await this.database.preferences.get(SYNC_INITIAL_PULL_COMPLETE_KEY))?.value === accountId;
  }

  async markInitialPullComplete(accountId: string): Promise<void> {
    await this.validateOwner(accountId);
    await this.database.preferences.put({ key: SYNC_INITIAL_PULL_COMPLETE_KEY, value: accountId });
  }

  async bootstrapUpload(accountId: string): Promise<number> {
    await this.validateOwner(accountId);
    const profiles = await this.database.profiles.toArray();
    const invalidProfile = profiles.find((item) => !isUuid(item.id));
    if (invalidProfile) throw new Error('Há um perfil legado com ID incompatível. Exporte um backup antes de migrá-lo.');
    const collections: Array<{ entityType: MutableSyncEntityType; values: SyncableRecord[] }> = [
      { entityType: 'defyn_profiles', values: profiles },
      { entityType: 'nutrition_targets', values: await this.database.nutritionTargets.toArray() },
      { entityType: 'nutrition_summaries', values: await this.database.dailyNutritionSummaries.toArray() },
      { entityType: 'hydration_entries', values: await this.database.waterEntries.toArray() },
      { entityType: 'routine_days', values: await this.database.routineDays.toArray() },
      { entityType: 'sleep_records', values: await this.database.sleepRecords.toArray() },
      { entityType: 'training_plans', values: await this.database.workoutPlans.toArray() },
      { entityType: 'workout_sessions', values: await this.database.workoutSessions.toArray() },
      { entityType: 'workout_sets', values: await this.database.workoutSetLogs.toArray() },
    ];
    const activeProfile = await this.database.preferences.get('activeProfileId');
    if (typeof activeProfile?.value === 'string') {
      const timestamp = new Date().toISOString();
      collections.splice(1, 0, { entityType: 'account_preferences', values: [{ id: accountId, createdAt: timestamp, updatedAt: timestamp, ...recordPayload({ key: 'activeProfileId', value: activeProfile.value }) }] });
    }
    const progress = await this.database.progressRecords.toArray();
    collections.push(
      { entityType: 'progress_records', values: progress.filter((item) => item.source !== 'check-in') },
      { entityType: 'check_ins', values: progress.filter((item) => item.source === 'check-in') },
    );
    const progressPhotos = await this.database.progressPhotos.toArray();
    const progressPhotoByMediaId = new Map(progressPhotos.filter((item) => item.mediaId).map((item) => [item.mediaId!, item]));
    const profileByAvatarId = new Map(profiles.filter((item) => item.avatarMediaId).map((item) => [item.avatarMediaId!, item.id]));
    const mediaItems = (await this.database.media.toArray()).filter((item) => item.kind === 'profile-avatar' || item.kind === 'progress-photo');
    const mediaValues: SyncableRecord[] = mediaItems.map((media) => {
      const photo = progressPhotoByMediaId.get(media.id);
      const profileId = media.profileId ?? (media.kind === 'profile-avatar' ? profileByAvatarId.get(media.id) ?? media.ownerId : photo?.profileId);
      if (!profileId || !profiles.some((profile) => profile.id === profileId)) throw new Error('Há uma foto local sem perfil proprietário válido.');
      return createMediaMetadataPayload(accountId, profileId, media, photo);
    });
    collections.push({ entityType: 'media_metadata', values: mediaValues });
    const settingsProfileIds = new Set([
      ...(await this.database.trainingProfiles.toArray()).map((item) => item.profileId),
      ...(await this.database.routineProfiles.toArray()).map((item) => item.profileId),
    ]);
    const settings: SyncableRecord[] = [];
    for (const profileId of settingsProfileIds) {
      const [trainingProfile, routineProfile] = await Promise.all([
        this.database.trainingProfiles.where('profileId').equals(profileId).first(),
        this.database.routineProfiles.where('profileId').equals(profileId).first(),
      ]);
      const timestamps = [trainingProfile, routineProfile].filter((item): item is NonNullable<typeof item> => Boolean(item));
      settings.push({ id: profileId, profileId, createdAt: timestamps[0]?.createdAt, updatedAt: timestamps.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0]?.updatedAt, ...recordPayload({ trainingProfile, routineProfile }) });
    }
    collections.splice(1, 0, { entityType: 'profile_settings', values: settings });
    const all = collections.flatMap(({ entityType, values }) => values.map((value) => ({ entityType, value })));
    const invalid = all.find(({ value }) => !isUuid(value.id) || (value.profileId && !isUuid(value.profileId)));
    if (invalid) throw new Error('Há dados legados com IDs incompatíveis. Exporte um backup antes de migrá-los.');

    await this.database.transaction('rw', [this.database.preferences, this.database.syncOutbox, this.database.syncMetadata], async () => {
      await this.database.preferences.put({ key: SYNC_ENROLLMENT_ACCOUNT_ID_KEY, value: accountId });
      for (const { entityType, value } of all) {
        await enqueueSyncMutation(this.database, accountId, entityType, value.id, recordPayload(value), 'UPSERT', value.profileId);
      }
    });
    notifyMutation();
    return all.length;
  }

  async listPending(accountId: string, now: string): Promise<OutboxEvent[]> {
    return this.database.syncOutbox.where('accountId').equals(accountId).filter((item) => !item.nextAttemptAt || item.nextAttemptAt <= now).toArray();
  }

  getMetadata(accountId: string, entityType: SyncEntityType, entityId: string): Promise<SyncMetadata | undefined> {
    return this.database.syncMetadata.get(syncRecordKey(accountId, entityType, entityId));
  }

  async markPushSucceeded(event: OutboxEvent, record: RemoteSyncRecord, syncedAt: string): Promise<void> {
    await this.database.transaction('rw', [this.database.syncOutbox, this.database.syncMetadata, this.database.preferences, this.database.media], async () => {
      await this.database.syncOutbox.delete(event.id);
      if (event.entityType === 'media_metadata' && event.operation === 'DELETE') await this.database.media.delete(event.entityId);
      await this.database.syncMetadata.put({ id: event.id, accountId: event.accountId, entityType: event.entityType, entityId: event.entityId, state: 'SYNCED', remoteRevision: record.revision, lastSyncedAt: syncedAt, deletedAt: record.deleted_at ?? undefined, remotePayload: event.entityType === 'media_metadata' ? payloadFromRemote(event.entityType, record) : undefined });
      await this.database.preferences.put({ key: SYNC_LAST_SUCCESS_AT_KEY, value: syncedAt });
    });
  }

  async markPushFailed(event: OutboxEvent, error: string, nextAttemptAt: string): Promise<void> {
    const attempts = event.attempts + 1;
    await this.database.transaction('rw', [this.database.syncOutbox, this.database.syncMetadata], async () => {
      await this.database.syncOutbox.put({ ...event, attempts, lastAttemptAt: new Date().toISOString(), nextAttemptAt, lastError: error });
      const metadata = await this.database.syncMetadata.get(event.id);
      await this.database.syncMetadata.put({ id: event.id, accountId: event.accountId, entityType: event.entityType, entityId: event.entityId, state: attempts >= 5 ? 'ERROR' : metadata?.state ?? 'PENDING_UPLOAD', remoteRevision: metadata?.remoteRevision, lastSyncedAt: metadata?.lastSyncedAt, syncError: error, remotePayload: metadata?.remotePayload, deletedAt: metadata?.deletedAt });
    });
  }

  async preserveConflict(conflict: SyncConflict): Promise<void> {
    await this.database.transaction('rw', [this.database.syncOutbox, this.database.syncMetadata, this.database.syncConflicts], async () => {
      await this.database.syncOutbox.delete(conflict.id);
      await this.database.syncConflicts.put(conflict);
      const metadata = await this.database.syncMetadata.get(conflict.id);
      await this.database.syncMetadata.put({ id: conflict.id, accountId: conflict.accountId, entityType: conflict.entityType, entityId: conflict.entityId, state: 'CONFLICT', remoteRevision: conflict.remoteRevision, lastSyncedAt: metadata?.lastSyncedAt, syncError: 'Alterado em outro dispositivo.', remotePayload: conflict.entityType === 'media_metadata' ? conflict.remotePayload : metadata?.remotePayload, deletedAt: conflict.remoteDeletedAt });
    });
  }

  getCursor(accountId: string, entityType: SyncEntityType): Promise<PullCursor | undefined> {
    return this.database.syncCursors.get(`${accountId}:${entityType}`);
  }

  async applyPulled(accountId: string, entityType: SyncEntityType, record: RemoteSyncRecord): Promise<'applied' | 'ignored' | 'conflict'> {
    if (entityType === 'accounts') return 'ignored';
    const key = syncRecordKey(accountId, entityType, record.id);
    const pending = await this.database.syncOutbox.get(key);
    const metadata = await this.database.syncMetadata.get(key);
    const payload = payloadFromRemote(entityType, record);
    if (entityType === 'workout_sessions') {
      const localSession = await this.database.workoutSessions.get(record.id);
      if (localSession?.status === 'active' && !samePayload(recordPayload(localSession), payload)) {
        await this.preserveConflict({ id: key, accountId, entityType, entityId: record.id, profileId: record.profile_id, operation: 'UPSERT', localPayload: recordPayload(localSession), remotePayload: payload, remoteRevision: record.revision ?? 1, detectedAt: new Date().toISOString() });
        return 'conflict';
      }
    }
    if (pending && (record.revision ?? 0) > (metadata?.remoteRevision ?? 0) && !samePayload(pending.payload, payload)) {
      await this.preserveConflict({ id: key, accountId, entityType, entityId: record.id, profileId: record.profile_id, operation: pending.operation, localPayload: pending.payload, remotePayload: payload, remoteRevision: record.revision ?? 1, remoteDeletedAt: record.deleted_at ?? undefined, detectedAt: new Date().toISOString() });
      return 'conflict';
    }
    if (pending) return 'ignored';
    await this.database.transaction('rw', this.pullTables(entityType), async () => {
      if (record.deleted_at) await this.deleteLocal(entityType, record.id, payload);
      else await this.putLocal(entityType, payload);
      await this.database.syncMetadata.put({ id: key, accountId, entityType, entityId: record.id, state: 'SYNCED', remoteRevision: record.revision, lastSyncedAt: new Date().toISOString(), deletedAt: record.deleted_at ?? undefined, remotePayload: entityType === 'media_metadata' ? payload : undefined });
    });
    return 'applied';
  }

  async saveCursor(cursor: PullCursor): Promise<void> {
    if (!cursor.id) throw new Error('Cursor local sem identificador.');
    await this.database.syncCursors.put(cursor);
  }

  async status(accountId: string) {
    const [pendingCount, conflictCount, last] = await Promise.all([
      this.database.syncOutbox.where('accountId').equals(accountId).count(),
      this.database.syncConflicts.where('accountId').equals(accountId).count(),
      this.database.preferences.get(SYNC_LAST_SUCCESS_AT_KEY),
    ]);
    return { pendingCount, conflictCount, lastSyncedAt: typeof last?.value === 'string' ? last.value : undefined };
  }

  listConflicts(accountId: string): Promise<SyncConflict[]> { return this.database.syncConflicts.where('accountId').equals(accountId).sortBy('detectedAt'); }

  async resolveConflict(conflictId: string, choice: 'local' | 'remote'): Promise<void> {
    const conflict = await this.database.syncConflicts.get(conflictId);
    if (!conflict) return;
    if (choice === 'local') {
      await this.database.transaction('rw', [this.database.syncConflicts, this.database.syncOutbox, this.database.syncMetadata], async () => {
        await this.database.syncConflicts.delete(conflictId);
        await enqueueSyncMutation(this.database, conflict.accountId, conflict.entityType, conflict.entityId, conflict.localPayload, conflict.operation, conflict.profileId);
        const metadata = await this.database.syncMetadata.get(conflictId);
        if (metadata) await this.database.syncMetadata.put({ ...metadata, remoteRevision: conflict.remoteRevision });
      });
    } else {
      await this.database.transaction('rw', this.pullTables(conflict.entityType), async () => {
        await this.database.syncConflicts.delete(conflictId);
        if (conflict.remoteDeletedAt) await this.deleteLocal(conflict.entityType, conflict.entityId, conflict.remotePayload);
        else await this.putLocal(conflict.entityType, conflict.remotePayload);
        await this.database.syncMetadata.put({ id: conflict.id, accountId: conflict.accountId, entityType: conflict.entityType, entityId: conflict.entityId, state: 'SYNCED', remoteRevision: conflict.remoteRevision, lastSyncedAt: new Date().toISOString(), remotePayload: conflict.entityType === 'media_metadata' ? conflict.remotePayload : undefined, deletedAt: conflict.remoteDeletedAt });
      });
    }
    notifyMutation();
  }

  async pendingCount(accountId: string): Promise<number> { return this.database.syncOutbox.where('accountId').equals(accountId).count(); }

  async retryNow(accountId: string): Promise<void> {
    await this.database.syncOutbox.where('accountId').equals(accountId).modify((event) => {
      delete event.nextAttemptAt;
      delete event.lastError;
    });
  }

  private async validateOwner(accountId: string): Promise<void> {
    const owner = await this.database.preferences.get(LOCAL_OWNER_ACCOUNT_ID_KEY);
    if (owner?.value !== accountId) throw new Error('A conta autenticada não é proprietária dos dados locais.');
  }

  private pullTables(entityType: SyncEntityType): Table[] {
    const common: Table[] = [this.database.syncMetadata, this.database.syncConflicts];
    if (entityType === 'profile_settings') return [...common, this.database.trainingProfiles, this.database.routineProfiles];
    if (entityType === 'account_preferences') return [...common, this.database.preferences];
    if (entityType === 'accounts') return common;
    if (entityType === 'media_metadata') return [...common, this.database.media, this.database.progressPhotos];
    return [...common, this.localTable(entityType)];
  }

  private localTable(entityType: Exclude<SyncEntityType, 'accounts' | 'account_preferences' | 'profile_settings' | 'media_metadata'>): Table<Record<string, unknown>, string> {
    const names = {
      defyn_profiles: 'profiles', nutrition_targets: 'nutritionTargets', nutrition_summaries: 'dailyNutritionSummaries',
      hydration_entries: 'waterEntries', routine_days: 'routineDays', sleep_records: 'sleepRecords',
      training_plans: 'workoutPlans', workout_sessions: 'workoutSessions', workout_sets: 'workoutSetLogs',
      progress_records: 'progressRecords', check_ins: 'progressRecords',
    } as const;
    return this.database.table(names[entityType]);
  }

  private async putLocal(entityType: Exclude<SyncEntityType, 'accounts'>, payload: Record<string, unknown>): Promise<void> {
    if (entityType === 'account_preferences') {
      if (typeof payload.key === 'string' && !isInstallationOnlyPreference(payload.key) && ['string', 'number', 'boolean'].includes(typeof payload.value)) {
        await this.database.preferences.put({ key: payload.key, value: payload.value as string | number | boolean });
      }
      return;
    }
    if (entityType === 'profile_settings') {
      if (payload.trainingProfile && typeof payload.trainingProfile === 'object') await this.database.trainingProfiles.put(payload.trainingProfile as never);
      if (payload.routineProfile && typeof payload.routineProfile === 'object') await this.database.routineProfiles.put(payload.routineProfile as never);
      return;
    }
    if (entityType === 'media_metadata') {
      const photo = payload.progressPhoto;
      if (photo && typeof photo === 'object' && !Array.isArray(photo)) await this.database.progressPhotos.put(photo as ProgressPhotoMetadata);
      return;
    }
    await this.localTable(entityType).put(payload);
  }

  private async deleteLocal(entityType: Exclude<SyncEntityType, 'accounts'>, entityId: string, payload: Record<string, unknown>): Promise<void> {
    if (entityType === 'account_preferences') {
      if (typeof payload.key === 'string' && !isInstallationOnlyPreference(payload.key)) await this.database.preferences.delete(payload.key);
      return;
    }
    if (entityType === 'profile_settings') {
      await this.database.trainingProfiles.where('profileId').equals(entityId).delete();
      await this.database.routineProfiles.where('profileId').equals(entityId).delete();
      return;
    }
    if (entityType === 'media_metadata') {
      await this.database.media.delete(entityId);
      const photo = payload.progressPhoto;
      if (photo && typeof photo === 'object' && !Array.isArray(photo) && typeof (photo as Record<string, unknown>).id === 'string') await this.database.progressPhotos.delete((photo as Record<string, unknown>).id as string);
      else await this.database.progressPhotos.where('mediaId').equals(entityId).delete();
      return;
    }
    await this.localTable(entityType).delete(entityId);
  }
}
