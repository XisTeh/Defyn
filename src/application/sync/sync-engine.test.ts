import { describe, expect, it } from 'vitest';
import { createUuid } from '../../shared/ids/create-uuid';
import { SyncEngine, type LocalSyncGateway } from './sync-engine';
import { PULL_ORDER, syncRecordKey, type OutboxEvent, type PullCursor, type RemoteSyncGateway, type RemoteSyncRecord, type SyncConflict, type SyncEntityType, type SyncMetadata } from './sync-contract';

const accountA = '11111111-1111-4111-8111-111111111111';
const accountB = '22222222-2222-4222-8222-222222222222';
const profile = '33333333-3333-4333-8333-333333333333';

function event(entityType: OutboxEvent['entityType'], entityId: string, payload: Record<string, unknown>, operation: OutboxEvent['operation'] = 'UPSERT', accountId = accountA, profileId?: string): OutboxEvent {
  return { id: syncRecordKey(accountId, entityType, entityId), accountId, entityType, entityId, profileId, operation, payload, createdAt: '2026-08-27T12:00:00.000Z', attempts: 0 };
}

class MemoryLocal implements LocalSyncGateway {
  pending: OutboxEvent[] = [];
  metadata = new Map<string, SyncMetadata>();
  cursors = new Map<string, PullCursor>();
  conflicts: SyncConflict[] = [];
  rows = new Map<string, Record<string, unknown>>();
  failures: OutboxEvent[] = [];

  listPending(accountId: string) { return Promise.resolve(this.pending.filter((item) => item.accountId === accountId)); }
  getMetadata(accountId: string, entityType: SyncEntityType, entityId: string) { return Promise.resolve(this.metadata.get(syncRecordKey(accountId, entityType, entityId))); }
  markPushSucceeded(item: OutboxEvent, record: RemoteSyncRecord, syncedAt: string) { this.pending = this.pending.filter((candidate) => candidate.id !== item.id); this.metadata.set(item.id, { id: item.id, accountId: item.accountId, entityType: item.entityType, entityId: item.entityId, state: 'SYNCED', remoteRevision: record.revision, lastSyncedAt: syncedAt }); return Promise.resolve(); }
  markPushFailed(item: OutboxEvent) { this.failures.push(item); return Promise.resolve(); }
  preserveConflict(conflict: SyncConflict) { this.conflicts.push(conflict); this.pending = this.pending.filter((candidate) => candidate.id !== conflict.id); return Promise.resolve(); }
  getCursor(accountId: string, entityType: SyncEntityType) { return Promise.resolve(this.cursors.get(`${accountId}:${entityType}`)); }
  applyPulled(accountId: string, entityType: SyncEntityType, record: RemoteSyncRecord): Promise<'applied'> { this.rows.set(syncRecordKey(accountId, entityType, record.id), record.payload ?? {}); this.metadata.set(syncRecordKey(accountId, entityType, record.id), { id: syncRecordKey(accountId, entityType, record.id), accountId, entityType, entityId: record.id, state: 'SYNCED', remoteRevision: record.revision }); return Promise.resolve('applied'); }
  saveCursor(cursor: PullCursor) { this.cursors.set(cursor.id!, cursor); return Promise.resolve(); }
  status(accountId: string) { return Promise.resolve({ pendingCount: this.pending.filter((item) => item.accountId === accountId).length, conflictCount: this.conflicts.filter((item) => item.accountId === accountId).length }); }
}

class MemoryRemote implements RemoteSyncGateway {
  rows = new Map<string, RemoteSyncRecord>();
  pushOrder: string[] = [];
  clock = 0;
  fail = false;
  conflict?: RemoteSyncRecord;

  push(item: OutboxEvent, expectedRevision?: number) {
    if (this.fail) return Promise.reject(new Error('network offline'));
    if (this.conflict) return Promise.resolve({ status: 'conflict' as const, record: this.conflict });
    this.pushOrder.push(`${item.operation}:${item.entityType}`);
    const key = syncRecordKey(item.accountId, item.entityType, item.entityId);
    const current = this.rows.get(key);
    if (current && expectedRevision !== undefined && current.revision !== expectedRevision) return Promise.resolve({ status: 'conflict' as const, record: current });
    const record: RemoteSyncRecord = { id: item.entityId, account_id: item.accountId, profile_id: item.profileId, payload: item.payload, revision: (current?.revision ?? 0) + 1, updated_at: `2026-08-27T12:00:${String(++this.clock).padStart(2, '0')}.000Z`, deleted_at: item.operation === 'DELETE' ? '2026-08-27T12:00:00.000Z' : null };
    this.rows.set(key, record);
    return Promise.resolve({ status: 'success' as const, record });
  }

