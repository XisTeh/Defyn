import { EQUIPMENT_LABELS, MUSCLE_LABELS, type Equipment, type Exercise, type MuscleGroup } from './training';
import { EXTENDED_EXERCISE_ROWS, type ExerciseSeed } from './exercise-catalog-extended';

const originalRows: readonly ExerciseSeed[] = [
  ['Supino reto com barra', 'chest', ['barbell', 'bench'], 'horizontal-push', ['triceps', 'front-delts']],
  ['Supino reto com halteres', 'chest', ['dumbbell', 'bench'], 'horizontal-push', ['triceps', 'front-delts']],
  ['Supino inclinado com halteres', 'chest', ['dumbbell', 'bench'], 'horizontal-push', ['front-delts', 'triceps']],
  ['Supino na máquina', 'chest', ['machine'], 'horizontal-push', ['triceps', 'front-delts']],
  ['Crucifixo com halteres', 'chest', ['dumbbell', 'bench'], 'isolation', ['front-delts']],
  ['Crossover na polia', 'chest', ['cable'], 'isolation', ['front-delts']],
  ['Flexão de braços', 'chest', ['bodyweight'], 'horizontal-push', ['triceps', 'front-delts']],
  ['Puxada frontal', 'lats', ['cable'], 'vertical-pull', ['biceps', 'back']],
  ['Barra fixa', 'lats', ['bodyweight'], 'vertical-pull', ['biceps', 'back']],
  ['Remada baixa', 'back', ['cable'], 'horizontal-pull', ['lats', 'biceps']],
  ['Remada curvada com barra', 'back', ['barbell'], 'horizontal-pull', ['lats', 'biceps']],
  ['Remada unilateral com halter', 'back', ['dumbbell', 'bench'], 'horizontal-pull', ['lats', 'biceps']],
  ['Remada máquina articulada', 'back', ['machine'], 'horizontal-pull', ['lats', 'biceps']],
  ['Pulldown com braços estendidos', 'lats', ['cable'], 'isolation', ['back']],
  ['Desenvolvimento com halteres', 'front-delts', ['dumbbell', 'bench'], 'vertical-push', ['side-delts', 'triceps']],
  ['Desenvolvimento na máquina', 'front-delts', ['machine'], 'vertical-push', ['side-delts', 'triceps']],
  ['Elevação lateral', 'side-delts', ['dumbbell'], 'isolation'],
  ['Crucifixo inverso', 'rear-delts', ['machine'], 'isolation', ['back']],
  ['Face pull', 'rear-delts', ['cable'], 'horizontal-pull', ['traps', 'back']],
  ['Rosca direta com barra', 'biceps', ['barbell'], 'isolation', ['forearms']],
  ['Rosca alternada', 'biceps', ['dumbbell'], 'isolation', ['forearms']],
  ['Rosca martelo', 'biceps', ['dumbbell'], 'isolation', ['forearms']],
  ['Rosca Scott', 'biceps', ['barbell', 'bench'], 'isolation', ['forearms']],
  ['Tríceps corda', 'triceps', ['cable'], 'isolation'],
  ['Tríceps barra', 'triceps', ['cable'], 'isolation'],
  ['Tríceps francês', 'triceps', ['dumbbell'], 'isolation'],
  ['Tríceps testa', 'triceps', ['barbell', 'bench'], 'isolation'],
  ['Agachamento livre', 'quadriceps', ['barbell'], 'squat', ['glutes', 'hamstrings']],
  ['Agachamento goblet', 'quadriceps', ['dumbbell'], 'squat', ['glutes']],
  ['Agachamento no smith', 'quadriceps', ['smith'], 'squat', ['glutes']],
  ['Leg press 45°', 'quadriceps', ['leg-press'], 'squat', ['glutes', 'hamstrings']],
  ['Cadeira extensora', 'quadriceps', ['machine'], 'knee-extension'],
  ['Afundo com halteres', 'quadriceps', ['dumbbell'], 'squat', ['glutes']],
  ['Passada', 'quadriceps', ['dumbbell'], 'squat', ['glutes']],
  ['Cadeira flexora', 'hamstrings', ['machine'], 'knee-flexion'],
  ['Mesa flexora', 'hamstrings', ['machine'], 'knee-flexion'],
  ['Stiff com barra', 'hamstrings', ['barbell'], 'hinge', ['glutes']],
  ['Levantamento terra romeno com halteres', 'hamstrings', ['dumbbell'], 'hinge', ['glutes', 'back']],
  ['Levantamento terra', 'glutes', ['barbell'], 'hinge', ['hamstrings', 'back']],
  ['Elevação pélvica', 'glutes', ['barbell', 'bench'], 'hinge', ['hamstrings']],
  ['Ponte de glúteos', 'glutes', ['bodyweight'], 'hinge', ['hamstrings']],
  ['Cadeira abdutora', 'glutes', ['machine'], 'isolation'],
  ['Cadeira adutora', 'adductors', ['machine'], 'isolation'],
  ['Panturrilha em pé', 'calves', ['machine'], 'calf'],
  ['Panturrilha sentado', 'calves', ['machine'], 'calf'],
  ['Panturrilha unilateral', 'calves', ['bodyweight'], 'calf'],
  ['Prancha frontal', 'core', ['bodyweight'], 'core'],
  ['Abdominal supra', 'core', ['bodyweight'], 'core'],
  ['Elevação de pernas', 'core', ['bodyweight'], 'core'],
  ['Abdominal na polia', 'core', ['cable'], 'core'],
  ['Encolhimento com halteres', 'traps', ['dumbbell'], 'isolation'],
  ['Rosca de punho', 'forearms', ['dumbbell'], 'isolation'],
] as const;

