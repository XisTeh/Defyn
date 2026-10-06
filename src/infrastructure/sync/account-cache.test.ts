import { describe, expect, it } from 'vitest';
import type { DefynDatabase } from '../indexed-db/database';
import type { DefynBackupData } from '../../domain/export/export-format';
import { prepareLocalAccount } from './account-cache';
import { SYNC_ACTIVE_ACCOUNT_ID_KEY, SYNC_ENROLLMENT_ACCOUNT_ID_KEY, SYNC_INITIAL_PULL_COMPLETE_KEY } from './local-sync-state';

class MemoryTable {
  constructor(readonly name: string, public rows: Array<Record<string, unknown>> = []) {}
  private key(value: Record<string, unknown>) { return value.key ?? value.accountId ?? value.id; }
  get(key: string) { return Promise.resolve(structuredClone(this.rows.find((row) => this.key(row) === key))); }
  put(value: Record<string, unknown>) { this.rows = this.rows.filter((row) => this.key(row) !== this.key(value)).concat(structuredClone(value)); return Promise.resolve(); }
  delete(key: string) { this.rows = this.rows.filter((row) => this.key(row) !== key); return Promise.resolve(); }
  toArray() { return Promise.resolve(structuredClone(this.rows)); }
  count() { return Promise.resolve(this.rows.length); }
  clear() { this.rows = []; return Promise.resolve(); }
  bulkPut(values: Array<Record<string, unknown>>) { this.rows.push(...structuredClone(values)); return Promise.resolve(); }
}

function database() {
  const tables = Object.fromEntries(['profiles', 'preferences', 'media', 'syncOutbox', 'syncMetadata', 'syncCursors', 'syncConflicts', 'accountCaches'].map((name) => [name, new MemoryTable(name)])) as Record<string, MemoryTable>;
  const fake = { ...tables, tables: Object.values(tables), transaction: (_mode: string, _tables: unknown[], work: () => Promise<void>) => work() } as unknown as DefynDatabase;
  return { fake, tables };
}

describe('cache local por conta', () => {
  it('preserva dados, alterações pendentes e revisão ao alternar A → B → A', async () => {
    const { fake, tables } = database();
    const preferences = tables.preferences!;
    await preferences.put({ key: SYNC_ENROLLMENT_ACCOUNT_ID_KEY, value: 'account-a' });
    await preferences.put({ key: SYNC_INITIAL_PULL_COMPLETE_KEY, value: 'account-a' });
    await tables.profiles!.put({ id: 'profile-a', name: 'A' });
    await tables.syncOutbox!.put({ id: 'pending-a', accountId: 'account-a' });
    await tables.syncMetadata!.put({ id: 'pending-a', remoteRevision: 4 });

    await prepareLocalAccount(fake, 'account-b');
    expect(await tables.profiles!.toArray()).toEqual([]);
    expect(await tables.syncOutbox!.toArray()).toEqual([]);
    expect(await preferences.get(SYNC_ACTIVE_ACCOUNT_ID_KEY)).toMatchObject({ value: 'account-b' });
    await tables.profiles!.put({ id: 'profile-b', name: 'B' });
    await tables.syncOutbox!.put({ id: 'pending-b', accountId: 'account-b' });

    await prepareLocalAccount(fake, 'account-a');
    expect(await tables.profiles!.toArray()).toEqual([{ id: 'profile-a', name: 'A' }]);
    expect(await tables.syncOutbox!.toArray()).toEqual([{ id: 'pending-a', accountId: 'account-a' }]);
    expect(await tables.syncMetadata!.toArray()).toEqual([{ id: 'pending-a', remoteRevision: 4 }]);
    expect(await preferences.get(SYNC_INITIAL_PULL_COMPLETE_KEY)).toMatchObject({ value: 'account-a' });
    expect((await tables.accountCaches!.get('account-b'))?.tables).toMatchObject({ profiles: [{ id: 'profile-b', name: 'B' }], syncOutbox: [{ id: 'pending-b', accountId: 'account-b' }] });
  });

  it('restaura o cache criado pela versão anterior com suas preferências de sincronização', async () => {
    const { fake, tables } = database();
    await tables.preferences!.put({ key: SYNC_ACTIVE_ACCOUNT_ID_KEY, value: 'account-a' });
    await tables.accountCaches!.put({
      accountId: 'account-b', savedAt: '2026-10-06T00:00:00.000Z', enrolled: true, initialPullComplete: true,
      data: { profiles: [{ id: 'profile-b', name: 'B' }], preferences: [], media: [] } as unknown as DefynBackupData,
    });

    await prepareLocalAccount(fake, 'account-b');
    expect(await tables.profiles!.toArray()).toEqual([{ id: 'profile-b', name: 'B' }]);
    expect(await tables.preferences!.get(SYNC_ENROLLMENT_ACCOUNT_ID_KEY)).toMatchObject({ value: 'account-b' });
    expect(await tables.preferences!.get(SYNC_INITIAL_PULL_COMPLETE_KEY)).toMatchObject({ value: 'account-b' });
  });
});
