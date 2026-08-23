import { describe,expect,it } from 'vitest';
import { DATABASE_VERSION } from './database';

describe('migration v5 → v6',()=>{
  it('mantém a versão do resumo nutricional na cadeia de migrações',()=>expect(DATABASE_VERSION).toBeGreaterThanOrEqual(6));
});