const rows: readonly ExerciseSeed[] = [...originalRows, ...EXTENDED_EXERCISE_ROWS];

// The public catalog only exposes exercises that have their own reviewed thumbnail.
// IDs remain based on the complete seed list so existing plans never change meaning.
const illustratedTailIds = new Set(['defyn-exercise-239', 'defyn-exercise-241', 'defyn-exercise-242', 'defyn-exercise-243', 'defyn-exercise-249', 'defyn-exercise-333', 'defyn-exercise-334', 'defyn-exercise-335']);

export function normalizeExerciseName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
}

const timestamp = '2026-01-01T00:00:00.000Z';

export const BASE_EXERCISES: readonly Exercise[] = rows.map<Exercise>(([name, primaryMuscle, equipment, movementPattern, secondaryMuscles = []], index) => ({
  id: `defyn-exercise-${String(index + 1).padStart(2, '0')}`,
  name,
  normalizedName: normalizeExerciseName(name),
  primaryMuscle,
  secondaryMuscles: [...secondaryMuscles],
  equipment: [...equipment],
  movementPattern,
  laterality: /alternad[ao]s?|caminhando/i.test(name) ? 'alternating' : /unilateral|búlgaro|pistol|step-up|step-down|meadows|serrote|suitcase|manguito rotador/i.test(name) ? 'unilateral' : 'bilateral',
  instructions: [
    'Ajuste a posição e estabilize o corpo antes de iniciar.',
    'Execute com amplitude confortável e controle o movimento.',
    'Retorne sem perder a postura e interrompa se houver dor.',
  ],
  source: 'defyn',
  isCustom: false,
  metric: /prancha|\bhold\b|isometri/i.test(name) ? 'seconds' : 'reps',
  createdAt: timestamp,
  updatedAt: timestamp,
})).filter((exercise, index) => index < 236 || illustratedTailIds.has(exercise.id));

export function findBaseExercise(id: string): Exercise | undefined {
  return BASE_EXERCISES.find((exercise) => exercise.id === id);
}

export function searchExercises(exercises: readonly Exercise[], query: string, muscle?: MuscleGroup, equipment?: Equipment): Exercise[] {
  const normalized = normalizeExerciseName(query);
  const queryTokens = normalized.split(' ').filter(Boolean);
  return exercises.filter((exercise) => {
    const searchableText = [
      exercise.normalizedName,
      normalizeExerciseName(MUSCLE_LABELS[exercise.primaryMuscle]),
      ...exercise.equipment.map((item) => normalizeExerciseName(EQUIPMENT_LABELS[item])),
    ].join(' ');
    return queryTokens.every((token) => searchableText.includes(token)) &&
      (!muscle || exercise.primaryMuscle === muscle || exercise.secondaryMuscles.includes(muscle)) &&
      (!equipment || exercise.equipment.includes(equipment));
  });
}
