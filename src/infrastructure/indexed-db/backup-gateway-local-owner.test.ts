import { describe, expect, it } from 'vitest';
import type { DefynBackupData } from '../../domain/export/export-format';
import { LEGACY_LOCAL_OWNER_ACCOUNT_ID_KEY, SYNC_ENROLLMENT_ACCOUNT_ID_KEY } from '../sync/local-sync-state';
import { IndexedDbBackupGateway } from './backup-gateway';
import type { DefynDatabase } from './database';

class FakeTable<T> {
  constructor(public rows: T[] = []) {}
  toArray() { return Promise.resolve(structuredClone(this.rows)); }
  get(key: string) { return Promise.resolve(this.rows.find((row) => (row as { key?: string }).key === key)); }
  clear() { this.rows = []; return Promise.resolve(); }
  bulkPut(rows: T[]) { this.rows.push(...structuredClone(rows)); return Promise.resolve(); }
  put(row: T) {
    const item = row as { key?: string };
    this.rows = this.rows.filter((current) => (current as { key?: string }).key !== item.key).concat(structuredClone(row));
    return Promise.resolve();
  }
}

const tableNames = [
  'profiles', 'nutritionTargets', 'foods', 'recipes', 'diaryEntries', 'mealCategories', 'waterEntries',
  'progressRecords', 'progressPhotos', 'preferences', 'foodPreferences', 'favoriteMeals', 'media',
  'trainingProfiles', 'exercises', 'exerciseFavorites', 'workoutPlans', 'workoutSessions', 'workoutSetLogs',
  'dailyNutritionSummaries', 'routineProfiles', 'routineDays', 'sleepRecords', 'reminderSnoozes',
  'syncOutbox', 'syncMetadata', 'syncCursors', 'syncConflicts', 'accountCaches',
] as const;

function fakeDatabase() {
  const database: Record<string, unknown> = { transaction: (_mode: string, _tables: unknown[], work: () => Promise<void>) => work() };
  for (const name of tableNames) database[name] = new FakeTable();
  return database as unknown as DefynDatabase;
}

function emptyData(): DefynBackupData {
  return {
    profiles: [], nutritionTargets: [], foods: [], recipes: [], diaryEntries: [], mealCategories: [], waterEntries: [],
    progressRecords: [], progressPhotos: [], preferences: [], foodPreferences: [], favoriteMeals: [], media: [],
    trainingProfiles: [], exercises: [], exerciseFavorites: [], workoutPlans: [], workoutSessions: [], workoutSetLogs: [],
    dailyNutritionSummaries: [], routineProfiles: [], routineDays: [], sleepRecords: [], reminderSnoozes: [],
  };
}

describe('backup e estado técnico local', () => {
  it('não exporta preferências técnicas no JSON', async () => {
    const database = fakeDatabase();
    const preferences = database.preferences as unknown as FakeTable<{ key: string; value: string }>;
    preferences.rows = [
      { key: LEGACY_LOCAL_OWNER_ACCOUNT_ID_KEY, value: 'account-a' },
      { key: SYNC_ENROLLMENT_ACCOUNT_ID_KEY, value: 'account-a' },
      { key: 'activeProfileId', value: 'profile-a' },
    ];
    const exported = await new IndexedDbBackupGateway(database).readAll();
    expect(exported.preferences).toEqual([{ key: 'activeProfileId', value: 'profile-a' }]);
  });

  it('restauração descarta preferências técnicas vindas do backup', async () => {
    const database = fakeDatabase();
    const preferences = database.preferences as unknown as FakeTable<{ key: string; value: string }>;
    const data = emptyData();
    data.preferences = [
      { key: LEGACY_LOCAL_OWNER_ACCOUNT_ID_KEY, value: 'account-b' },
      { key: SYNC_ENROLLMENT_ACCOUNT_ID_KEY, value: 'account-b' },
      { key: 'activeProfileId', value: 'profile-a' },
    ];
    await new IndexedDbBackupGateway(database).replaceAll(data);
    expect(await preferences.get(LEGACY_LOCAL_OWNER_ACCOUNT_ID_KEY)).toBeUndefined();
    expect(await preferences.get(SYNC_ENROLLMENT_ACCOUNT_ID_KEY)).toBeUndefined();
    expect(await preferences.get('activeProfileId')).toEqual({ key: 'activeProfileId', value: 'profile-a' });
  });

  it('reset local remove os caches de todas as contas', async () => {
    const database = fakeDatabase();
    const caches = database.accountCaches as unknown as FakeTable<{ accountId: string }>;
    caches.rows = [{ accountId: 'account-a' }];
    await new IndexedDbBackupGateway(database).clearAll();
    expect(await caches.toArray()).toEqual([]);
  });
});
