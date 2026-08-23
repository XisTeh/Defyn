import type { AuditedEntity } from '../shared/types';
import type { TrainingDay } from '../training/training';

export type ReminderKind = 'water' | 'workout' | 'check-in' | 'sleep';
export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface ReminderPreferences {
  water: boolean;
  workout: boolean;
  checkIn: boolean;
  sleep: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  waterCooldownMinutes: number;
  checkInDay: TrainingDay;
}

export interface RoutineProfile extends AuditedEntity {
  profileId: string;
  reminders: ReminderPreferences;
  notificationPermission: NotificationPermissionState;
}

export interface RoutineDay extends AuditedEntity {
  profileId: string;
  dayOfWeek: TrainingDay;
  wakeTime?: string;
  sleepTime?: string;
  workoutTemplateId?: string;
  workoutTime?: string;
  isRestDay: boolean;
}

/** localDate follows the awakening day, not the day sleep started. */
export interface SleepRecord extends AuditedEntity {
  profileId: string;
  localDate: string;
  sleepStartedAt: string;
  wokeAt: string;
  durationMinutes: number;
  note?: string;
}

export interface ReminderSnooze extends AuditedEntity {
  profileId: string;
  reminderKind: ReminderKind;
  snoozedUntil: string;
}

export interface ReminderContext {
  now: Date;
  preference: ReminderPreferences;
  kind: ReminderKind;
  snoozedUntil?: string;
  targetReached?: boolean;
  lastWaterAt?: string;
  workoutCompleted?: boolean;
  workoutActive?: boolean;
}

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  water: false,
  workout: false,
  checkIn: false,
  sleep: false,
  waterCooldownMinutes: 90,
  checkInDay: 'sunday',
};

export function validClockTime(value: string | undefined): value is string {
  if (!value) return false;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return Boolean(match && Number(match[1]) < 24 && Number(match[2]) < 60);
}

export function clockMinutes(value: string): number {
  if (!validClockTime(value)) throw new Error('Horário inválido.');
  const [hours = 0, minutes = 0] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isWithinClockInterval(now: Date, start?: string, end?: string): boolean {
  if (!validClockTime(start) || !validClockTime(end) || start === end) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  const from = clockMinutes(start);
  const to = clockMinutes(end);
  return from < to ? current >= from && current < to : current >= from || current < to;
}

export function calculateSleepDurationMinutes(sleepStartedAt: string, wokeAt: string): number {
  const start = new Date(sleepStartedAt).getTime();
  const end = new Date(wokeAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('O despertar precisa ocorrer depois do início do sono.');
  const duration = Math.round((end - start) / 60_000);
  if (duration > 24 * 60) throw new Error('O registro de sono não pode ultrapassar 24 horas.');
  return duration;
}

export function shouldSendReminder(context: ReminderContext): boolean {
  const { now, preference, kind } = context;
  const enabled = kind === 'check-in' ? preference.checkIn : preference[kind];
  if (!enabled || isWithinClockInterval(now, preference.quietHoursStart, preference.quietHoursEnd)) return false;
  if (context.snoozedUntil && new Date(context.snoozedUntil).getTime() > now.getTime()) return false;
  if (kind === 'water') {
    if (context.targetReached || context.workoutActive) return false;
    if (context.lastWaterAt && now.getTime() - new Date(context.lastWaterAt).getTime() < preference.waterCooldownMinutes * 60_000) return false;
  }
  if (kind === 'workout' && (context.workoutCompleted || context.workoutActive)) return false;
  return true;
}

export function averageSleepMinutes(records: readonly SleepRecord[]): number | undefined {
  const valid = records.filter((record) => Number.isFinite(record.durationMinutes) && record.durationMinutes > 0);
  return valid.length ? Math.round(valid.reduce((sum, record) => sum + record.durationMinutes, 0) / valid.length) : undefined;
}

export function formatDuration(minutes: number | undefined): string {
  if (minutes === undefined) return 'Sem registro';
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}min`;
}
