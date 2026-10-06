import { describe, expect, it } from 'vitest';
import type { OutboxEvent } from '../../application/sync/sync-contract';
import { SupabaseSyncGateway } from './supabase-sync-gateway';

function event(operation: 'UPSERT' | 'DELETE', name: string): OutboxEvent {
  const accountId = '11111111-1111-4111-8111-111111111111';
  const profileId = '22222222-2222-4222-8222-222222222222';
  return {
    id: `${accountId}:defyn_profiles:${profileId}`, accountId, entityType: 'defyn_profiles', entityId: profileId,
    operation, payload: { id: profileId, name, createdAt: '2026-01-01T00:00:00.000Z' }, createdAt: '2026-10-06T00:00:00.000Z', attempts: 0,
  };
}

describe('atualização remota de perfil', () => {
  it('envia somente campos mutáveis e limita o nome de índice do banco', async () => {
    let changes: Record<string, unknown> = {};
    const query = { eq: () => query, select: () => query, maybeSingle: async () => ({ data: { id: '22222222-2222-4222-8222-222222222222', updated_at: '2026-10-06T00:00:00.000Z', revision: 2, payload: {} }, error: null }) };
    const client = { from: () => ({ update: (row: Record<string, unknown>) => { changes = row; return query; } }) };
    await new SupabaseSyncGateway(client as never).push(event('UPSERT', 'X'.repeat(125)), 1);
    expect(changes).toMatchObject({ name: 'X'.repeat(120), payload: expect.objectContaining({ name: 'X'.repeat(125) }) });
    expect(changes).not.toHaveProperty('id');
    expect(changes).not.toHaveProperty('account_id');
    expect(changes).not.toHaveProperty('created_at');
    expect(changes).not.toHaveProperty('profile_id');
  });

  it('marca exclusão sem regravar campos do perfil', async () => {
    let changes: Record<string, unknown> = {};
    const query = { eq: () => query, select: () => query, maybeSingle: async () => ({ data: { id: '22222222-2222-4222-8222-222222222222', updated_at: '2026-10-06T00:00:00.000Z', revision: 2, payload: {} }, error: null }) };
    const client = { from: () => ({ update: (row: Record<string, unknown>) => { changes = row; return query; } }) };
    await new SupabaseSyncGateway(client as never).push(event('DELETE', 'Perfil'), 1);
    expect(changes).toEqual({ deleted_at: '2026-10-06T00:00:00.000Z' });
  });
});
