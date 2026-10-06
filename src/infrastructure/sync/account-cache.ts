import type { Table } from 'dexie';
import type { AccountLocalCache, CurrentAccountLocalCache, DefynDatabase, LegacyAccountLocalCache } from '../indexed-db/database';
import {
  LEGACY_LOCAL_OWNER_ACCOUNT_ID_KEY,
  SYNC_ACTIVE_ACCOUNT_ID_KEY,
  SYNC_ENROLLMENT_ACCOUNT_ID_KEY,
  SYNC_INITIAL_PULL_COMPLETE_KEY,
} from './local-sync-state';

function accountValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match?.[1] || !match[2]) throw new Error('Mídia inválida no cache local.');
  const binary = atob(match[2]);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: match[1] });
}

function legacyRows(cache: LegacyAccountLocalCache): Record<string, unknown[]> {
  const data = cache.data;
  const preferences = data.preferences.filter((item) => item.key !== LEGACY_LOCAL_OWNER_ACCOUNT_ID_KEY);
  if (cache.enrolled) preferences.push({ key: SYNC_ENROLLMENT_ACCOUNT_ID_KEY, value: cache.accountId });
  if (cache.initialPullComplete) preferences.push({ key: SYNC_INITIAL_PULL_COMPLETE_KEY, value: cache.accountId });
  return {
    ...data,
    preferences,
    media: data.media.map(({ dataUrl, ...item }) => ({ ...item, blob: dataUrlToBlob(dataUrl) })),
  };
}

function cacheRows(cache: AccountLocalCache): Record<string, unknown[]> {
  return 'tables' in cache ? cache.tables : legacyRows(cache);
}

/** Keeps account data and its pending sync state in one IndexedDB transaction. */
export async function prepareLocalAccount(database: DefynDatabase, accountId: string): Promise<void> {
  const workingTables = database.tables.filter((table) => table.name !== 'accountCaches');
  await database.transaction('rw', database.tables, async () => {
    const [active, enrollment, legacyOwner] = await Promise.all([
      database.preferences.get(SYNC_ACTIVE_ACCOUNT_ID_KEY),
      database.preferences.get(SYNC_ENROLLMENT_ACCOUNT_ID_KEY),
      database.preferences.get(LEGACY_LOCAL_OWNER_ACCOUNT_ID_KEY),
    ]);
    const previousAccountId = accountValue(active?.value) ?? accountValue(enrollment?.value) ?? accountValue(legacyOwner?.value);

    if (previousAccountId && previousAccountId !== accountId) {
      const rows = await Promise.all(workingTables.map(async (table) => [table.name, await table.toArray()] as const));
      const snapshot: CurrentAccountLocalCache = { accountId: previousAccountId, tables: Object.fromEntries(rows), savedAt: new Date().toISOString() };
      await database.accountCaches.put(snapshot);
      await Promise.all(workingTables.map((table) => table.clear()));
      await restoreCache(database, workingTables, accountId);
    } else if (!previousAccountId) {
      // A browser interrupted during the old cache swap can have no active marker.
      const hasWorkingData = (await Promise.all(workingTables.filter((table) => table.name !== 'preferences').map((table) => table.count()))).some((count) => count > 0);
      if (!hasWorkingData && await database.accountCaches.get(accountId)) {
        await Promise.all(workingTables.map((table) => table.clear()));
        await restoreCache(database, workingTables, accountId);
      }
    }

    await database.preferences.put({ key: SYNC_ACTIVE_ACCOUNT_ID_KEY, value: accountId });
    await database.preferences.delete(LEGACY_LOCAL_OWNER_ACCOUNT_ID_KEY);
  });
}

async function restoreCache(database: DefynDatabase, workingTables: Table[], accountId: string): Promise<void> {
  const cache = await database.accountCaches.get(accountId);
  if (!cache) return;
  const rows = cacheRows(cache);
  for (const table of workingTables) {
    const values = rows[table.name];
    if (values?.length) await table.bulkPut(values as never[]);
  }
}
