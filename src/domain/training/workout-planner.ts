import { BASE_EXERCISES } from './exercise-library';
import { TRAINING_DAYS, type Equipment, type Exercise, type MuscleGroup, type TrainingProfile, type WorkoutPlan, type WorkoutTemplate } from './training';
import { createUuid } from '../../shared/ids/create-uuid';

type TemplateRule = { name: string; focus: string; muscles: MuscleGroup[] };

const RULES: Record<number, TemplateRule[]> = {
  1: [{ name: 'Full Body', focus: 'Corpo inteiro', muscles: ['quadriceps', 'chest', 'back', 'hamstrings', 'side-delts', 'core'] }],
  2: [
    { name: 'Full Body A', focus: 'Corpo inteiro', muscles: ['quadriceps', 'chest', 'back', 'hamstrings', 'side-delts'] },
    { name: 'Full Body B', focus: 'Corpo inteiro', muscles: ['glutes', 'chest', 'lats', 'quadriceps', 'rear-delts'] },
  ],
  3: [
    { name: 'Full Body A', focus: 'Corpo inteiro', muscles: ['quadriceps', 'chest', 'back', 'hamstrings', 'side-delts'] },
    { name: 'Full Body B', focus: 'Corpo inteiro', muscles: ['glutes', 'lats', 'chest', 'quadriceps', 'rear-delts'] },
    { name: 'Full Body C', focus: 'Corpo inteiro', muscles: ['hamstrings', 'chest', 'back', 'quadriceps', 'core'] },
  ],
  4: [
    { name: 'Upper A', focus: 'Superiores', muscles: ['chest', 'back', 'side-delts', 'biceps', 'triceps'] },
    { name: 'Lower A', focus: 'Inferiores', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'core'] },
    { name: 'Upper B', focus: 'Superiores', muscles: ['lats', 'chest', 'rear-delts', 'biceps', 'triceps'] },
    { name: 'Lower B', focus: 'Inferiores', muscles: ['glutes', 'quadriceps', 'hamstrings', 'calves', 'core'] },
  ],
  5: [
    { name: 'Push', focus: 'Peito · Ombros · Tríceps', muscles: ['chest', 'front-delts', 'side-delts', 'triceps'] },
    { name: 'Pull', focus: 'Costas · Bíceps', muscles: ['lats', 'back', 'rear-delts', 'biceps'] },
    { name: 'Legs', focus: 'Pernas · Glúteos', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'] },
    { name: 'Upper', focus: 'Superiores', muscles: ['chest', 'back', 'side-delts', 'biceps', 'triceps'] },
    { name: 'Lower', focus: 'Inferiores', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'core'] },
  ],
  6: [
    { name: 'Push A', focus: 'Peito · Ombros · Tríceps', muscles: ['chest', 'front-delts', 'side-delts', 'triceps'] },
    { name: 'Pull A', focus: 'Costas · Bíceps', muscles: ['lats', 'back', 'rear-delts', 'biceps'] },
    { name: 'Legs A', focus: 'Quadríceps · Glúteos', muscles: ['quadriceps', 'glutes', 'hamstrings', 'calves'] },
    { name: 'Push B', focus: 'Peito · Ombros · Tríceps', muscles: ['chest', 'side-delts', 'front-delts', 'triceps'] },
    { name: 'Pull B', focus: 'Costas · Bíceps', muscles: ['back', 'lats', 'rear-delts', 'biceps'] },
    { name: 'Legs B', focus: 'Posteriores · Glúteos', muscles: ['hamstrings', 'glutes', 'quadriceps', 'calves'] },
  ],
  7: [],
};

export interface StarterPlanResult { plan: WorkoutPlan; warnings: string[]; }

function equipmentCompatible(exercise: Exercise, profile: TrainingProfile): boolean {
  const available = new Set<Equipment>(profile.availableEquipment);
  if (profile.trainingLocation !== 'home' && available.size === 0) return true;
  return exercise.equipment.every((item) => available.has(item)) || exercise.equipment.includes('bodyweight');
}

