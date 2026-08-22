import { describe, expect, it } from 'vitest';
import { TrainingService } from './training-service';
import type { ExerciseRepository, TrainingProfileRepository, WorkoutPlanRepository, WorkoutSessionRepository } from '../../domain/training/repository';
import type { Exercise, ExerciseFavorite, TrainingProfile, WorkoutPlan, WorkoutSession, WorkoutSetLog } from '../../domain/training/training';

const stamp = '2026-08-21T12:00:00.000Z';
const supino: Exercise = { id: 'supino', name: 'Supino reto', normalizedName: 'supino reto', primaryMuscle: 'chest', secondaryMuscles: ['triceps'], equipment: ['barbell'], movementPattern: 'horizontal-push', laterality: 'bilateral', instructions: ['Preparar','Executar','Retornar'], source: 'custom', isCustom: true, ownerProfileId: 'a', metric: 'reps', createdAt: stamp, updatedAt: stamp };
const halteres: Exercise = { ...supino, id: 'halteres', name: 'Supino com halteres', normalizedName: 'supino com halteres', equipment: ['dumbbell'] };

class MemoryProfiles implements TrainingProfileRepository {
  values = new Map<string, TrainingProfile>();
  get(profileId: string) { return Promise.resolve([...this.values.values()].find((item) => item.profileId === profileId)); }
  async save(value: TrainingProfile) { this.values.set(value.id, structuredClone(value)); }
  async removeByProfile(profileId: string) { for (const [id, value] of this.values) if (value.profileId === profileId) this.values.delete(id); }
}
class MemoryExercises implements ExerciseRepository {
  values: Exercise[] = [supino, halteres]; favorites: ExerciseFavorite[] = [];
  list(profileId: string) { return Promise.resolve(this.values.filter((item) => !item.ownerProfileId || item.ownerProfileId === profileId).map((item) => structuredClone(item))); }
  async getById(profileId: string, id: string) { return (await this.list(profileId)).find((item) => item.id === id); }
  async saveCustom(exercise: Exercise) { this.values = [...this.values.filter((item) => item.id !== exercise.id), structuredClone(exercise)]; }
  async removeCustom(id: string, profileId: string) { this.values = this.values.filter((item) => item.id !== id || item.ownerProfileId !== profileId); }
  listFavorites(profileId: string) { return Promise.resolve(this.favorites.filter((item) => item.profileId === profileId)); }
  async saveFavorite(value: ExerciseFavorite) { this.favorites.push(value); }
  async removeFavorite(profileId: string, exerciseId: string) { this.favorites = this.favorites.filter((item) => item.profileId !== profileId || item.exerciseId !== exerciseId); }
}
class MemoryPlans implements WorkoutPlanRepository {
  values = new Map<string, WorkoutPlan>();
  getActive(profileId: string) { return Promise.resolve([...this.values.values()].find((item) => item.profileId === profileId && item.status === 'active')); }
  async getById(profileId: string, id: string) { const value = this.values.get(id); return value?.profileId === profileId ? structuredClone(value) : undefined; }
  list(profileId: string) { return Promise.resolve([...this.values.values()].filter((item) => item.profileId === profileId)); }
  async save(value: WorkoutPlan) { this.values.set(value.id, structuredClone(value)); }
  async removeByProfile(profileId: string) { for (const [id, value] of this.values) if (value.profileId === profileId) this.values.delete(id); }
}
class MemorySessions implements WorkoutSessionRepository {
  sessions = new Map<string, WorkoutSession>(); logs = new Map<string, WorkoutSetLog>();
  async getById(profileId: string, id: string) { const value = this.sessions.get(id); return value?.profileId === profileId ? structuredClone(value) : undefined; }
  getActive(profileId: string) { return Promise.resolve([...this.sessions.values()].find((item) => item.profileId === profileId && item.status === 'active')); }
  list(profileId: string) { return Promise.resolve([...this.sessions.values()].filter((item) => item.profileId === profileId).map((item) => structuredClone(item))); }
  listByDate(profileId: string, date: string) { return Promise.resolve([...this.sessions.values()].filter((item) => item.profileId === profileId && item.localDate === date)); }
  async save(value: WorkoutSession) { this.sessions.set(value.id, structuredClone(value)); }
  listSetLogs(profileId: string, sessionId: string) { return Promise.resolve([...this.logs.values()].filter((item) => item.profileId === profileId && item.sessionId === sessionId).map((item) => structuredClone(item))); }
  listExerciseLogs(profileId: string, exerciseId: string) { return Promise.resolve([...this.logs.values()].filter((item) => item.profileId === profileId && item.exerciseId === exerciseId)); }
  async saveSetLog(value: WorkoutSetLog) { this.logs.set(value.id, structuredClone(value)); }
  async removeSetLog(profileId: string, id: string) { const value = this.logs.get(id); if (value?.profileId === profileId) this.logs.delete(id); }
  async removeByProfile(profileId: string) { for (const [id, value] of this.sessions) if (value.profileId === profileId) this.sessions.delete(id); for (const [id, value] of this.logs) if (value.profileId === profileId) this.logs.delete(id); }
}

