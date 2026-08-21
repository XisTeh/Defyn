import type { UserProfile } from './profile';

export interface ProfileRepository {
  getById(id: string): Promise<UserProfile | undefined>;
  save(profile: UserProfile): Promise<void>;
  list(): Promise<UserProfile[]>;
  remove(id: string): Promise<void>;
}

export interface ActiveProfileRepository {
  get(): Promise<string | undefined>;
  set(profileId: string): Promise<void>;
  clear(): Promise<void>;
}
