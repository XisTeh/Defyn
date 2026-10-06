import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { DefynDatabase, type LegacyAccountLocalCache } from '../indexed-db/database';
import type { DefynBackupData } from '../../domain/export/export-format';
import { prepareLocalAccount } from './account-cache';
import { SYNC_ACTIVE_ACCOUNT_ID_KEY, SYNC_ENROLLMENT_ACCOUNT_ID_KEY } from './local-sync-state';

describe('troca de conta no IndexedDB', () => {
  it('restaura em uma transação o perfil, o Blob e a fila pendente da conta anterior', async () => {
    const database = new DefynDatabase();
    await database.delete();
    await database.open();
    try {
      await database.preferences.put({ key: SYNC_ENROLLMENT_ACCOUNT_ID_KEY, value: 'account-a' });
      await database.profiles.put({ id: 'profile-a', name: 'Perfil A', updatedAt: '2026-10-06T00:00:00.000Z' } as never);
      await database.media.put({
        id: 'media-a', kind: 'profile-avatar', ownerType: 'profile', ownerId: 'profile-a',
        mimeType: 'image/png', sizeBytes: 3, width: 1, height: 1, blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
        createdAt: '2026-10-06T00:00:00.000Z', updatedAt: '2026-10-06T00:00:00.000Z',
      });
      await database.syncOutbox.put({ id: 'pending-a', accountId: 'account-a', entityType: 'defyn_profiles', entityId: 'profile-a', operation: 'UPSERT', payload: {}, createdAt: '2026-10-06T00:00:00.000Z', attempts: 0 });
      await database.syncMetadata.put({ id: 'pending-a', accountId: 'account-a', entityType: 'defyn_profiles', entityId: 'profile-a', state: 'PENDING_UPLOAD', remoteRevision: 3 });

      await prepareLocalAccount(database, 'account-b');
      expect(await database.profiles.count()).toBe(0);
      expect(await database.syncOutbox.count()).toBe(0);
      expect((await database.preferences.get(SYNC_ACTIVE_ACCOUNT_ID_KEY))?.value).toBe('account-b');

      await prepareLocalAccount(database, 'account-a');
      expect((await database.profiles.get('profile-a'))?.name).toBe('Perfil A');
      expect(await database.syncOutbox.get('pending-a')).toMatchObject({ accountId: 'account-a' });
      expect(await database.syncMetadata.get('pending-a')).toMatchObject({ remoteRevision: 3 });
      expect((await database.media.get('media-a'))?.blob.size).toBe(3);
    } finally {
      database.close();
      await database.delete();
    }
  });

  it('migra a imagem e as preferências de um cache salvo pela versão anterior', async () => {
    const database = new DefynDatabase();
    await database.delete();
    await database.open();
    try {
      await database.preferences.put({ key: SYNC_ACTIVE_ACCOUNT_ID_KEY, value: 'account-a' });
      const cache: LegacyAccountLocalCache = {
        accountId: 'account-b', savedAt: '2026-10-06T00:00:00.000Z', enrolled: true, initialPullComplete: true,
        data: {
          profiles: [{ id: 'profile-b', name: 'Perfil B', updatedAt: '2026-10-06T00:00:00.000Z' }], preferences: [],
          media: [{ id: 'media-b', kind: 'profile-avatar', ownerType: 'profile', ownerId: 'profile-b', mimeType: 'image/png', sizeBytes: 3, width: 1, height: 1, createdAt: '2026-10-06T00:00:00.000Z', updatedAt: '2026-10-06T00:00:00.000Z', dataUrl: 'data:image/png;base64,AQID' }],
        } as unknown as DefynBackupData,
      };
      await database.accountCaches.put(cache);

      await prepareLocalAccount(database, 'account-b');
      expect((await database.profiles.get('profile-b'))?.name).toBe('Perfil B');
      expect((await database.media.get('media-b'))?.blob.size).toBe(3);
      expect((await database.preferences.get(SYNC_ENROLLMENT_ACCOUNT_ID_KEY))?.value).toBe('account-b');
    } finally {
      database.close();
      await database.delete();
    }
  });
});
