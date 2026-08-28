import { describe, expect, it } from 'vitest';
import type { DefynBackupData } from '../../domain/export/export-format';
import { LOCAL_OWNER_ACCOUNT_ID_KEY } from '../../application/auth/local-installation-ownership';
import { IndexedDbBackupGateway } from './backup-gateway';
import type { DefynDatabase } from './database';

class FakeTable<T extends { key?: string }> {
  constructor(public rows: T[] = []) {}
  toArray() { return Promise.resolve(structuredClone(this.rows)); }
  get(key: string) { return Promise.resolve(this.rows.find((row) => row.key === key)); }
  clear() { this.rows = []; return Promise.resolve(); }
  bulkPut(rows: T[]) { this.rows.push(...structuredClone(rows)); return Promise.resolve(); }
  put(row: T) { this.rows = this.rows.filter((item) => item.key !== row.key).concat(structuredClone(row)); return Promise.resolve(); }
}

const tableNames = [
  'profiles', 'nutritionTargets', 'foods', 'recipes', 'diaryEntries', 'mealCategories', 'waterEntries',
  'progressRecords', 'progressPhotos', 'preferences', 'foodPreferences', 'favoriteMeals', 'media',
  'trainingProfiles', 'exercises', 'exerciseFavorites', 'workoutPlans', 'workoutSessions', 'workoutSetLogs',
  'dailyNutritionSummaries', 'routineProfiles', 'routineDays', 'sleepRecords', 'reminderSnoozes',
  'syncOutbox', 'syncMetadata', 'syncCursors', 'syncConflicts',
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

describe('backup e ownership da instalação', () => {
  it('não exporta localOwnerAccountId no JSON', async () => {
    const database = fakeDatabase();
    const preferences = database.preferences as unknown as FakeTable<{ key: string; value: string }>;
    preferences.rows = [{ key: LOCAL_OWNER_ACCOUNT_ID_KEY, value: 'account-a' }, { key: 'activeProfileId', value: 'profile-a' }];
    const exported = await new IndexedDbBackupGateway(database).readAll();
    expect(exported.preferences).toEqual([{ key: 'activeProfileId', value: 'profile-a' }]);
  });

  it('restauração preserva o owner da instalação e rejeita owner vindo do backup', async () => {
    const database = fakeDatabase();
    const preferences = database.preferences as unknown as FakeTable<{ key: string; value: string }>;
    preferences.rows = [{ key: LOCAL_OWNER_ACCOUNT_ID_KEY, value: 'account-a' }];
    const data = emptyData();
    data.preferences = [{ key: LOCAL_OWNER_ACCOUNT_ID_KEY, value: 'account-b' }, { key: 'activeProfileId', value: 'profile-a' }];
    await new IndexedDbBackupGateway(database).replaceAll(data);
    expect(await preferences.get(LOCAL_OWNER_ACCOUNT_ID_KEY)).toEqual({ key: LOCAL_OWNER_ACCOUNT_ID_KEY, value: 'account-a' });
  });

  it('reset local remove o owner técnico junto com os dados', async () => {
    const database = fakeDatabase();
    const preferences = database.preferences as unknown as FakeTable<{ key: string; value: string }>;
    preferences.rows = [{ key: LOCAL_OWNER_ACCOUNT_ID_KEY, value: 'account-a' }];
    await new IndexedDbBackupGateway(database).clearAll();
    expect(await preferences.get(LOCAL_OWNER_ACCOUNT_ID_KEY)).toBeUndefined();
  });
});
