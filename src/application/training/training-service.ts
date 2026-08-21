import { BASE_EXERCISES } from '../../domain/training/exercise-library';
import type { ExerciseRepository, TrainingProfileRepository, WorkoutPlanRepository, WorkoutSessionRepository } from '../../domain/training/repository';
import { currentPlanVersion, localDayFor, type TrainingProfile, type WorkoutExercisePrescription, type WorkoutPlan, type WorkoutSession, type WorkoutSetLog, type WorkoutTemplate } from '../../domain/training/training';
import { generateStarterPlan, withNewPlanVersion } from '../../domain/training/workout-planner';
import { toLocalDateKey } from '../../domain/shared/local-date';

export interface TodayWorkout {
  plan?: WorkoutPlan;
  template?: WorkoutTemplate;
  activeSession?: WorkoutSession;
}

export class TrainingService {
  constructor(
    private readonly profiles: TrainingProfileRepository,
    private readonly exercises: ExerciseRepository,
    private readonly plans: WorkoutPlanRepository,
    private readonly sessions: WorkoutSessionRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly id: () => string = () => crypto.randomUUID(),
  ) {}

  async setupProfile(profile: Omit<TrainingProfile, 'id' | 'createdAt' | 'updatedAt'>, createPlan = true) {
    const timestamp = this.now().toISOString();
    const existing = await this.profiles.get(profile.profileId);
    const saved: TrainingProfile = { ...profile, id: existing?.id ?? this.id(), createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp };
    await this.profiles.save(saved);
    if (!createPlan) return { profile: saved };
    const generated = generateStarterPlan(saved, this.now(), this.id);
    await this.plans.save(generated.plan);
    return { profile: saved, plan: generated.plan, warnings: generated.warnings };
  }

  async getToday(profileId: string, date = this.now()): Promise<TodayWorkout> {
    const [plan, activeSession] = await Promise.all([this.plans.getActive(profileId), this.sessions.getActive(profileId)]);
    if (!plan) return { activeSession };
    const version = currentPlanVersion(plan);
    return { plan, template: version.templates.find((item) => item.scheduledDay === localDayFor(date)), activeSession };
  }

  async startSession(profileId: string, planId: string, templateId: string): Promise<WorkoutSession> {
    const active = await this.sessions.getActive(profileId);
    if (active) return active;
    const plan = await this.plans.getById(profileId, planId);
    if (!plan) throw new Error('A ficha selecionada não pertence a este perfil.');
    const version = currentPlanVersion(plan);
    const template = version.templates.find((item) => item.id === templateId);
    if (!template) throw new Error('O treino selecionado não existe nesta ficha.');
    const catalog = await this.exercises.list(profileId);
    const timestamp = this.now().toISOString();
    const session: WorkoutSession = {
      id: this.id(), profileId, planId: plan.id, planVersion: version.version, templateId: template.id, templateName: template.name,
      localDate: toLocalDateKey(this.now()), status: 'active', startedAt: timestamp, currentExerciseIndex: 0, skippedExerciseIds: [],
      exercises: template.exercises.map((prescription) => {
        const exercise = catalog.find((item) => item.id === prescription.exerciseId) ?? BASE_EXERCISES.find((item) => item.id === prescription.exerciseId);
        if (!exercise) throw new Error('Um exercício da ficha não está mais disponível.');
        return { prescriptionId: prescription.id, exerciseId: exercise.id, name: exercise.name, primaryMuscle: exercise.primaryMuscle, equipment: [...exercise.equipment], metric: exercise.metric, workingSets: prescription.workingSets, target: { ...prescription.target }, targetLoad: prescription.targetLoad, loadUnit: prescription.loadUnit, restSeconds: prescription.restSeconds, rirTarget: prescription.rirTarget, loadIncrement: prescription.loadIncrement, notes: prescription.notes };
      }),
      createdAt: timestamp, updatedAt: timestamp,
    };
    await this.sessions.save(session);
    return session;
  }

  async logSet(profileId: string, sessionId: string, exerciseId: string, setIndex: number, values: { actualLoad?: number; actualReps?: number; durationSeconds?: number; rir?: number; completed: boolean }): Promise<{ log: WorkoutSetLog; session: WorkoutSession }> {
    const session = await this.sessions.getById(profileId, sessionId);
    if (!session || session.status !== 'active') throw new Error('A sessão ativa não foi encontrada para este perfil.');
    const exercise = session.exercises.find((item) => item.exerciseId === exerciseId);
    if (!exercise || setIndex < 0 || setIndex >= exercise.workingSets) throw new Error('A série não pertence a esta sessão.');
    const existing = (await this.sessions.listSetLogs(profileId, sessionId)).find((item) => item.exerciseId === exerciseId && item.setIndex === setIndex);
    const timestamp = this.now().toISOString();
    const log: WorkoutSetLog = {
      id: existing?.id ?? this.id(), profileId, sessionId, exerciseId, exerciseNameSnapshot: exercise.name, setIndex, setType: 'working', target: { ...exercise.target },
      actualLoad: values.actualLoad, loadUnit: exercise.loadUnit, actualReps: values.actualReps, durationSeconds: values.durationSeconds, rir: values.rir,
      completed: values.completed, completedAt: values.completed ? timestamp : undefined, createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp,
    };
    const nextSession = values.completed && exercise.restSeconds > 0
      ? { ...session, restEndsAt: new Date(this.now().getTime() + exercise.restSeconds * 1000).toISOString(), updatedAt: timestamp }
      : { ...session, updatedAt: timestamp };
    await this.sessions.saveSetLog(log);
    await this.sessions.save(nextSession);
    return { log, session: nextSession };
  }

