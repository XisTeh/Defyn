import { mapRemoteOwnership, type OutboxEvent, type RemoteSyncRecord, type SyncEntityType } from '../../application/sync/sync-contract';
import { TRAINING_DAYS } from '../../domain/training/training';

function stringValue(payload: Record<string, unknown>, key: string): string | undefined {
  return typeof payload[key] === 'string' ? payload[key] : undefined;
}

function numberValue(payload: Record<string, unknown>, key: string): number | undefined {
  return typeof payload[key] === 'number' ? payload[key] : undefined;
}

export function toRemoteRow(event: OutboxEvent): Record<string, unknown> {
  const payload = event.payload;
  const base: Record<string, unknown> = {
    ...mapRemoteOwnership(event.accountId, event.entityId, event.profileId),
    payload,
    created_at: stringValue(payload, 'createdAt') ?? event.createdAt,
    deleted_at: event.operation === 'DELETE' ? event.createdAt : null,
  };
  switch (event.entityType) {
    case 'defyn_profiles': return { ...base, name: stringValue(payload, 'name') ?? 'Perfil DEFYN' };
    case 'account_preferences': return { ...base, preference_key: stringValue(payload, 'key') ?? event.entityId };
    case 'nutrition_targets': return { ...base, starts_at: stringValue(payload, 'startsAt'), ends_at: stringValue(payload, 'endsAt') ?? null };
    case 'nutrition_summaries': return { ...base, local_date: stringValue(payload, 'localDate') };
    case 'hydration_entries': return { ...base, local_date: stringValue(payload, 'localDate'), occurred_at: stringValue(payload, 'occurredAt'), amount_ml: numberValue(payload, 'amountMl') ?? 0 };
    case 'routine_days': return { ...base, day_of_week: Math.max(0, TRAINING_DAYS.indexOf(stringValue(payload, 'dayOfWeek') as typeof TRAINING_DAYS[number])) };
    case 'sleep_records': return { ...base, local_date: stringValue(payload, 'localDate'), sleep_started_at: stringValue(payload, 'sleepStartedAt'), woke_at: stringValue(payload, 'wokeAt') };
    case 'training_plans': return { ...base, status: stringValue(payload, 'status') ?? 'active' };
    case 'workout_sessions': return { ...base, plan_id: stringValue(payload, 'planId') ?? null, local_date: stringValue(payload, 'localDate'), status: stringValue(payload, 'status') ?? 'active', started_at: stringValue(payload, 'startedAt') ?? null, completed_at: stringValue(payload, 'completedAt') ?? null };
    case 'workout_sets': return { ...base, session_id: stringValue(payload, 'sessionId'), exercise_id: stringValue(payload, 'exerciseId'), set_index: numberValue(payload, 'setIndex') ?? 0 };
    case 'progress_records': return { ...base, local_date: stringValue(payload, 'localDate'), occurred_at: stringValue(payload, 'occurredAt'), weight_kg: numberValue(payload, 'weightKg') ?? null, measurements: payload.measurements ?? null };
    case 'check_ins': return { ...base, local_date: stringValue(payload, 'localDate') };
    case 'media_metadata': return {
      ...base,
      kind: stringValue(payload, 'kind') ?? 'progress-photo',
      storage_path: stringValue(payload, 'storagePath'),
      mime_type: stringValue(payload, 'mimeType') ?? null,
    };
    case 'profile_settings': return base;
  }
}

export function payloadFromRemote(entityType: SyncEntityType, record: RemoteSyncRecord): Record<string, unknown> {
  const payload = { ...(record.payload ?? {}) };
  if (!('id' in payload)) payload.id = record.id;
  if (!('updatedAt' in payload)) payload.updatedAt = record.updated_at;
  if (!('createdAt' in payload)) payload.createdAt = typeof record.created_at === 'string' ? record.created_at : record.updated_at;
  if (!('profileId' in payload) && typeof record.profile_id === 'string') payload.profileId = record.profile_id;
  if (entityType === 'defyn_profiles' && !('name' in payload) && typeof record.name === 'string') payload.name = record.name;
  if (entityType === 'media_metadata') {
    if (!('kind' in payload) && typeof record.kind === 'string') payload.kind = record.kind;
    if (!('storagePath' in payload) && typeof record.storage_path === 'string') payload.storagePath = record.storage_path;
    if (!('mimeType' in payload) && typeof record.mime_type === 'string') payload.mimeType = record.mime_type;
  }
  return payload;
}

export function samePayload(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  return stableJson(left) === stableJson(right);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
