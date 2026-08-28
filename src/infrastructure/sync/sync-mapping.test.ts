import { describe, expect, it } from 'vitest';
import { payloadFromRemote, samePayload, toRemoteRow } from './sync-mapping';
import type { OutboxEvent } from '../../application/sync/sync-contract';

const base: OutboxEvent = { id: 'queue', accountId: '11111111-1111-4111-8111-111111111111', entityType: 'hydration_entries', entityId: '22222222-2222-4222-8222-222222222222', profileId: '33333333-3333-4333-8333-333333333333', operation: 'UPSERT', payload: { id: '22222222-2222-4222-8222-222222222222', localDate: '2026-08-27', occurredAt: '2026-08-27T12:00:00.000Z', amountMl: 300, createdAt: '2026-08-27T12:00:00.000Z' }, createdAt: '2026-08-27T12:00:00.000Z', attempts: 0 };

describe('mapeamento do sync', () => {
  it('impõe account_id da sessão e projeta colunas consultáveis', () => expect(toRemoteRow(base)).toMatchObject({ account_id: base.accountId, profile_id: base.profileId, amount_ml: 300, local_date: '2026-08-27', deleted_at: null }));
  it('transforma DELETE em tombstone sem perder o payload', () => expect(toRemoteRow({ ...base, operation: 'DELETE' })).toMatchObject({ deleted_at: base.createdAt, payload: base.payload }));
  it('reconstrói campos de auditoria ausentes do payload remoto', () => expect(payloadFromRemote('hydration_entries', { id: base.entityId, profile_id: base.profileId, updated_at: '2026-08-27T13:00:00.000Z', created_at: base.createdAt, payload: {} })).toMatchObject({ id: base.entityId, profileId: base.profileId, createdAt: base.createdAt, updatedAt: '2026-08-27T13:00:00.000Z' }));
  it('compara payloads ignorando ordem de propriedades', () => expect(samePayload({ a: 1, nested: { b: 2 } }, { nested: { b: 2 }, a: 1 })).toBe(true));
  it('projeta metadata de mídia sem persistir URL temporária', () => {
    const media = { ...base, entityType: 'media_metadata' as const, payload: { id: base.entityId, profileId: base.profileId, kind: 'profile-avatar', storagePath: `${base.accountId}/${base.profileId}/${base.entityId}.webp`, mimeType: 'image/webp' } };
    expect(toRemoteRow(media)).toMatchObject({ kind: 'profile-avatar', storage_path: media.payload.storagePath, mime_type: 'image/webp' });
    expect(JSON.stringify(toRemoteRow(media))).not.toContain('signed');
  });
  it('projeta routine_days somente com UUID remoto válido', () => {
    const routine = { ...base, entityType: 'routine_days' as const, payload: { ...base.payload, dayOfWeek: 'friday' } };
    expect(toRemoteRow(routine)).toMatchObject({ id: base.entityId, profile_id: base.profileId, day_of_week: 4 });
    expect(toRemoteRow({ ...routine, operation: 'DELETE' })).toMatchObject({ id: base.entityId, deleted_at: base.createdAt });
    expect(() => toRemoteRow({ ...routine, entityId: `${base.profileId}:friday` })).toThrow(/UUID estável/);
  });
});