  async removeSet(profileId: string, sessionId: string, logId: string): Promise<void> {
    const session = await this.sessions.getById(profileId, sessionId);
    if (!session || session.status !== 'active') throw new Error('Sessão ativa não encontrada.');
    await this.sessions.removeSetLog(profileId, logId);
  }

  async updateSession(session: WorkoutSession): Promise<void> {
    const current = await this.sessions.getById(session.profileId, session.id);
    if (!current) throw new Error('Sessão não encontrada.');
    await this.sessions.save({ ...session, updatedAt: this.now().toISOString() });
  }

  async skipExercise(profileId: string, sessionId: string, exerciseId: string): Promise<WorkoutSession> {
    const session = await this.sessions.getById(profileId, sessionId);
    if (!session || session.status !== 'active') throw new Error('Sessão ativa não encontrada.');
    const index = session.exercises.findIndex((item) => item.exerciseId === exerciseId);
    const next = { ...session, skippedExerciseIds: [...new Set([...session.skippedExerciseIds, exerciseId])], currentExerciseIndex: Math.min(session.exercises.length - 1, Math.max(session.currentExerciseIndex, index + 1)), restEndsAt: undefined, updatedAt: this.now().toISOString() };
    await this.sessions.save(next);
    return next;
  }

  async substituteForToday(profileId: string, sessionId: string, exerciseId: string, replacementId: string): Promise<WorkoutSession> {
    const session = await this.sessions.getById(profileId, sessionId);
    if (!session || session.status !== 'active') throw new Error('Sessão ativa não encontrada.');
    const replacement = await this.exercises.getById(profileId, replacementId);
    const index = session.exercises.findIndex((item) => item.exerciseId === exerciseId);
    if (!replacement || index < 0) throw new Error('Substituição inválida.');
    const previous = session.exercises[index];
    if (!previous) throw new Error('Exercício não encontrado na sessão.');
    const exercises = session.exercises.map((item, currentIndex) => currentIndex === index ? { ...item, exerciseId: replacement.id, name: replacement.name, primaryMuscle: replacement.primaryMuscle, equipment: [...replacement.equipment], metric: replacement.metric, loadUnit: replacement.equipment.includes('bodyweight') ? 'none' : item.loadUnit, target: replacement.metric === item.target.metric ? item.target : replacement.metric === 'seconds' ? { metric: 'seconds' as const, minimum: 30, maximum: 60 } : { metric: 'reps' as const, minimum: 8, maximum: 12 } } : item);
    const next = { ...session, exercises, updatedAt: this.now().toISOString() };
    await this.sessions.save(next);
    return next;
  }

  async finish(profileId: string, sessionId: string): Promise<WorkoutSession> {
    const session = await this.sessions.getById(profileId, sessionId);
    if (!session || session.status !== 'active') throw new Error('Sessão ativa não encontrada.');
    const timestamp = this.now().toISOString();
    const completed = { ...session, status: 'completed' as const, completedAt: timestamp, restEndsAt: undefined, updatedAt: timestamp };
    await this.sessions.save(completed);
    return completed;
  }

  async cancel(profileId: string, sessionId: string): Promise<WorkoutSession> {
    const session = await this.sessions.getById(profileId, sessionId);
    if (!session || session.status !== 'active') throw new Error('Sessão ativa não encontrada.');
    const timestamp = this.now().toISOString();
    const cancelled = { ...session, status: 'cancelled' as const, completedAt: timestamp, restEndsAt: undefined, updatedAt: timestamp };
    await this.sessions.save(cancelled);
    return cancelled;
  }

  async saveEditedPlan(profileId: string, planId: string, templates: WorkoutTemplate[], note = 'Ficha editada'): Promise<WorkoutPlan> {
    const plan = await this.plans.getById(profileId, planId);
    if (!plan) throw new Error('A ficha selecionada não pertence a este perfil.');
    const updated = withNewPlanVersion(plan, templates, note, this.now());
    await this.plans.save(updated);
    return updated;
  }

  async lastExerciseLogs(profileId: string, exerciseId: string, excludeSessionId?: string): Promise<WorkoutSetLog[]> {
    const logs = await this.sessions.listExerciseLogs(profileId, exerciseId);
    const completed = logs.filter((log) => log.completed && log.completedAt && log.sessionId !== excludeSessionId).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
    const latestSession = completed[0]?.sessionId;
    return latestSession ? completed.filter((log) => log.sessionId === latestSession).sort((a, b) => a.setIndex - b.setIndex) : [];
  }

  static reorder(exercises: WorkoutExercisePrescription[], from: number, to: number): WorkoutExercisePrescription[] {
    const result = [...exercises];
    const [moved] = result.splice(from, 1);
    if (!moved) return exercises;
    result.splice(to, 0, moved);
    return result.map((item, order) => ({ ...item, order }));
  }
}
