import type { Transaction } from 'dexie';
import type { OutboxEvent, SyncConflict, SyncMetadata } from '../../application/sync/sync-contract';
import { isUuid, syncRecordKey } from '../../application/sync/sync-contract';
import type { RoutineDay } from '../../domain/routine/routine';
import { createUuid } from '../../shared/ids/create-uuid';

type MigrationTransaction = Pick<Transaction, 'table'>;

function remapPayloadId(payload: Record<string, unknown>, oldId: string, newId: string): Record<string, unknown> {
  return payload.id === oldId ? { ...payload, id: newId } : payload;
}

function nextUniqueUuid(existingIds: Set<string>, idFactory: () => string): string {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = idFactory();
    if (isUuid(candidate) && !existingIds.has(candidate)) {
      existingIds.add(candidate);
      return candidate;
    }
  }
  throw new Error('Não foi possível gerar um UUID único para reparar a rotina local.');
}

/** Repara a PK de routineDays e suas referências dentro da transaction v8 → v9. */
export async function migrateRoutineDayIdentityV9(
  transaction: MigrationTransaction,
  idFactory: () => string = createUuid,
): Promise<number> {
  const routineDays = transaction.table<RoutineDay, string>('routineDays');
  const syncOutbox = transaction.table<OutboxEvent, string>('syncOutbox');
  const syncMetadata = transaction.table<SyncMetadata, string>('syncMetadata');
  const syncConflicts = transaction.table<SyncConflict, string>('syncConflicts');
  const [days, outboxRows, metadataRows, conflictRows] = await Promise.all([
    routineDays.toArray(), syncOutbox.toArray(), syncMetadata.toArray(), syncConflicts.toArray(),
  ]);
  const existingIds = new Set([
    ...days.map((day) => day.id),
    ...outboxRows.filter((row) => row.entityType === 'routine_days').map((row) => row.entityId),
    ...metadataRows.filter((row) => row.entityType === 'routine_days').map((row) => row.entityId),
    ...conflictRows.filter((row) => row.entityType === 'routine_days').map((row) => row.entityId),
  ]);
  const legacyIds = new Set([
    ...days.map((day) => day.id),
    ...outboxRows.filter((row) => row.entityType === 'routine_days').map((row) => row.entityId),
    ...metadataRows.filter((row) => row.entityType === 'routine_days').map((row) => row.entityId),
    ...conflictRows.filter((row) => row.entityType === 'routine_days').map((row) => row.entityId),
  ].filter((id) => !isUuid(id)));

  for (const oldId of legacyIds) {
    const newId = nextUniqueUuid(existingIds, idFactory);
    const day = days.find((row) => row.id === oldId);
    if (day) {
      await routineDays.delete(oldId);
      await routineDays.put({ ...day, id: newId });
    }

    for (const event of outboxRows.filter((row) => row.entityType === 'routine_days' && row.entityId === oldId)) {
      const id = syncRecordKey(event.accountId, event.entityType, newId);
      await syncOutbox.delete(event.id);
      await syncOutbox.put({ ...event, id, entityId: newId, payload: remapPayloadId(event.payload, oldId, newId) });
    }
    for (const metadata of metadataRows.filter((row) => row.entityType === 'routine_days' && row.entityId === oldId)) {
      const id = syncRecordKey(metadata.accountId, metadata.entityType, newId);
      await syncMetadata.delete(metadata.id);
      await syncMetadata.put({ ...metadata, id, entityId: newId, remotePayload: metadata.remotePayload ? remapPayloadId(metadata.remotePayload, oldId, newId) : undefined });
    }
    for (const conflict of conflictRows.filter((row) => row.entityType === 'routine_days' && row.entityId === oldId)) {
      const id = syncRecordKey(conflict.accountId, conflict.entityType, newId);
      await syncConflicts.delete(conflict.id);
      await syncConflicts.put({
        ...conflict,
        id,
        entityId: newId,
        localPayload: remapPayloadId(conflict.localPayload, oldId, newId),
        remotePayload: remapPayloadId(conflict.remotePayload, oldId, newId),
      });
    }
  }
  return legacyIds.size;
}
