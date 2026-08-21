import { describe, expect, it } from 'vitest';
import { toLocalDateKey } from './local-date';

describe('dia local', () => {
  it('usa os componentes locais em vez de cortar uma data UTC', () => {
    expect(toLocalDateKey(new Date(2026, 7, 21, 23, 59, 59))).toBe('2026-08-21');
  });

  it('troca a chave no novo dia sem apagar a anterior', () => {
    const before = toLocalDateKey(new Date(2026, 7, 21, 23, 59, 59));
    const after = toLocalDateKey(new Date(2026, 7, 22, 0, 0, 1));
    expect(before).toBe('2026-08-21');
    expect(after).toBe('2026-08-22');
  });

  it('rejeita data inválida', () => {
    expect(() => toLocalDateKey(new Date(Number.NaN))).toThrow(RangeError);
  });
});
