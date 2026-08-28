import { afterEach, describe, expect, it, vi } from 'vitest';
import { comparePullCursor, createOfflineId, mapRemoteOwnership, PUSH_ORDER, retryDelayMs, shouldCancelUnsyncedCreation, SYNC_STATES } from './sync-contract';

const accountId = '11111111-1111-4111-8111-111111111111';
const profileId = '22222222-2222-4222-8222-222222222222';
const entityId = '33333333-3333-4333-8333-333333333333';

afterEach(() => vi.unstubAllGlobals());

describe('contratos da sincronização offline-first', () => {
  it('mantém os estados explícitos por registro', () => {
    expect(SYNC_STATES).toEqual(['LOCAL_ONLY', 'PENDING_UPLOAD', 'SYNCED', 'PENDING_DELETE', 'CONFLICT', 'ERROR']);
  });

  it('cria ID offline-safe e rejeita gerador incompatível', () => {
    expect(createOfflineId(() => entityId)).toBe(entityId);
    expect(() => createOfflineId(() => 'sequence-42')).toThrow('UUID');
  });

  it('mantém a criação de ID de sync sem randomUUID nativo', () => {
    const getRandomValues = (bytes: Uint8Array) => {
      bytes.set([32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]);
      return bytes;
    };
    vi.stubGlobal('crypto', { getRandomValues });

    expect(createOfflineId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('mapeia ownership usando auth.users.id e perfil estável', () => {
    expect(mapRemoteOwnership(accountId, entityId, profileId)).toEqual({ id: entityId, account_id: accountId, profile_id: profileId });
    expect(() => mapRemoteOwnership(accountId, entityId, 'perfil-legado')).toThrow('profileId');
  });

  it('ordena pull por updated_at e desempata por id', () => {
    expect(comparePullCursor({ updatedAt: '2026-08-27T12:00:00.000Z', entityId: profileId }, { updatedAt: '2026-08-27T12:00:00.000Z', entityId })).toBeLessThan(0);
    expect(comparePullCursor({ updatedAt: '2026-08-27T12:01:00.000Z', entityId: profileId }, { updatedAt: '2026-08-27T12:00:00.000Z', entityId })).toBeGreaterThan(0);
  });

  it('ordena pais antes de filhos e aplica backoff limitado', () => {
    expect(PUSH_ORDER.indexOf('defyn_profiles')).toBeLessThan(PUSH_ORDER.indexOf('hydration_entries'));
    expect(PUSH_ORDER.indexOf('training_plans')).toBeLessThan(PUSH_ORDER.indexOf('workout_sessions'));
    expect(PUSH_ORDER.indexOf('workout_sessions')).toBeLessThan(PUSH_ORDER.indexOf('workout_sets'));
    expect(PUSH_ORDER.indexOf('defyn_profiles')).toBeLessThan(PUSH_ORDER.indexOf('media_metadata'));
    expect(retryDelayMs(1)).toBe(2_000);
    expect(retryDelayMs(99)).toBe(300_000);
  });

  it('cancela criação apagada antes do primeiro sync, mas mantém tombstone de registro remoto', () => {
    const pending = { id: 'queue', accountId, entityType: 'defyn_profiles' as const, entityId, operation: 'UPSERT' as const, payload: {}, createdAt: '2026-08-27T12:00:00.000Z', attempts: 0 };
    expect(shouldCancelUnsyncedCreation(pending, undefined)).toBe(true);
    expect(shouldCancelUnsyncedCreation(pending, { id: 'queue', accountId, entityType: 'defyn_profiles', entityId, state: 'PENDING_UPLOAD', remoteRevision: 2 })).toBe(false);
  });
});
