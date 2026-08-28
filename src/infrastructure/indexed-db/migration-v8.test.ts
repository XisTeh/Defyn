import { describe, expect, it } from 'vitest';
import { DATABASE_VERSION, DefynDatabase } from './database';

describe('migration v7 → v8', () => {
  it('é aditiva e declara apenas stores técnicas de sincronização', () => {
    expect(DATABASE_VERSION).toBe(8);
    const database = new DefynDatabase();
    const schema = database.tables.map((table) => table.name);
    expect(schema).toEqual(expect.arrayContaining(['profiles', 'foods', 'recipes', 'syncOutbox', 'syncMetadata', 'syncCursors', 'syncConflicts']));
    database.close();
  });
});
