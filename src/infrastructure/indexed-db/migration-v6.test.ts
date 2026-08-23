import { describe,expect,it } from 'vitest';
import { DATABASE_VERSION } from './database';

describe('migration v5 → v6',()=>{
  it('declara a versão aditiva do resumo nutricional',()=>expect(DATABASE_VERSION).toBe(6));
});
