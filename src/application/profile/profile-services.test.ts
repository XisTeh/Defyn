import { describe, expect, it } from 'vitest';
import type { NutritionTargetSnapshot } from '../../domain/targets/nutrition-target';
import type { NutritionTargetRepository } from '../../domain/targets/repository';
import type { UserProfile } from '../../domain/profile/profile';
import type { ActiveProfileRepository, ProfileRepository } from '../../domain/profile/repository';
import { CreateProfileService, type CreateProfileCommand } from './create-profile';
import { DeleteProfileService, type ProfileDataGateway } from './delete-profile';
import { ProfileSessionService } from './profile-session';

class MemoryProfiles implements ProfileRepository {
  records = new Map<string, UserProfile>();
  getById(id: string) { return Promise.resolve(this.records.get(id)); }
  save(profile: UserProfile) { this.records.set(profile.id, profile); return Promise.resolve(); }
  list() { return Promise.resolve([...this.records.values()]); }
  remove(id: string) { this.records.delete(id); return Promise.resolve(); }
}

class MemoryActive implements ActiveProfileRepository {
  value?: string;
  get() { return Promise.resolve(this.value); }
  set(profileId: string) { this.value = profileId; return Promise.resolve(); }
  clear() { this.value = undefined; return Promise.resolve(); }
}

class MemoryTargets implements NutritionTargetRepository {
  records = new Map<string, NutritionTargetSnapshot>();
  save(snapshot: NutritionTargetSnapshot) { this.records.set(snapshot.id, snapshot); return Promise.resolve(); }
  getActiveForProfile(profileId: string) { return Promise.resolve([...this.records.values()].find((target) => target.profileId === profileId && !target.endsAt)); }
  listForProfile(profileId: string) { return Promise.resolve([...this.records.values()].filter((target) => target.profileId === profileId)); }
  async removeByProfile(profileId: string) { for (const target of this.records.values()) if (target.profileId === profileId) this.records.delete(target.id); }
}

describe('multi-profile', () => {
  it('cria dois perfis com IDs e metas independentes', async () => {
    const profiles = new MemoryProfiles();
    const targets = new MemoryTargets();
    const ids = ['profile-a', 'target-a', 'profile-b', 'target-b'];
    const service = new CreateProfileService(profiles, targets, fixedNow, () => ids.shift() ?? 'missing');
    await service.execute(command('Perfil A', 80));
    await service.execute(command('Perfil B', 62));
    expect([...profiles.records.keys()]).toEqual(['profile-a', 'profile-b']);
    expect((await targets.getActiveForProfile('profile-a'))?.input.weightKg).toBe(80);
    expect((await targets.getActiveForProfile('profile-b'))?.input.weightKg).toBe(62);
  });

  it('troca e persiste o perfil ativo', async () => {
    const profiles = seededProfiles();
    const active = new MemoryActive();
    const session = new ProfileSessionService(profiles, active);
    await session.switchTo('profile-b');
    expect(active.value).toBe('profile-b');
    expect((await session.load()).activeProfile?.id).toBe('profile-b');
  });

  it('impede referência ativa inválida e seleciona um perfil existente', async () => {
    const profiles = seededProfiles();
    const active = new MemoryActive();
    active.value = 'profile-missing';
    const loaded = await new ProfileSessionService(profiles, active).load();
    expect(loaded.activeProfile?.id).toBe('profile-a');
    expect(active.value).toBe('profile-a');
  });

  it('rejeita troca para perfil inexistente', async () => {
    await expect(new ProfileSessionService(seededProfiles(), new MemoryActive()).switchTo('missing')).rejects.toThrow(/não existe/);
  });

  it('exclui perfil, aciona cascade e escolhe outro ativo', async () => {
    const profiles = seededProfiles();
    const active = new MemoryActive();
    active.value = 'profile-a';
    const deleted: string[] = [];
    const gateway: ProfileDataGateway = { deleteProfileAndOwnedData: async (id) => { deleted.push(id); profiles.records.delete(id); } };
    const next = await new DeleteProfileService(profiles, active, gateway).execute('profile-a');
    expect(deleted).toEqual(['profile-a']);
    expect(next).toBe('profile-b');
    expect(active.value).toBe('profile-b');
  });

  it('edita dados sem impacto nutricional sem criar snapshot redundante', async () => {
    const profiles = new MemoryProfiles();
    const targets = new MemoryTargets();
    const ids = ['profile-a', 'target-a'];
    const service = new CreateProfileService(profiles, targets, fixedNow, () => ids.shift() ?? 'unexpected');
    const created = await service.execute(command('Perfil A', 80));
    await service.execute({ ...command('Novo nome', 80), profileId: created.profile.id });
    expect(targets.records.size).toBe(1);
    expect((await profiles.getById('profile-a'))?.name).toBe('Novo nome');
  });
});

function command(name: string, weight: number): CreateProfileCommand {
  return { name, dateOfBirth: '1990-01-01', metabolicSex: 'male', heightCm: 175, currentWeightKg: weight, goal: 'fat-loss', activity: { factor: 1.5 }, metabolicMethod: 'mifflin-st-jeor', calorieGoal: { mode: 'deficit', adjustmentKcal: 400 }, hydrationConfiguration: { mode: 'weight-based', mlPerKg: 35 } };
}

function fixedNow() { return new Date('2026-08-21T12:00:00.000Z'); }

function seededProfiles(): MemoryProfiles {
  const repository = new MemoryProfiles();
  repository.records.set('profile-a', profile('profile-a', 'Perfil A', 80));
  repository.records.set('profile-b', profile('profile-b', 'Perfil B', 62));
  return repository;
}

function profile(id: string, name: string, weight: number): UserProfile {
  const timestamp = '2026-08-21T12:00:00.000Z';
  return { id, name, dateOfBirth: '1990-01-01', metabolicSex: 'male', heightCm: 175, currentWeightKg: weight, goal: 'fat-loss', activity: { factor: 1.5 }, metabolicMethod: 'mifflin-st-jeor', calorieGoal: { mode: 'deficit', adjustmentKcal: 400 }, macroConfiguration: { mode: 'derived-carbs', protein: { mode: 'per-kg', gramsPerKg: 2 }, fat: { mode: 'per-kg', gramsPerKg: 1 } }, hydrationConfiguration: { mode: 'weight-based', mlPerKg: 35 }, units: { weight: 'kg', height: 'cm', energy: 'kcal' }, createdAt: timestamp, updatedAt: timestamp };
}
