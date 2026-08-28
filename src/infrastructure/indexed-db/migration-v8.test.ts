import type { Transaction } from 'dexie';
import { describe, expect, it } from 'vitest';
import { SyncEngine, type LocalSyncGateway } from '../../application/sync/sync-engine';
import { isUuid, syncRecordKey, type OutboxEvent, type SyncConflict, type SyncMetadata } from '../../application/sync/sync-contract';
import type { RemoteSyncGateway } from '../../application/sync/sync-contract';
import type { RoutineDay } from '../../domain/routine/routine';
import { DATABASE_VERSION, DefynDatabase } from './database';
import { migrateRoutineDayIdentityV9 } from './migration-v9';

const accountId = '11111111-1111-4111-8111-111111111111';
const profileId = '22222222-2222-4222-8222-222222222222';
const legacyId = `${profileId}:friday`;
const repairedId = '33333333-3333-4333-8333-333333333333';

class MemoryTable<T extends { id: string }> {
  constructor(public rows: T[]) {}
  toArray() { return Promise.resolve(structuredClone(this.rows)); }
  delete(id: string) { this.rows = this.rows.filter((row) => row.id !== id); return Promise.resolve(); }
  put(value: T) { this.rows = this.rows.filter((row) => row.id !== value.id).concat(structuredClone(value)); return Promise.resolve(value.id); }
}

describe('migration v8 → v9', () => {
  it('mantém o schema aditivo e eleva o IndexedDB para v9', () => {
    expect(DATABASE_VERSION).toBe(9);
    const database = new DefynDatabase();
    const schema = database.tables.map((table) => table.name);
    expect(schema).toEqual(expect.arrayContaining(['profiles', 'foods', 'recipes', 'syncOutbox', 'syncMetadata', 'syncCursors', 'syncConflicts']));
    database.close();
  });

  it('repara rotina, outbox, metadata e conflito sem alterar outras entidades', async () => {
    const timestamp = '2026-08-28T10:00:00.000Z';
    const day: RoutineDay = { id: legacyId, profileId, dayOfWeek: 'friday', wakeTime: '07:00', sleepTime: '23:00', isRestDay: true, createdAt: timestamp, updatedAt: timestamp };
    const oldKey = syncRecordKey(accountId, 'routine_days', legacyId);
    const outbox = new MemoryTable<OutboxEvent>([
      { id: oldKey, accountId, entityType: 'routine_days', entityId: legacyId, profileId, operation: 'UPSERT', payload: { ...day }, createdAt: timestamp, attempts: 2, lastError: 'legacy' },
      { id: 'unrelated', accountId, entityType: 'hydration_entries', entityId: repairedId, profileId, operation: 'UPSERT', payload: { id: repairedId }, createdAt: timestamp, attempts: 0 },
    ]);
    const orphanLegacyId = `${profileId}:sunday`;
    const metadata = new MemoryTable<SyncMetadata>([
      { id: oldKey, accountId, entityType: 'routine_days', entityId: legacyId, state: 'ERROR', syncError: 'legacy' },
      { id: syncRecordKey(accountId, 'routine_days', orphanLegacyId), accountId, entityType: 'routine_days', entityId: orphanLegacyId, state: 'PENDING_DELETE' },
    ]);
    const conflicts = new MemoryTable<SyncConflict>([{ id: oldKey, accountId, entityType: 'routine_days', entityId: legacyId, profileId, operation: 'UPSERT', localPayload: { ...day }, remotePayload: { id: legacyId, profileId, dayOfWeek: 'friday' }, remoteRevision: 1, detectedAt: timestamp }]);
    const days = new MemoryTable<RoutineDay>([day]);
    const tables = new Map<string, MemoryTable<{ id: string }>>([
      ['routineDays', days as MemoryTable<{ id: string }>],
      ['syncOutbox', outbox as MemoryTable<{ id: string }>],
      ['syncMetadata', metadata as MemoryTable<{ id: string }>],
      ['syncConflicts', conflicts as MemoryTable<{ id: string }>],
    ]);
    const transaction = { table: (name: string) => tables.get(name)! } as unknown as Pick<Transaction, 'table'>;

    const generated = [repairedId, '44444444-4444-4444-8444-444444444444'];
    expect(await migrateRoutineDayIdentityV9(transaction, () => generated.shift()!)).toBe(2);
    expect(days.rows).toEqual([{ ...day, id: repairedId }]);
    expect(isUuid(days.rows[0]!.id)).toBe(true);
    const newKey = syncRecordKey(accountId, 'routine_days', repairedId);
    expect(outbox.rows.find((row) => row.id === newKey)).toMatchObject({ entityId: repairedId, payload: { id: repairedId, wakeTime: '07:00' }, attempts: 2 });
    expect(metadata.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: newKey, entityId: repairedId, state: 'ERROR' }),
      expect.objectContaining({ entityId: '44444444-4444-4444-8444-444444444444', state: 'PENDING_DELETE' }),
    ]));
    expect(conflicts.rows).toEqual([expect.objectContaining({ id: newKey, entityId: repairedId, localPayload: expect.objectContaining({ id: repairedId }), remotePayload: expect.objectContaining({ id: repairedId }) })]);
    expect(outbox.rows.find((row) => row.id === 'unrelated')).toMatchObject({ entityType: 'hydration_entries', entityId: repairedId });
    expect(outbox.rows.some((row) => row.entityId === legacyId)).toBe(false);
    expect(await migrateRoutineDayIdentityV9(transaction, () => { throw new Error('não deve gerar outro ID'); })).toBe(0);

    const local = {
      listPending: () => Promise.resolve(outbox.rows.filter((row) => row.entityType === 'routine_days')),
      getMetadata: (_accountId: string, entityType: string, entityId: string) => Promise.resolve(metadata.rows.find((row) => row.id === syncRecordKey(accountId, entityType, entityId))),
      markPushSucceeded: async (event: OutboxEvent) => { await outbox.delete(event.id); },
      markPushFailed: () => Promise.resolve(),
      preserveConflict: () => Promise.resolve(),
      getCursor: () => Promise.resolve(undefined),
      applyPulled: () => Promise.resolve('ignored' as const),
      saveCursor: () => Promise.resolve(),
      status: () => Promise.resolve({ pendingCount: outbox.rows.length, conflictCount: 0 }),
    } as LocalSyncGateway;
    const remote = {
      push: async (event: OutboxEvent) => {
        expect(isUuid(event.entityId)).toBe(true);
        expect(event.payload.id).toBe(event.entityId);
        return { status: 'success' as const, record: { id: event.entityId, account_id: event.accountId, profile_id: event.profileId, payload: event.payload, revision: 1, updated_at: timestamp, deleted_at: null } };
      },
      pull: () => Promise.resolve([]),
    } as RemoteSyncGateway;
    const retry = await new SyncEngine(local, remote, () => new Date(timestamp)).run(accountId);
    expect(retry.pushed).toBe(1);
    expect(outbox.rows.filter((row) => row.entityType === 'routine_days')).toHaveLength(0);
  });
});
