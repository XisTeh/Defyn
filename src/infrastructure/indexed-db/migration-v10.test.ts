import { describe, expect, it } from 'vitest';
import { DATABASE_VERSION, DefynDatabase } from './database';

describe('schema v10', () => {
  it('mantém um cache local separado por conta', () => {
    const database = new DefynDatabase();
    expect(DATABASE_VERSION).toBe(10);
    expect(database.tables.map((table) => table.name)).toContain('accountCaches');
    database.close();
  });
});
