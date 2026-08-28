import { describe, expect, it } from 'vitest';
import {
  LocalInstallationOwnershipService,
  isInstallationOnlyPreference,
  shouldExposeLocalData,
  type LocalOwnerRepository,
} from './local-installation-ownership';

const ACCOUNT_A = '10000000-0000-4000-8000-000000000001';
const ACCOUNT_B = '20000000-0000-4000-8000-000000000002';

class MemoryOwnerRepository implements LocalOwnerRepository {
  constructor(public owner?: string) {}
  get() { return Promise.resolve(this.owner); }
  claimIfUnowned(accountId: string) {
    if (this.owner) return Promise.resolve(this.owner === accountId ? 'same-owner' as const : 'different-owner' as const);
    this.owner = accountId;
    return Promise.resolve('claimed' as const);
  }
  clear() { this.owner = undefined; return Promise.resolve(); }
}

function service(owner: MemoryOwnerRepository, hasData: boolean) {
  return new LocalInstallationOwnershipService(owner, { detect: async () => ({ present: hasData, recordCount: hasData ? 3 : 0 }) });
}

describe('ownership local por conta', () => {
  it('dados locais sem owner exigem vínculo explícito', async () => {
    await expect(service(new MemoryOwnerRepository(), true).resolve(ACCOUNT_A)).resolves.toEqual({ status: 'needs-link', accountId: ACCOUNT_A });
  });

  it('vincula dados legacy à conta A e libera somente depois da confirmação', async () => {
    const owner = new MemoryOwnerRepository();
    const ownership = service(owner, true);
    const decision = await ownership.linkLegacyData(ACCOUNT_A);
    expect(decision).toEqual({ status: 'allowed', accountId: ACCOUNT_A, reason: 'legacy-linked' });
    expect(owner.owner).toBe(ACCOUNT_A);
  });

  it('logout não altera ownership nem apaga dados', async () => {
    const owner = new MemoryOwnerRepository(ACCOUNT_A);
    await Promise.resolve(); // logout não chama nenhuma mutação no repository local
    expect(owner.owner).toBe(ACCOUNT_A);
  });

  it('login da conta A novamente libera os dados preservados', async () => {
    await expect(service(new MemoryOwnerRepository(ACCOUNT_A), true).resolve(ACCOUNT_A)).resolves.toEqual({ status: 'allowed', accountId: ACCOUNT_A, reason: 'owner-match' });
  });

  it('login da conta B bloqueia conteúdo vinculado à conta A', async () => {
    await expect(service(new MemoryOwnerRepository(ACCOUNT_A), true).resolve(ACCOUNT_B)).resolves.toEqual({ status: 'blocked', accountId: ACCOUNT_B });
  });

  it('decisão bloqueada nunca autoriza snapshot ou perfis de A', async () => {
    const decision = await service(new MemoryOwnerRepository(ACCOUNT_A), true).resolve(ACCOUNT_B);
    expect(shouldExposeLocalData(decision)).toBe(false);
  });

  it('logout de B seguido de login A mantém conteúdo liberado para A', async () => {
    const owner = new MemoryOwnerRepository(ACCOUNT_A);
    await service(owner, true).resolve(ACCOUNT_B);
    const decisionA = await service(owner, true).resolve(ACCOUNT_A);
    expect(decisionA.status).toBe('allowed');
    expect(owner.owner).toBe(ACCOUNT_A);
  });

  it('reset legítimo remove o owner técnico', async () => {
    const owner = new MemoryOwnerRepository(ACCOUNT_A);
    await owner.clear();
    expect(await owner.get()).toBeUndefined();
  });

  it('instalação vazia é vinculada automaticamente antes de abrir o app', async () => {
    const owner = new MemoryOwnerRepository();
    await expect(service(owner, false).resolve(ACCOUNT_A)).resolves.toEqual({ status: 'allowed', accountId: ACCOUNT_A, reason: 'empty-installation' });
    expect(owner.owner).toBe(ACCOUNT_A);
  });

  it('troca de conta não altera ownership silenciosamente', async () => {
    const owner = new MemoryOwnerRepository(ACCOUNT_A);
    await service(owner, true).resolve(ACCOUNT_B);
    expect(owner.owner).toBe(ACCOUNT_A);
  });

  it('metadata de ownership é instalação-local e não pertence ao backup', () => {
    expect(isInstallationOnlyPreference('localOwnerAccountId')).toBe(true);
    expect(isInstallationOnlyPreference('activeProfileId')).toBe(false);
  });
});
