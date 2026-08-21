import type { ActiveProfileRepository, ProfileRepository } from '../../domain/profile/repository';
import type { UserProfile } from '../../domain/profile/profile';

export interface ProfileSession {
  profiles: UserProfile[];
  activeProfile?: UserProfile;
}

export class ProfileSessionService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly activeProfile: ActiveProfileRepository,
  ) {}

  async load(): Promise<ProfileSession> {
    const profiles = await this.profiles.list();
    const storedId = await this.activeProfile.get();
    const active = profiles.find((profile) => profile.id === storedId) ?? profiles[0];
    if (active && active.id !== storedId) await this.activeProfile.set(active.id);
    if (!active && storedId) await this.activeProfile.clear();
    return { profiles, activeProfile: active };
  }

  async switchTo(profileId: string): Promise<UserProfile> {
    const profile = await this.profiles.getById(profileId);
    if (!profile) throw new Error('Este perfil não existe mais.');
    await this.activeProfile.set(profileId);
    return profile;
  }
}
