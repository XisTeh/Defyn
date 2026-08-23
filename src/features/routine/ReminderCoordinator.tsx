import { useEffect } from 'react';
import { calculateHydrationPace, calculateHydrationTarget, sumWaterEntries } from '../../domain/hydration/hydration';
import { shouldSendReminder, type ReminderKind } from '../../domain/routine/routine';
import { localDayFor } from '../../domain/training/training';
import { toLocalDateKey } from '../../domain/shared/local-date';
import { repositories } from '../../infrastructure/repositories';

/** Best-effort local reminders while the browser keeps the application running. */
export function ReminderCoordinator({ profileId }: { profileId: string }) {
  useEffect(() => {
    let active = true;
    async function check() {
      if (!active || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      const now = new Date(); const localDate = toLocalDateKey(now); const day = localDayFor(now);
      const [routineProfile, routineDays, profile, water, sessions, activeSession] = await Promise.all([
        repositories.routine.getProfile(profileId), repositories.routine.listDays(profileId), repositories.profiles.getById(profileId), repositories.water.listByProfileAndDate(profileId, localDate), repositories.workoutSessions.listByDate(profileId, localDate), repositories.workoutSessions.getActive(profileId),
      ]);
      if (!routineProfile || !profile) return;
      const today = routineDays.find((item) => item.dayOfWeek === day);
      const completed = sessions.some((session) => session.status === 'completed');
      const consumed = sumWaterEntries(water); const target = calculateHydrationTarget(profile.currentWeightKg, profile.hydrationConfiguration);
      const wake = today?.wakeTime ?? profile.hydrationRoutine?.wakeTime ?? '07:00'; const sleep = today?.sleepTime ?? profile.hydrationRoutine?.sleepTime ?? '23:00';
      const pace = calculateHydrationPace(target, consumed, wake, sleep, now);
      const lastWaterAt = [...water].sort((a,b) => b.occurredAt.localeCompare(a.occurredAt))[0]?.occurredAt;
      const candidates: { kind: ReminderKind; due: boolean; title: string; body: string }[] = [
        { kind:'water', due: pace.state === 'slightly-below' || pace.state === 'well-below', title:'Hidratação', body:'Seu registro está abaixo da referência deste horário. Beba água se fizer sentido agora.' },
        { kind:'workout', due: nearTime(now, today?.workoutTime), title:'Treino planejado', body:'O horário aproximado do treino chegou. Ajuste ao seu dia.' },
        { kind:'sleep', due: nearTime(now, today?.sleepTime, -15), title:'Horário habitual de sono', body:'Seu horário habitual se aproxima. Este é apenas um lembrete local.' },
        { kind:'check-in', due: day === routineProfile.reminders.checkInDay && now.getHours() === 10 && now.getMinutes() < 10, title:'Check-in semanal', body:'Registre apenas os dados que fizerem sentido nesta semana.' },
      ];
      for (const candidate of candidates) {
        if (!candidate.due) continue;
        const snooze = await repositories.routine.getSnooze(profileId, candidate.kind);
        if (!shouldSendReminder({ now, preference:routineProfile.reminders, kind:candidate.kind, snoozedUntil:snooze?.snoozedUntil, targetReached:consumed>=target, lastWaterAt, workoutCompleted:completed, workoutActive:Boolean(activeSession) })) continue;
        new Notification(candidate.title, { body:candidate.body, icon:'/pwa-192.png', tag:`defyn-${profileId}-${candidate.kind}-${localDate}` });
        const timestamp = now.toISOString();
        await repositories.routine.saveSnooze({ id:`${profileId}:${candidate.kind}`, profileId, reminderKind:candidate.kind, snoozedUntil:new Date(now.getTime()+Math.max(30,routineProfile.reminders.waterCooldownMinutes)*60_000).toISOString(), createdAt:snooze?.createdAt??timestamp, updatedAt:timestamp });
      }
    }
    void check(); const timer = window.setInterval(() => void check(), 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [profileId]);
  return null;
}

function nearTime(now: Date, value?: string, offsetMinutes = 0): boolean {
  if (!value) return false; const [hours, minutes] = value.split(':').map(Number); if (hours === undefined || minutes === undefined) return false;
  const target = hours * 60 + minutes + offsetMinutes; const current = now.getHours() * 60 + now.getMinutes(); return current >= target && current < target + 10;
}
