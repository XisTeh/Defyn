import { describe, expect, it } from 'vitest';
import { createUuid } from '../../shared/ids/create-uuid';
import {
  DEFAULT_REMINDER_PREFERENCES,
  averageSleepMinutes,
  calculateSleepDurationMinutes,
  isWithinClockInterval,
  shouldSendReminder,
  type SleepRecord,
} from './routine';

describe('rotina, sono e lembretes', () => {
  it('calcula sono simples e a virada de meia-noite pelos instantes reais', () => {
    expect(calculateSleepDurationMinutes('2026-08-22T14:00:00-03:00', '2026-08-22T15:30:00-03:00')).toBe(90);
    expect(calculateSleepDurationMinutes('2026-08-22T23:15:00-03:00', '2026-08-23T07:00:00-03:00')).toBe(465);
  });

  it('rejeita despertar anterior e duração acima de 24 horas', () => {
    expect(() => calculateSleepDurationMinutes('2026-08-23T08:00:00-03:00', '2026-08-23T07:00:00-03:00')).toThrow(/depois/);
    expect(() => calculateSleepDurationMinutes('2026-08-21T06:00:00-03:00', '2026-08-23T07:00:00-03:00')).toThrow(/24 horas/);
  });

  it('calcula média somente a partir de registros existentes', () => {
    expect(averageSleepMinutes([])).toBeUndefined();
    expect(averageSleepMinutes([record(420), record(480)])).toBe(450);
  });

  it('entende horário silencioso que cruza a meia-noite', () => {
    expect(isWithinClockInterval(new Date(2026, 7, 23, 23, 30), '22:00', '07:00')).toBe(true);
    expect(isWithinClockInterval(new Date(2026, 7, 23, 6, 59), '22:00', '07:00')).toBe(true);
    expect(isWithinClockInterval(new Date(2026, 7, 23, 12, 0), '22:00', '07:00')).toBe(false);
  });

  it('suprime água por meta, cooldown, silêncio, treino ativo e snooze', () => {
    const now = new Date('2026-08-23T15:00:00-03:00');
    const preference = { ...DEFAULT_REMINDER_PREFERENCES, water: true, quietHoursStart: '22:00', quietHoursEnd: '07:00' };
    expect(shouldSendReminder({ now, preference, kind: 'water' })).toBe(true);
    expect(shouldSendReminder({ now, preference, kind: 'water', targetReached: true })).toBe(false);
    expect(shouldSendReminder({ now, preference, kind: 'water', workoutActive: true })).toBe(false);
    expect(shouldSendReminder({ now, preference, kind: 'water', lastWaterAt: '2026-08-23T14:00:00-03:00' })).toBe(false);
    expect(shouldSendReminder({ now, preference, kind: 'water', snoozedUntil: '2026-08-23T16:00:00-03:00' })).toBe(false);
  });

  it('suprime treino concluído ou em andamento', () => {
    const preference = { ...DEFAULT_REMINDER_PREFERENCES, workout: true };
    const now = new Date('2026-08-23T15:00:00-03:00');
    expect(shouldSendReminder({ now, preference, kind: 'workout' })).toBe(true);
    expect(shouldSendReminder({ now, preference, kind: 'workout', workoutCompleted: true })).toBe(false);
    expect(shouldSendReminder({ now, preference, kind: 'workout', workoutActive: true })).toBe(false);
  });
});

function record(durationMinutes: number): SleepRecord {
  return { id: createUuid(), profileId: 'profile-a', localDate: '2026-08-23', sleepStartedAt: '2026-08-22T23:00:00-03:00', wokeAt: '2026-08-23T07:00:00-03:00', durationMinutes, createdAt: '', updatedAt: '' };
}
