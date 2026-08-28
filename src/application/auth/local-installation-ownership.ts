import type { LocalDataDetection } from './local-data-detector';

export const LOCAL_OWNER_ACCOUNT_ID_KEY = 'localOwnerAccountId';

export interface LocalOwnerRepository {
  get(): Promise<string | undefined>;
  claimIfUnowned(accountId: string): Promise<'claimed' | 'same-owner' | 'different-owner'>;
  clear(): Promise<void>;
}

export interface LocalDataProbe {
  detect(): Promise<LocalDataDetection>;
}

export type LocalOwnershipDecision =
  | { status: 'allowed'; accountId: string; reason: 'owner-match' | 'empty-installation' | 'legacy-linked' }
  | { status: 'needs-link'; accountId: string }
  | { status: 'blocked'; accountId: string };

export class LocalInstallationOwnershipService {
  constructor(
    private readonly ownerRepository: LocalOwnerRepository,
    private readonly localData: LocalDataProbe,
  ) {}

  async resolve(accountId: string): Promise<LocalOwnershipDecision> {
    const ownerAccountId = await this.ownerRepository.get();
    if (ownerAccountId) return ownerAccountId === accountId
      ? { status: 'allowed', accountId, reason: 'owner-match' }
      : { status: 'blocked', accountId };

    const localData = await this.localData.detect();
    if (localData.present) return { status: 'needs-link', accountId };

    const claim = await this.ownerRepository.claimIfUnowned(accountId);
    if (claim === 'different-owner') return { status: 'blocked', accountId };
    return { status: 'allowed', accountId, reason: claim === 'claimed' ? 'empty-installation' : 'owner-match' };
  }

  async linkLegacyData(accountId: string): Promise<LocalOwnershipDecision> {
    const claim = await this.ownerRepository.claimIfUnowned(accountId);
    if (claim === 'different-owner') return { status: 'blocked', accountId };
    return { status: 'allowed', accountId, reason: claim === 'claimed' ? 'legacy-linked' : 'owner-match' };
  }
}

export function shouldExposeLocalData(decision: LocalOwnershipDecision | undefined): boolean {
  return decision?.status === 'allowed';
}

export function isInstallationOnlyPreference(key: string): boolean {
  return key === LOCAL_OWNER_ACCOUNT_ID_KEY || key.startsWith('sync:');
}
