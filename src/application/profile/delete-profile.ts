import type { ActiveProfileRepository, ProfileRepository } from '../../domain/profile/repository';

export interface ProfileDataGateway {
  deleteProfileAndOwnedData(profileId: string): Promise<void>;
}

export class DeleteProfileService {
  constructor(
    private readonly profiles: ProfileRepository,
    private readonly activeProfile: ActiveProfileRepository,
    private readonly profileData: ProfileDataGateway,
  ) {}

  async execute(profileId: string): Promise<string | undefined> {
    const profile = await this.profiles.getById(profileId);
    if (!profile) throw new Error('O perfil selecionado não existe.');
    await this.profileData.deleteProfileAndOwnedData(profileId);
    const remaining = await this.profiles.list();
    const next = remaining[0]?.id;
    if (next) await this.activeProfile.set(next);
    else await this.activeProfile.clear();
    return next;
  }
}
