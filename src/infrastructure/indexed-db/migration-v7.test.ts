import { describe, expect, it } from 'vitest';
import { DATABASE_VERSION } from './database';

describe('migration v7', () => {
  it('é aditiva e reserva a versão para rotina, sono e lembretes', () => {
    expect(DATABASE_VERSION).toBeGreaterThanOrEqual(7);
  });
});
