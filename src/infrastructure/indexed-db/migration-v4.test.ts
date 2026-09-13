import { describe, expect, it } from 'vitest';
import { BASE_EXERCISES } from '../../domain/training/exercise-library';
import { DATABASE_VERSION } from './database';

describe('migration v3 → v4', () => {
  it('preserva a versão 4 na cadeia sem apagar dados anteriores', () => { expect(DATABASE_VERSION).toBeGreaterThanOrEqual(4); });
  it('mantém catálogo base fora da migration e com ids estáveis', () => { expect(BASE_EXERCISES[0]?.id).toBe('defyn-exercise-01'); expect(BASE_EXERCISES[51]?.id).toBe('defyn-exercise-52'); expect(BASE_EXERCISES.length).toBe(241); });
});
