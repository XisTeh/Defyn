import { createUuid } from '../../shared/ids/create-uuid';

export const SYNC_STATES = ['LOCAL_ONLY', 'PENDING_UPLOAD', 'SYNCED', 'PENDING_DELETE', 'CONFLICT', 'ERROR'] as const;
export type SyncState = typeof SYNC_STATES[number];

export const OUTBOX_OPERATIONS = ['UPSERT', 'DELETE'] as const;
export type OutboxOperation = typeof OUTBOX_OPERATIONS[number];

export const SYNC_ENTITY_TYPES = [
  'accounts',
  'defyn_profiles',
  'account_preferences',
  'profile_settings',
  'nutrition_targets',
  'nutrition_summaries',
  'hydration_entries',
  'routine_days',
  'sleep_records',
  'training_plans',
  'workout_sessions',
  'workout_sets',
  'progress_records',
  'check_ins',
  'media_metadata',
] as const;

export type SyncEntityType = typeof SYNC_ENTITY_TYPES[number];
export type MutableSyncEntityType = Exclude<SyncEntityType, 'accounts'>;

export const PUSH_ORDER: readonly MutableSyncEntityType[] = [
  'defyn_profiles', 'account_preferences', 'profile_settings', 'nutrition_targets',
  'nutrition_summaries', 'hydration_entries', 'routine_days', 'sleep_records',
  'training_plans', 'workout_sessions', 'workout_sets', 'progress_records', 'check_ins',
  'media_metadata',
];

export const PULL_ORDER: readonly SyncEntityType[] = ['accounts', ...PUSH_ORDER];

export const APPEND_ONLY_ENTITY_TYPES: ReadonlySet<SyncEntityType> = new Set([
  'nutrition_summaries', 'hydration_entries', 'sleep_records', 'workout_sessions',
  'workout_sets', 'progress_records', 'check_ins',
]);

export interface SyncMetadata {
  id: string;
  accountId: string;
  entityType: string;
  entityId: string;
  state: SyncState;
  lastSyncedAt?: string;
  remoteRevision?: number;
  deletedAt?: string;
  syncError?: string;
  /** Snapshot remoto técnico usado para cache lazy de mídia; nunca contém o Blob. */
  remotePayload?: Record<string, unknown>;
}

export interface OutboxEvent {
  id: string;
  accountId: string;
  operation: OutboxOperation;
  entityType: MutableSyncEntityType;
  entityId: string;
  profileId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  nextAttemptAt?: string;
  lastAttemptAt?: string;
  lastError?: string;
}

export interface PullCursor {
  id?: string;
  accountId?: string;
  entityType?: SyncEntityType;
  updatedAt: string;
  entityId: string;
}

export interface SyncConflict {
  id: string;
  accountId: string;
  entityType: MutableSyncEntityType;
  entityId: string;
  profileId?: string;
  operation: OutboxOperation;
  localPayload: Record<string, unknown>;
  remotePayload: Record<string, unknown>;
  remoteRevision: number;
  remoteDeletedAt?: string;
  detectedAt: string;
}

export interface RemoteSyncRecord {
  id: string;
  account_id?: string;
  profile_id?: string;
  payload?: Record<string, unknown>;
  updated_at: string;
  deleted_at?: string | null;
  revision?: number;
  [key: string]: unknown;
}

export interface PushSuccess {
  status: 'success';
  record: RemoteSyncRecord;
}

export interface PushConflict {
  status: 'conflict';
  record: RemoteSyncRecord;
}

export type PushResult = PushSuccess | PushConflict;

export interface RemoteSyncGateway {
  push(event: OutboxEvent, expectedRevision?: number): Promise<PushResult>;
  pull(entityType: SyncEntityType, cursor: PullCursor | undefined, limit: number): Promise<RemoteSyncRecord[]>;
}

export type SyncRunState = 'idle' | 'syncing' | 'offline' | 'error' | 'conflict';

export interface SyncStatusSnapshot {
  state: SyncRunState;
  pendingCount: number;
  conflictCount: number;
  lastSyncedAt?: string;
  message?: string;
}

export interface RemoteOwnership {
  id: string;
  account_id: string;
  profile_id?: string;
}

export function createOfflineId(randomUuid: () => string = createUuid): string {
  const id = randomUuid();
  if (!isUuid(id)) throw new Error('O gerador de IDs precisa produzir UUID válido.');
  return id;
}

export function mapRemoteOwnership(accountId: string, entityId: string, profileId?: string): RemoteOwnership {
  if (!isUuid(accountId)) throw new Error('accountId precisa ser o UUID de auth.users.');
  if (!isUuid(entityId)) throw new Error('Entidades sincronizáveis precisam de UUID estável.');
  if (profileId !== undefined && !isUuid(profileId)) throw new Error('profileId sincronizável precisa ser UUID estável.');
  return { id: entityId, account_id: accountId, ...(profileId ? { profile_id: profileId } : {}) };
}

export function comparePullCursor(left: Pick<PullCursor, 'updatedAt' | 'entityId'>, right: Pick<PullCursor, 'updatedAt' | 'entityId'>): number {
  const timeComparison = left.updatedAt.localeCompare(right.updatedAt);
  return timeComparison === 0 ? left.entityId.localeCompare(right.entityId) : timeComparison;
}

export function syncRecordKey(accountId: string, entityType: string, entityId: string): string {
  return `${accountId}:${entityType}:${entityId}`;
}

export function retryDelayMs(attempts: number): number {
  return Math.min(5 * 60_000, 2_000 * (2 ** Math.max(0, attempts - 1)));
}

export function shouldCancelUnsyncedCreation(previous: OutboxEvent | undefined, metadata: SyncMetadata | undefined): boolean {
  return previous?.operation === 'UPSERT' && metadata?.remoteRevision === undefined;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