function plan(profileId = 'a'): WorkoutPlan { return { id: `plan-${profileId}`, profileId, name: 'Push', goal: 'hypertrophy', status: 'active', startDate: '2026-08-21', currentVersion: 1, versions: [{ version: 1, createdAt: stamp, templates: [{ id: `template-${profileId}`, name: 'Push A', focus: 'Peitoral', scheduledDay: 'friday', approximateMinutes: 60, exercises: [{ id: 'rx', exerciseId: 'supino', order: 0, setType: 'working', workingSets: 3, target: { metric: 'reps', minimum: 8, maximum: 12 }, loadUnit: 'kg', restSeconds: 90, loadIncrement: 2.5 }] }] }], createdAt: stamp, updatedAt: stamp }; }
function setup() { const profiles = new MemoryProfiles(); const exercises = new MemoryExercises(); const plans = new MemoryPlans(); const sessions = new MemorySessions(); plans.values.set('plan-a', plan('a')); plans.values.set('plan-b', plan('b')); let id = 0; let now = new Date(stamp); const service = new TrainingService(profiles, exercises, plans, sessions, () => now, () => `id-${++id}`); return { profiles, exercises, plans, sessions, service, setNow: (value: string) => { now = new Date(value); } }; }

describe('sessão de treino', () => {
  it('impede iniciar ficha de outro perfil', async () => { const { service } = setup(); await expect(service.startSession('a', 'plan-b', 'template-b')).rejects.toThrow(/não pertence/); });
  it('inicia e persiste sessão com snapshot da ficha', async () => { const { service, exercises } = setup(); const session = await service.startSession('a', 'plan-a', 'template-a'); exercises.values[0] = { ...supino, name: 'Nome alterado' }; expect(session.exercises[0]?.name).toBe('Supino reto'); expect((await service.getToday('a')).activeSession?.id).toBe(session.id); });
  it('inicia sessão avulsa em dia de descanso sem alterar ficha ou cronograma', async () => { const { service, plans, setNow } = setup(); setNow('2026-08-22T12:00:00.000Z'); const before = await plans.getById('a', 'plan-a'); expect((await service.getToday('a')).template).toBeUndefined(); const session = await service.startSession('a', 'plan-a', 'template-a'); expect(session).toMatchObject({ localDate: '2026-08-22', templateId: 'template-a', status: 'active' }); expect(await plans.getById('a', 'plan-a')).toEqual(before); });
  it('registra série imediatamente e calcula descanso por timestamp', async () => { const { service, sessions } = setup(); const session = await service.startSession('a', 'plan-a', 'template-a'); const result = await service.logSet('a', session.id, 'supino', 0, { actualLoad: 30, actualReps: 10, completed: true }); expect((await sessions.listSetLogs('a', session.id))[0]).toMatchObject({ actualLoad: 30, actualReps: 10, completed: true }); expect(result.session.restEndsAt).toBe('2026-08-21T12:01:30.000Z'); });
  it('sobrevive à criação de uma nova instância do serviço', async () => { const data = setup(); const session = await data.service.startSession('a', 'plan-a', 'template-a'); await data.service.logSet('a', session.id, 'supino', 0, { actualLoad: 30, actualReps: 10, completed: true }); const afterRefresh = new TrainingService(data.profiles, data.exercises, data.plans, data.sessions); expect((await afterRefresh.getToday('a')).activeSession?.id).toBe(session.id); expect(await afterRefresh.lastExerciseLogs('a', 'supino')).toHaveLength(1); expect(await afterRefresh.lastExerciseLogs('a', 'supino', session.id)).toHaveLength(0); });
  it('edita e remove uma série sem acessar outro perfil', async () => { const { service, sessions } = setup(); const session = await service.startSession('a', 'plan-a', 'template-a'); const first = await service.logSet('a', session.id, 'supino', 0, { actualLoad: 30, actualReps: 8, completed: true }); await service.logSet('a', session.id, 'supino', 0, { actualLoad: 32.5, actualReps: 9, completed: true }); expect((await sessions.listSetLogs('a', session.id))[0]?.actualLoad).toBe(32.5); await service.removeSet('a', session.id, first.log.id); expect(await sessions.listSetLogs('a', session.id)).toHaveLength(0); });
  it('pula exercício somente na sessão', async () => { const { service, plans } = setup(); const session = await service.startSession('a', 'plan-a', 'template-a'); const skipped = await service.skipExercise('a', session.id, 'supino'); expect(skipped.skippedExerciseIds).toContain('supino'); expect((await plans.getById('a', 'plan-a'))?.versions[0]?.templates[0]?.exercises).toHaveLength(1); });
  it('substitui exercício só hoje sem reescrever a ficha', async () => { const { service, plans } = setup(); const session = await service.startSession('a', 'plan-a', 'template-a'); const changed = await service.substituteForToday('a', session.id, 'supino', 'halteres'); expect(changed.exercises[0]?.name).toBe('Supino com halteres'); expect((await plans.getById('a', 'plan-a'))?.versions[0]?.templates[0]?.exercises[0]?.exerciseId).toBe('supino'); });
  it('finaliza sessão e a remove do estado ativo', async () => { const { service } = setup(); const session = await service.startSession('a', 'plan-a', 'template-a'); const completed = await service.finish('a', session.id); expect(completed.status).toBe('completed'); expect((await service.getToday('a')).activeSession).toBeUndefined(); });
  it('mantém sessões e logs isolados entre perfis', async () => { const { service, sessions } = setup(); const session = await service.startSession('a', 'plan-a', 'template-a'); await service.logSet('a', session.id, 'supino', 0, { actualLoad: 30, actualReps: 10, completed: true }); expect(await sessions.list('b')).toEqual([]); expect(await sessions.listSetLogs('b', session.id)).toEqual([]); await expect(service.logSet('b', session.id, 'supino', 1, { actualReps: 10, completed: true })).rejects.toThrow(/não foi encontrada/); });
});
