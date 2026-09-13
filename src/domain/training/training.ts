import type { AuditedEntity, IsoDate } from '../shared/types';

export const TRAINING_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type TrainingDay = typeof TRAINING_DAYS[number];
export type TrainingGoal = 'hypertrophy' | 'strength' | 'conditioning' | 'body-composition' | 'custom';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type TrainingLocation = 'gym' | 'home' | 'both';
export type Equipment = 'barbell' | 'ez-bar' | 'trap-bar' | 'dumbbell' | 'kettlebell' | 'bench' | 'machine' | 'cable' | 'smith' | 'landmine' | 'leg-press' | 'bodyweight' | 'band' | 'suspension' | 'rings' | 'medicine-ball' | 'stability-ball' | 'ab-wheel' | 'plate' | 'step' | 'sled' | 'battle-rope' | 'other';
export type MuscleGroup = 'chest' | 'back' | 'lats' | 'lower-back' | 'traps' | 'front-delts' | 'side-delts' | 'rear-delts' | 'rotator-cuff' | 'biceps' | 'triceps' | 'forearms' | 'quadriceps' | 'hamstrings' | 'glutes' | 'calves' | 'tibialis' | 'core' | 'hip-flexors' | 'adductors' | 'neck' | 'full-body' | 'other';
export type MovementPattern = 'horizontal-push' | 'vertical-push' | 'horizontal-pull' | 'vertical-pull' | 'squat' | 'hinge' | 'knee-extension' | 'knee-flexion' | 'isolation' | 'core' | 'rotation' | 'calf' | 'carry' | 'locomotion' | 'olympic' | 'plyometric' | 'other';
export type LoadUnit = 'kg' | 'lb' | 'plate' | 'none';
export type SetType = 'warmup' | 'working' | 'optional';

export interface TrainingProfile extends AuditedEntity {
  profileId: string;
  primaryGoal: TrainingGoal;
  experienceLevel: ExperienceLevel;
  availableDaysPerWeek: number;
  preferredTrainingDays: TrainingDay[];
  averageSessionMinutes: number;
  trainingLocation: TrainingLocation;
  availableEquipment: Equipment[];
  preferredExercises: string[];
  avoidedExercises: string[];
  informedLimitations?: string;
  weightUnit: Extract<LoadUnit, 'kg' | 'lb'>;
  defaultLoadIncrement: number;
  advancedMode: boolean;
}

export interface Exercise extends AuditedEntity {
  name: string;
  normalizedName: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];
  movementPattern: MovementPattern;
  laterality: 'bilateral' | 'unilateral' | 'alternating';
  instructions: [string, string, string];
  notes?: string;
  thumbnailMediaId?: string;
  imageMediaId?: string;
  source: 'defyn' | 'custom';
  isCustom: boolean;
  ownerProfileId?: string;
  metric: 'reps' | 'seconds';
}

export interface ExerciseFavorite extends AuditedEntity {
  profileId: string;
  exerciseId: string;
}

export interface RepTarget {
  metric: 'reps' | 'seconds';
  minimum: number;
  maximum: number;
}

export interface WorkoutExercisePrescription {
  id: string;
  exerciseId: string;
  order: number;
  setType: SetType;
  workingSets: number;
  target: RepTarget;
  targetLoad?: number;
  loadUnit: LoadUnit;
  restSeconds: number;
  rirTarget?: number;
  loadIncrement?: number;
  notes?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  focus: string;
  scheduledDay: TrainingDay;
  approximateMinutes: number;
  exercises: WorkoutExercisePrescription[];
}

export interface WorkoutPlanVersion {
  version: number;
  createdAt: string;
  note?: string;
  templates: WorkoutTemplate[];
}

export interface WorkoutPlan extends AuditedEntity {
  profileId: string;
  name: string;
  goal: TrainingGoal;
  status: 'active' | 'archived';
  startDate: IsoDate;
  currentVersion: number;
  versions: WorkoutPlanVersion[];
}

