import type { LocalOwnerRepository } from '../../application/auth/local-installation-ownership';
import { LOCAL_OWNER_ACCOUNT_ID_KEY, LocalInstallationOwnershipService } from '../../application/auth/local-installation-ownership';
import type { DefynDatabase } from './database';
import { defynDatabase } from './database';
import { localDataDetector } from './local-data-detector';

export class IndexedDbLocalOwnerRepository implements LocalOwnerRepository {
  constructor(private readonly database: DefynDatabase) {}

  async get(): Promise<string | undefined> {
    const stored = await this.database.preferences.get(LOCAL_OWNER_ACCOUNT_ID_KEY);
    if (!stored) return undefined;
    if (typeof stored.value !== 'string' || !stored.value) throw new Error('O vínculo local desta instalação está inválido.');
    return stored.value;
  }

  claimIfUnowned(accountId: string): Promise<'claimed' | 'same-owner' | 'different-owner'> {
    return this.database.transaction('rw', this.database.preferences, async () => {
      const current = await this.get();
      if (current) return current === accountId ? 'same-owner' : 'different-owner';
      await this.database.preferences.put({ key: LOCAL_OWNER_ACCOUNT_ID_KEY, value: accountId });
      return 'claimed';
    });
  }

  clear(): Promise<void> {
    return this.database.preferences.delete(LOCAL_OWNER_ACCOUNT_ID_KEY);
  }
}

export const localInstallationOwnershipService = new LocalInstallationOwnershipService(
  new IndexedDbLocalOwnerRepository(defynDatabase),
  localDataDetector,
);
