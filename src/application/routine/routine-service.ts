import { toLocalDateKey } from '../../domain/shared/local-date';
import { TRAINING_DAYS, localDayFor, type TrainingDay } from '../../domain/training/training';
import type { WorkoutPlanRepository, WorkoutSessionRepository } from '../../domain/training/repository';
import {
  DEFAULT_REMINDER_PREFERENCES,
  calculateSleepDurationMinutes,
  type NotificationPermissionState,
  type ReminderKind,
  type RoutineDay,
  type RoutineProfile,
  type SleepRecord,
} from '../../domain/routine/routine';
import type { RoutineRepository } from '../../domain/routine/repository';
import { createUuid } from '../../shared/ids/create-uuid';

export interface RoutineSnapshot {
  profile: RoutineProfile;
  days: RoutineDay[];
  today: RoutineDay;
  sleep?: SleepRecord;
  recentSleep: SleepRecord[];
  templates: { id: string; name: string; scheduledDay: TrainingDay }[];
}

export class RoutineService {
  constructor(
    private readonly routine: RoutineRepository,
    private readonly plans: WorkoutPlanRepository,
    private readonly sessions: WorkoutSessionRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly id: () => string = createUuid,
  ) {}

  private stamp() { return this.now().toISOString(); }

  private newDay(profileId: string, dayOfWeek: TrainingDay): RoutineDay {
    const timestamp = this.stamp();
    return { id: this.id(), profileId, dayOfWeek, isRestDay: false, createdAt: timestamp, updatedAt: timestamp };
  }

  async load(profileId: string): Promise<RoutineSnapshot> {
    const [storedProfile, storedDays, plan, recentSleep] = await Promise.all([
      this.routine.getProfile(profileId),
      this.routine.listDays(profileId),
      this.plans.getActive(profileId),
      this.routine.listSleep(profileId),
    ]);
    const timestamp = this.stamp();
    const profile = storedProfile ?? { id: profileId, profileId, reminders: { ...DEFAULT_REMINDER_PREFERENCES }, notificationPermission: this.notificationPermission(), createdAt: timestamp, updatedAt: timestamp };
    const byDay = new Map(storedDays.map((day) => [day.dayOfWeek, day]));
    const templates = plan?.versions.find((version) => version.version === plan.currentVersion)?.templates ?? [];
    const days = TRAINING_DAYS.map((dayOfWeek) => {
      const stored = byDay.get(dayOfWeek);
      const template = templates.find((item) => item.scheduledDay === dayOfWeek);
      return stored ?? { ...this.newDay(profileId, dayOfWeek), workoutTemplateId: template?.id, isRestDay: !template };
    });
    const todayKey = localDayFor(this.now());
    const localDate = toLocalDateKey(this.now());
    return {
      profile,
      days,
      today: days.find((day) => day.dayOfWeek === todayKey)!,
      sleep: recentSleep.find((record) => record.localDate === localDate),
      recentSleep: [...recentSleep].sort((a, b) => b.localDate.localeCompare(a.localDate)).slice(0, 30),
      templates: templates.map(({ id, name, scheduledDay }) => ({ id, name, scheduledDay })),
    };
  }

  async saveDay(day: RoutineDay): Promise<void> {
    await this.routine.saveDay({ ...day, wakeTime: day.wakeTime || undefined, sleepTime: day.sleepTime || undefined, workoutTime: day.workoutTime || undefined, workoutTemplateId: day.workoutTemplateId || undefined, updatedAt: this.stamp() });
  }

  async copyDay(source: RoutineDay, targetDays: readonly TrainingDay[]): Promise<void> {
    const timestamp = this.stamp();
    await this.routine.saveDays(targetDays.filter((day) => day !== source.dayOfWeek).map((dayOfWeek) => ({ ...source, id: this.id(), dayOfWeek, createdAt: timestamp, updatedAt: timestamp })));
  }

  async savePreferences(profile: RoutineProfile): Promise<void> {
    await this.routine.saveProfile({ ...profile, updatedAt: this.stamp() });
  }

  async recordSleep(profileId: string, sleepStartedAt: string, wokeAt: string, note?: string): Promise<SleepRecord> {
    const woke = new Date(wokeAt);
    const timestamp = this.stamp();
    const record: SleepRecord = {
      id: this.id(), profileId, localDate: toLocalDateKey(woke), sleepStartedAt: new Date(sleepStartedAt).toISOString(), wokeAt: woke.toISOString(),
      durationMinutes: calculateSleepDurationMinutes(sleepStartedAt, wokeAt), note: note?.trim() || undefined, createdAt: timestamp, updatedAt: timestamp,
    };
    const existing = await this.routine.getSleep(profileId, record.localDate);
    if (existing) record.id = existing.id;
    await this.routine.saveSleep(record);
    return record;
  }

  async removeSleep(profileId: string, id: string) { await this.routine.removeSleep(profileId, id); }

  async snooze(profileId: string, kind: ReminderKind, until: Date) {
    const timestamp = this.stamp();
    await this.routine.saveSnooze({ id: `${profileId}:${kind}`, profileId, reminderKind: kind, snoozedUntil: until.toISOString(), createdAt: timestamp, updatedAt: timestamp });
  }

  async hasActiveWorkout(profileId: string) { return Boolean(await this.sessions.getActive(profileId)); }

  notificationPermission(): NotificationPermissionState {
    return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  }

  async requestNotificationPermission(): Promise<NotificationPermissionState> {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.requestPermission();
  }
}