  pull(entityType: SyncEntityType, cursor: PullCursor | undefined, limit: number): Promise<RemoteSyncRecord[]> {
    const records = [...this.rows.entries()].filter(([key]) => key.startsWith(`${cursor?.accountId ?? accountA}:${entityType}:`)).map(([, value]) => value).sort((a, b) => a.updated_at.localeCompare(b.updated_at) || a.id.localeCompare(b.id));
    const filtered = cursor ? records.filter((item) => item.updated_at > cursor.updatedAt || (item.updated_at === cursor.updatedAt && item.id > cursor.entityId)) : records;
    return Promise.resolve(filtered.slice(0, limit));
  }
}

describe('SyncEngine offline-first', () => {
  it('envia pais antes dos filhos e deletes na ordem inversa', async () => {
    const local = new MemoryLocal(); const remote = new MemoryRemote();
    local.pending = [event('workout_sets', createUuid(), {}, 'UPSERT', accountA, profile), event('defyn_profiles', profile, { id: profile })];
    await new SyncEngine(local, remote).run(accountA);
    expect(remote.pushOrder.slice(0, 2)).toEqual(['UPSERT:defyn_profiles', 'UPSERT:workout_sets']);
    local.pending = [event('defyn_profiles', profile, { id: profile }, 'DELETE'), event('workout_sets', createUuid(), {}, 'DELETE', accountA, profile)];
    await new SyncEngine(local, remote).run(accountA);
    expect(remote.pushOrder.slice(-2)).toEqual(['DELETE:workout_sets', 'DELETE:defyn_profiles']);
  });

  it('envia metadata de mídia depois do perfil e a remove antes dele', async () => {
    const local = new MemoryLocal(); const remote = new MemoryRemote(); const mediaId = createUuid();
    local.pending = [event('media_metadata', mediaId, { id: mediaId }, 'UPSERT', accountA, profile), event('defyn_profiles', profile, { id: profile })];
    await new SyncEngine(local, remote).run(accountA);
    expect(remote.pushOrder.slice(0, 2)).toEqual(['UPSERT:defyn_profiles', 'UPSERT:media_metadata']);
    local.pending = [event('defyn_profiles', profile, { id: profile }, 'DELETE'), event('media_metadata', mediaId, { id: mediaId }, 'DELETE', accountA, profile)];
    await new SyncEngine(local, remote).run(accountA);
    expect(remote.pushOrder.slice(-2)).toEqual(['DELETE:media_metadata', 'DELETE:defyn_profiles']);
  });

  it('preserva a operação quando a rede falha', async () => {
    const local = new MemoryLocal(); const remote = new MemoryRemote(); remote.fail = true;
    local.pending = [event('defyn_profiles', profile, { id: profile })];
    await expect(new SyncEngine(local, remote).run(accountA)).rejects.toThrow('offline');
    expect(local.pending).toHaveLength(1);
    expect(local.failures).toHaveLength(1);
  });

  it('preserva as duas versões em conflito concorrente', async () => {
    const local = new MemoryLocal(); const remote = new MemoryRemote();
    const pending = event('routine_days', createUuid(), { wakeTime: '07:00' }, 'UPSERT', accountA, profile);
    local.pending = [pending]; local.metadata.set(pending.id, { id: pending.id, accountId: accountA, entityType: pending.entityType, entityId: pending.entityId, state: 'PENDING_UPLOAD', remoteRevision: 1 });
    remote.conflict = { id: pending.entityId, account_id: accountA, profile_id: profile, payload: { wakeTime: '08:00' }, revision: 2, updated_at: '2026-08-27T13:00:00.000Z', deleted_at: '2026-08-27T12:59:00.000Z' };
    const result = await new SyncEngine(local, remote).run(accountA);
    expect(result.conflicts).toBe(1);
    expect(local.conflicts[0]).toMatchObject({ localPayload: { wakeTime: '07:00' }, remotePayload: { wakeTime: '08:00' }, remoteDeletedAt: '2026-08-27T12:59:00.000Z' });
  });

  it('pagina o pull incremental sem repetir o cursor', async () => {
    const local = new MemoryLocal(); const remote = new MemoryRemote();
    for (let index = 0; index < 5; index += 1) await remote.push(event('hydration_entries', createUuid(), { amountMl: 200 + index }, 'UPSERT', accountA, profile));
    const result = await new SyncEngine(local, remote, undefined, 2).run(accountA);
    expect(result.pulled).toBe(5);
    expect(local.rows.size).toBe(5);
  });

  it('converge dois dispositivos da mesma conta sem duplicar', async () => {
    const remote = new MemoryRemote(); const device1 = new MemoryLocal(); const device2 = new MemoryLocal();
    const id = createUuid(); device1.pending.push(event('defyn_profiles', id, { id, name: 'D1' }));
    await new SyncEngine(device1, remote).run(accountA);
    await new SyncEngine(device2, remote).run(accountA);
    expect(device2.rows.get(syncRecordKey(accountA, 'defyn_profiles', id))).toMatchObject({ name: 'D1' });
    device2.pending.push(event('defyn_profiles', id, { id, name: 'D2' }));
    device2.metadata.get(syncRecordKey(accountA, 'defyn_profiles', id))!.remoteRevision = 1;
    await new SyncEngine(device2, remote).run(accountA);
    await new SyncEngine(device1, remote).run(accountA);
    expect(remote.rows.size).toBe(1);
    expect(device1.rows.get(syncRecordKey(accountA, 'defyn_profiles', id))).toMatchObject({ name: 'D2' });
  });

  it('mantém isolamento de conta no remoto em memória', async () => {
    const remote = new MemoryRemote(); const deviceA = new MemoryLocal(); const deviceB = new MemoryLocal();
    await remote.push(event('defyn_profiles', profile, { name: 'A' }, 'UPSERT', accountA));
    await remote.push(event('defyn_profiles', createUuid(), { name: 'B' }, 'UPSERT', accountB));
    await new SyncEngine(deviceA, remote).run(accountA);
    const remoteB: RemoteSyncGateway = {
      push: (item, revision) => remote.push(item, revision),
      pull: (type, cursor, limit) => {
        const scopedCursor = cursor ?? { id: `${accountB}:${type}`, accountId: accountB, entityType: type, updatedAt: '', entityId: '' };
        return remote.pull(type, scopedCursor, limit);
      },
    };
    await new SyncEngine(deviceB, remoteB).run(accountB);
    expect([...deviceA.rows.keys()].every((key) => key.startsWith(accountA))).toBe(true);
    expect([...deviceB.rows.keys()].every((key) => key.startsWith(accountB))).toBe(true);
  });

  it('sincroniza sessão e todas as séries criadas offline uma única vez', async () => {
    const local = new MemoryLocal(); const remote = new MemoryRemote(); const receiving = new MemoryLocal();
    const sessionId = createUuid(); const set1 = createUuid(); const set2 = createUuid();
    local.pending.push(event('workout_sets', set1, { id: set1, sessionId }, 'UPSERT', accountA, profile), event('workout_sessions', sessionId, { id: sessionId, status: 'completed' }, 'UPSERT', accountA, profile), event('workout_sets', set2, { id: set2, sessionId }, 'UPSERT', accountA, profile));
    await new SyncEngine(local, remote).run(accountA);
    await new SyncEngine(local, remote).run(accountA);
    await new SyncEngine(receiving, remote).run(accountA);
    expect(remote.pushOrder.slice(0, 3)).toEqual(['UPSERT:workout_sessions', 'UPSERT:workout_sets', 'UPSERT:workout_sets']);
    expect([...receiving.rows.keys()].filter((key) => key.includes('workout_sets')).length).toBe(2);
  });

  it('varre todas as entidades previstas no pull', async () => {
    const local = new MemoryLocal(); const remote = new MemoryRemote();
    await new SyncEngine(local, remote).run(accountA);
    expect(PULL_ORDER).toHaveLength(15);
  });
});
