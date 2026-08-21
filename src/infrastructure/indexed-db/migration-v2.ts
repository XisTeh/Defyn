import type { UserProfile } from '../../domain/profile/profile';
import type { HydrationConfiguration } from '../../domain/hydration/hydration';

export type LegacyUserProfileV1 = Omit<UserProfile, 'hydrationConfiguration'> & {
  hydrationConfiguration?: HydrationConfiguration;
};

export const DEFAULT_HYDRATION_CONFIGURATION = {
  mode: 'weight-based' as const,
  mlPerKg: 35,
};

export function migrateProfileToV2(profile: LegacyUserProfileV1): UserProfile {
  const migrated = {
    ...profile,
    hydrationConfiguration: profile.hydrationConfiguration ?? DEFAULT_HYDRATION_CONFIGURATION,
  };
  delete migrated.isPrimary;
  return migrated;
}

export function selectMigratedActiveProfileId(
  profiles: readonly LegacyUserProfileV1[],
  storedActiveProfileId?: string,
): string | undefined {
  if (storedActiveProfileId && profiles.some((profile) => profile.id === storedActiveProfileId)) {
    return storedActiveProfileId;
  }
  return profiles.find((profile) => profile.isPrimary)?.id ?? profiles[0]?.id;
}
