import type { ProgressPhotoMetadata, ProgressRecord } from '../../domain/progress/progress';
import type { ProgressRepository } from '../../domain/progress/repository';

export interface ProfileProgress {
  records: ProgressRecord[];
  photos: ProgressPhotoMetadata[];
}

export class GetProfileProgressService {
  constructor(private readonly progress: ProgressRepository) {}
  async execute(profileId: string): Promise<ProfileProgress> {
    const [records, photos] = await Promise.all([
      this.progress.listRecords(profileId),
      this.progress.listPhotoMetadata(profileId),
    ]);
    return { records, photos };
  }
}
