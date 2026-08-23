import type { ReminderSnooze, RoutineDay, RoutineProfile, SleepRecord } from './routine';

export interface RoutineRepository {
  getProfile(profileId: string): Promise<RoutineProfile | undefined>;
  saveProfile(profile: RoutineProfile): Promise<void>;
  listDays(profileId: string): Promise<RoutineDay[]>;
  saveDay(day: RoutineDay): Promise<void>;
  saveDays(days: RoutineDay[]): Promise<void>;
  getSleep(profileId: string, localDate: string): Promise<SleepRecord | undefined>;
  listSleep(profileId: string, startLocalDate?: string, endLocalDate?: string): Promise<SleepRecord[]>;
  saveSleep(record: SleepRecord): Promise<void>;
  removeSleep(profileId: string, id: string): Promise<void>;
  getSnooze(profileId: string, reminderKind: string): Promise<ReminderSnooze | undefined>;
  saveSnooze(snooze: ReminderSnooze): Promise<void>;
  removeByProfile(profileId: string): Promise<void>;
}