export interface WorkoutExerciseSnapshot {
  prescriptionId: string;
  exerciseId: string;
  name: string;
  primaryMuscle: MuscleGroup;
  equipment: Equipment[];
  metric: 'reps' | 'seconds';
  workingSets: number;
  target: RepTarget;
  targetLoad?: number;
  loadUnit: LoadUnit;
  restSeconds: number;
  rirTarget?: number;
  loadIncrement?: number;
  notes?: string;
}

export interface WorkoutSession extends AuditedEntity {
  profileId: string;
  planId: string;
  planVersion: number;
  templateId: string;
  templateName: string;
  localDate: IsoDate;
  status: 'active' | 'completed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  restEndsAt?: string;
  currentExerciseIndex: number;
  exercises: WorkoutExerciseSnapshot[];
  skippedExerciseIds: string[];
  notes?: string;
}

export interface WorkoutSetLog extends AuditedEntity {
  profileId: string;
  sessionId: string;
  exerciseId: string;
  exerciseNameSnapshot: string;
  setIndex: number;
  setType: SetType;
  target: RepTarget;
  actualLoad?: number;
  loadUnit: LoadUnit;
  actualReps?: number;
  durationSeconds?: number;
  rir?: number;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface ProgressionSuggestion {
  exerciseId: string;
  kind: 'increase' | 'maintain' | 'review';
  message: string;
  suggestedLoad?: number;
}

export const DAY_LABELS: Record<TrainingDay, string> = {
  monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua', thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom',
};

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Peitoral', back: 'Costas', lats: 'Dorsais', 'lower-back': 'Lombar', traps: 'Trapézio', 'front-delts': 'Deltoide anterior', 'side-delts': 'Deltoide lateral', 'rear-delts': 'Deltoide posterior', 'rotator-cuff': 'Manguito rotador', biceps: 'Bíceps', triceps: 'Tríceps', forearms: 'Antebraços', quadriceps: 'Quadríceps', hamstrings: 'Posteriores', glutes: 'Glúteos', calves: 'Panturrilhas', tibialis: 'Tibial anterior', core: 'Core', 'hip-flexors': 'Flexores do quadril', adductors: 'Adutores', neck: 'Pescoço', 'full-body': 'Corpo inteiro', other: 'Outros',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barra', 'ez-bar': 'Barra W', 'trap-bar': 'Trap bar', dumbbell: 'Halteres', kettlebell: 'Kettlebell', bench: 'Banco', machine: 'Máquina', cable: 'Polia', smith: 'Smith', landmine: 'Landmine', 'leg-press': 'Leg press', bodyweight: 'Peso corporal', band: 'Elástico', suspension: 'Fita de suspensão', rings: 'Argolas', 'medicine-ball': 'Medicine ball', 'stability-ball': 'Bola suíça', 'ab-wheel': 'Roda abdominal', plate: 'Anilha', step: 'Caixa ou step', sled: 'Trenó', 'battle-rope': 'Corda naval', other: 'Outro',
};

export function localDayFor(date: Date): TrainingDay {
  return TRAINING_DAYS[(date.getDay() + 6) % 7] ?? 'monday';
}

export function currentPlanVersion(plan: WorkoutPlan): WorkoutPlanVersion {
  const version = plan.versions.find((candidate) => candidate.version === plan.currentVersion);
  if (!version) throw new Error('A versão ativa da ficha não foi encontrada.');
  return version;
}

export function sessionVolume(logs: readonly WorkoutSetLog[]): number {
  return logs.reduce((total, log) => total + (log.completed && log.actualLoad !== undefined && log.actualReps !== undefined && (log.loadUnit === 'kg' || log.loadUnit === 'lb') ? log.actualLoad * log.actualReps : 0), 0);
}

export function calculateTrainingAdherence(sessions: readonly WorkoutSession[], plannedSessions: number): number {
  if (plannedSessions <= 0) return 0;
  const completed = sessions.filter((session) => session.status === 'completed').length;
  return Math.min(100, Math.round((completed / plannedSessions) * 100));
}

export function remainingRestSeconds(restEndsAt: string | undefined, now = new Date()): number {
  if (!restEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(restEndsAt).getTime() - now.getTime()) / 1000));
}
