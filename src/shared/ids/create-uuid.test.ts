import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUuid } from './create-uuid';

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

afterEach(() => vi.unstubAllGlobals());

describe('createUuid', () => {
  it('usa randomUUID nativo quando disponível', () => {
    const randomUUID = vi.fn(() => '11111111-1111-4111-8111-111111111111');
    const getRandomValues = vi.fn();
    vi.stubGlobal('crypto', { randomUUID, getRandomValues });

    expect(createUuid()).toBe('11111111-1111-4111-8111-111111111111');
    expect(randomUUID).toHaveBeenCalledOnce();
    expect(getRandomValues).not.toHaveBeenCalled();
  });

  it('usa getRandomValues quando randomUUID não existe', () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set([0, 1, 2, 3, 4, 5, 0, 7, 0, 9, 10, 11, 12, 13, 14, 15]);
      return bytes;
    });
    vi.stubGlobal('crypto', { getRandomValues });

    const id = createUuid();
    expect(getRandomValues).toHaveBeenCalledOnce();
    expect(id).toMatch(uuidV4);
    expect(id[14]).toBe('4');
    expect(id[19]).toMatch(/[89ab]/);
  });

  it('gera UUIDs v4 distintos sem usar Math.random', () => {
    let sequence = 0;
    const getRandomValues = (bytes: Uint8Array) => {
      bytes.fill(sequence++);
      return bytes;
    };
    const mathRandom = vi.spyOn(Math, 'random');
    vi.stubGlobal('crypto', { getRandomValues });

    const ids = new Set(Array.from({ length: 4 }, () => createUuid()));
    expect(ids.size).toBe(4);
    for (const id of ids) expect(id).toMatch(uuidV4);
    expect(mathRandom).not.toHaveBeenCalled();
    mathRandom.mockRestore();
  });

  it('falha de forma descritiva sem Web Crypto', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => createUuid()).toThrow('criptograficamente segura');
  });
});
