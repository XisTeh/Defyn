import { describe, expect, it } from 'vitest';
import type { RoutineRepository } from '../../domain/routine/repository';
import type { ReminderSnooze, RoutineDay, RoutineProfile, SleepRecord } from '../../domain/routine/routine';
import type { WorkoutPlanRepository, WorkoutSessionRepository } from '../../domain/training/repository';
import type { WorkoutPlan } from '../../domain/training/training';
import { RoutineService } from './routine-service';

describe('RoutineService', () => {
  it('usa referência do template ativo sem duplicar a ficha', async () => {
    const service = createService(new MemoryRoutine(), planRepository());
    const snapshot = await service.load('profile-a');
    expect(snapshot.days.find((day) => day.dayOfWeek === 'monday')?.workoutTemplateId).toBe('template-a');
    expect(snapshot.templates[0]).toEqual({ id:'template-a', name:'Full Body A', scheduledDay:'monday' });
  });

  it('copia a configuração apenas para os dias selecionados', async () => {
    const memory = new MemoryRoutine(); const service = createService(memory, planRepository()); const source = (await service.load('profile-a')).days[0]!;
    await service.copyDay({ ...source, wakeTime:'07:30', sleepTime:'23:00' }, ['tuesday','thursday']);
    expect((await memory.listDays('profile-a')).map((day) => day.dayOfWeek)).toEqual(['tuesday','thursday']);
    expect((await memory.listDays('profile-a')).every((day) => day.wakeTime === '07:30')).toBe(true);
  });

  it('mantém dias e sono isolados por perfil', async () => {
    const memory = new MemoryRoutine(); const service = createService(memory, planRepository());
    const dayA = (await service.load('profile-a')).days[0]!; const dayB = (await service.load('profile-b')).days[0]!;
    await service.saveDay({ ...dayA, wakeTime:'06:00' }); await service.saveDay({ ...dayB, wakeTime:'09:00' });
    await service.recordSleep('profile-a','2026-08-22T23:00:00-03:00','2026-08-23T07:00:00-03:00');
    expect((await memory.listDays('profile-a'))[0]?.wakeTime).toBe('06:00');
    expect((await memory.listDays('profile-b'))[0]?.wakeTime).toBe('09:00');
    expect(await memory.getSleep('profile-b','2026-08-23')).toBeUndefined();
  });

  it('atribui o sono ao dia local do despertar', async () => {
    const memory = new MemoryRoutine(); const service = createService(memory, planRepository());
    const saved = await service.recordSleep('profile-a','2026-08-22T23:30:00-03:00','2026-08-23T07:10:00-03:00');
    expect(saved.localDate).toBe('2026-08-23'); expect(saved.durationMinutes).toBe(460);
  });
});

class MemoryRoutine implements RoutineRepository {
  profiles: RoutineProfile[]=[]; days:RoutineDay[]=[]; sleep:SleepRecord[]=[]; snoozes:ReminderSnooze[]=[];
  async getProfile(profileId:string){return this.profiles.find((item)=>item.profileId===profileId);} async saveProfile(profile:RoutineProfile){this.profiles=this.profiles.filter((item)=>item.profileId!==profile.profileId).concat(profile);}
  async listDays(profileId:string){return this.days.filter((item)=>item.profileId===profileId);} async saveDay(day:RoutineDay){this.days=this.days.filter((item)=>item.id!==day.id).concat(day);} async saveDays(days:RoutineDay[]){for(const day of days)await this.saveDay(day);}
  async getSleep(profileId:string,localDate:string){return this.sleep.find((item)=>item.profileId===profileId&&item.localDate===localDate);} async listSleep(profileId:string){return this.sleep.filter((item)=>item.profileId===profileId);} async saveSleep(record:SleepRecord){this.sleep=this.sleep.filter((item)=>item.id!==record.id).concat(record);} async removeSleep(profileId:string,id:string){this.sleep=this.sleep.filter((item)=>!(item.profileId===profileId&&item.id===id));}
  async getSnooze(profileId:string,kind:string){return this.snoozes.find((item)=>item.profileId===profileId&&item.reminderKind===kind);} async saveSnooze(snooze:ReminderSnooze){this.snoozes=this.snoozes.filter((item)=>item.id!==snooze.id).concat(snooze);} async removeByProfile(profileId:string){this.days=this.days.filter((item)=>item.profileId!==profileId);this.sleep=this.sleep.filter((item)=>item.profileId!==profileId);}
}

function createService(routine:RoutineRepository,plans:WorkoutPlanRepository){return new RoutineService(routine,plans,{getActive:async()=>undefined} as unknown as WorkoutSessionRepository,()=>new Date('2026-08-24T12:00:00-03:00'),()=>`sleep-${Math.random()}`);}
function planRepository():WorkoutPlanRepository { const plan:WorkoutPlan={id:'plan-a',profileId:'profile-a',name:'Plano',goal:'hypertrophy',status:'active',startDate:'2026-08-01',currentVersion:1,versions:[{version:1,createdAt:'',templates:[{id:'template-a',name:'Full Body A',focus:'Corpo inteiro',scheduledDay:'monday',approximateMinutes:60,exercises:[]}]}],createdAt:'',updatedAt:''}; return {getActive:async(profileId)=>profileId==='profile-a'?plan:undefined,getById:async()=>undefined,list:async()=>[],save:async()=>undefined,removeByProfile:async()=>undefined}; }
