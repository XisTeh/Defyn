import { describe, expect, it } from 'vitest';
import { migrateProfileToV2, selectMigratedActiveProfileId, type LegacyUserProfileV1 } from './migration-v2';

describe('migration v1 → v2', () => {
  it('preserva o perfil e adiciona hidratação segura de 35 ml/kg', () => {
    const migrated = migrateProfileToV2(legacyProfile('profile-a', true));
    expect(migrated.id).toBe('profile-a');
    expect(migrated.name).toBe('Perfil A');
    expect(migrated.currentWeightKg).toBe(80);
    expect(migrated.hydrationConfiguration).toEqual({ mode: 'weight-based', mlPerKg: 35 });
    expect(migrated.isPrimary).toBeUndefined();
  });

  it('define o perfil v1 principal como ativo e corrige referência inválida', () => {
    const profiles = [legacyProfile('profile-a', false), legacyProfile('profile-b', true)];
    expect(selectMigratedActiveProfileId(profiles)).toBe('profile-b');
    expect(selectMigratedActiveProfileId(profiles, 'missing')).toBe('profile-b');
    expect(selectMigratedActiveProfileId(profiles, 'profile-a')).toBe('profile-a');
  });
});

function legacyProfile(id: string, isPrimary: boolean): LegacyUserProfileV1 {
  const timestamp = '2026-08-21T12:00:00.000Z';
  return { id, isPrimary, name: id === 'profile-a' ? 'Perfil A' : 'Perfil B', dateOfBirth: '1990-01-01', metabolicSex: 'male', heightCm: 175, currentWeightKg: 80, goal: 'fat-loss', activity: { factor: 1.5 }, metabolicMethod: 'mifflin-st-jeor', calorieGoal: { mode: 'deficit', adjustmentKcal: 400 }, macroConfiguration: { mode: 'derived-carbs', protein: { mode: 'per-kg', gramsPerKg: 2 }, fat: { mode: 'per-kg', gramsPerKg: 1 } }, units: { weight: 'kg', height: 'cm', energy: 'kcal' }, createdAt: timestamp, updatedAt: timestamp };
}