export function generateStarterPlan(profile: TrainingProfile, now = new Date(), id: () => string = createUuid): StarterPlanResult {
  const dayCount = Math.min(6, Math.max(1, profile.availableDaysPerWeek));
  const rules = RULES[dayCount] ?? RULES[3]!;
  const days = profile.preferredTrainingDays.length >= dayCount
    ? profile.preferredTrainingDays.slice(0, dayCount)
    : TRAINING_DAYS.filter((day) => day !== 'sunday').slice(0, dayCount);
  const avoided = new Set(profile.avoidedExercises);
  const candidates = BASE_EXERCISES.filter((exercise) => !avoided.has(exercise.id) && equipmentCompatible(exercise, profile));
  const usedByMuscle = new Map<MuscleGroup, number>();
  const maxExercises = profile.averageSessionMinutes <= 45 ? 4 : profile.averageSessionMinutes >= 75 ? 6 : 5;
  const templates: WorkoutTemplate[] = rules.map((rule, templateIndex) => {
    const selected: Exercise[] = [];
    for (const muscle of rule.muscles) {
      const matches = candidates.filter((exercise) => exercise.primaryMuscle === muscle && !selected.some((item) => item.id === exercise.id));
      if (!matches.length) continue;
      const offset = usedByMuscle.get(muscle) ?? 0;
      const exercise = matches[(offset + templateIndex) % matches.length];
      if (exercise) { selected.push(exercise); usedByMuscle.set(muscle, offset + 1); }
      if (selected.length >= maxExercises) break;
    }
    return {
      id: id(), name: rule.name, focus: rule.focus, scheduledDay: days[templateIndex] ?? TRAINING_DAYS[templateIndex] ?? 'monday', approximateMinutes: profile.averageSessionMinutes,
      exercises: selected.map((exercise, order) => ({
        id: id(), exerciseId: exercise.id, order, setType: 'working', workingSets: profile.experienceLevel === 'beginner' ? 3 : 4,
        target: exercise.metric === 'seconds' ? { metric: 'seconds', minimum: 30, maximum: 60 } : profile.primaryGoal === 'strength' ? { metric: 'reps', minimum: 4, maximum: 6 } : { metric: 'reps', minimum: 8, maximum: 12 },
        loadUnit: exercise.equipment.includes('bodyweight') ? 'none' : profile.weightUnit,
        restSeconds: profile.primaryGoal === 'strength' ? 180 : exercise.movementPattern === 'isolation' ? 60 : 90,
        loadIncrement: profile.defaultLoadIncrement,
      })),
    };
  });
  const timestamp = now.toISOString();
  const plan: WorkoutPlan = { id: id(), profileId: profile.profileId, name: `Plano ${dayCount}x por semana`, goal: profile.primaryGoal, status: 'active', startDate: timestamp.slice(0, 10), currentVersion: 1, versions: [{ version: 1, createdAt: timestamp, note: 'Sugestão inicial editável', templates }], createdAt: timestamp, updatedAt: timestamp };
  const warnings = profile.informedLimitations?.trim() ? ['Limitações informadas exigem revisão manual. O DEFYN não interpreta condições clínicas.'] : [];
  if (templates.some((template) => template.exercises.length < 3)) warnings.push('Poucos exercícios são compatíveis com os equipamentos informados. Revise a ficha manualmente.');
  return { plan, warnings };
}

export function withNewPlanVersion(plan: WorkoutPlan, templates: WorkoutTemplate[], note: string, now = new Date()): WorkoutPlan {
  const version = plan.currentVersion + 1;
  return { ...plan, currentVersion: version, versions: [...plan.versions, { version, createdAt: now.toISOString(), note, templates: structuredClone(templates) }], updatedAt: now.toISOString() };
}
