import { describe, expect, it } from 'vitest';
import { LocalDataDetector } from './local-data-detector';

describe('detecção de dados locais anteriores ao login', () => {
  it('informa instalação vazia sem criar nem apagar dados', async () => {
    await expect(new LocalDataDetector([{ count: async () => 0 }, { count: async () => 0 }]).detect()).resolves.toEqual({ present: false, recordCount: 0 });
  });

  it('detecta registros existentes sem disparar upload', async () => {
    const upload = { called: false };
    const result = await new LocalDataDetector([{ count: async () => 2 }, { count: async () => 3 }]).detect();
    expect(result).toEqual({ present: true, recordCount: 5 });
    expect(upload.called).toBe(false);
  });
});
