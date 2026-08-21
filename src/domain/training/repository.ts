import type { Exercise, ExerciseFavorite, TrainingProfile, WorkoutPlan, WorkoutSession, WorkoutSetLog } from './training';

export interface TrainingProfileRepository {
  get(profileId: string): Promise<TrainingProfile | undefined>;
  save(profile: TrainingProfile): Promise<void>;
  removeByProfile(profileId: string): Promise<void>;
}

export interface ExerciseRepository {
  list(profileId: string): Promise<Exercise[]>;
  getById(profileId: string, exerciseId: string): Promise<Exercise | undefined>;
  saveCustom(exercise: Exercise): Promise<void>;
  removeCustom(exerciseId: string, profileId: string): Promise<void>;
  listFavorites(profileId: string): Promise<ExerciseFavorite[]>;
  saveFavorite(favorite: ExerciseFavorite): Promise<void>;
  removeFavorite(profileId: string, exerciseId: string): Promise<void>;
}

export interface WorkoutPlanRepository {
  getActive(profileId: string): Promise<WorkoutPlan | undefined>;
  getById(profileId: string, planId: string): Promise<WorkoutPlan | undefined>;
  list(profileId: string): Promise<WorkoutPlan[]>;
  save(plan: WorkoutPlan): Promise<void>;
  removeByProfile(profileId: string): Promise<void>;
}

export interface WorkoutSessionRepository {
  getById(profileId: string, sessionId: string): Promise<WorkoutSession | undefined>;
  getActive(profileId: string): Promise<WorkoutSession | undefined>;
  list(profileId: string): Promise<WorkoutSession[]>;
  listByPeriod?(profileId: string, startLocalDate: string | undefined, endLocalDate: string): Promise<WorkoutSession[]>;
  listByDate(profileId: string, localDate: string): Promise<WorkoutSession[]>;
  save(session: WorkoutSession): Promise<void>;
  listSetLogs(profileId: string, sessionId: string): Promise<WorkoutSetLog[]>;
  listExerciseLogs(profileId: string, exerciseId: string): Promise<WorkoutSetLog[]>;
  listSetLogsForSessions?(profileId: string, sessionIds: string[]): Promise<WorkoutSetLog[]>;
  saveSetLog(log: WorkoutSetLog): Promise<void>;
  removeSetLog(profileId: string, logId: string): Promise<void>;
  removeByProfile(profileId: string): Promise<void>;
}
