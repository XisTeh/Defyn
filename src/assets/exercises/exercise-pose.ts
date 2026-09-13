import type { Exercise } from '../../domain/training/training';
import type { ExerciseIllustrationPose } from './exercise-media';

const hasAny = (value: string, terms: readonly string[]) => terms.some((term) => value.includes(term));

/** Selects the closest technical figure for catalog and custom exercises without a PNG. */
export function resolveExerciseIllustrationPose(exercise: Exercise): ExerciseIllustrationPose {
  const name = exercise.normalizedName;
  const equipment = new Set(exercise.equipment);
  const usesMachine = equipment.has('machine') || equipment.has('leg-press');
  const usesCable = equipment.has('cable');
  const usesDumbbell = equipment.has('dumbbell') || equipment.has('kettlebell');
  const usesBar = equipment.has('barbell') || equipment.has('ez-bar') || equipment.has('trap-bar') || equipment.has('landmine');

  if (exercise.primaryMuscle === 'core' || exercise.primaryMuscle === 'hip-flexors') {
    if (usesCable || equipment.has('machine')) return 'cable-crunch';
    if (hasAny(name, ['prancha', 'plank', 'hold', 'body saw', 'dead bug', 'bird dog'])) return 'plank';
    if (hasAny(name, ['elevacao', 'joelho', 'perna', 'canivete', 'remador'])) return 'leg-raise';
    return 'crunch';
  }

  if (exercise.primaryMuscle === 'calves' || exercise.primaryMuscle === 'tibialis') {
    if (exercise.laterality !== 'bilateral') return 'single-calf';
    if (hasAny(name, ['sentado', 'sentada'])) return 'seated-calf';
    return 'standing-calf';
  }

  if (exercise.primaryMuscle === 'quadriceps' || exercise.primaryMuscle === 'adductors') {
    if (equipment.has('leg-press')) return 'leg-press';
    if (exercise.movementPattern === 'knee-extension') return 'leg-extension';
    if (exercise.laterality !== 'bilateral' || hasAny(name, ['afundo', 'passada', 'step-', 'lunge', 'bulgaro'])) return 'lunge';
    if (equipment.has('smith')) return 'smith-squat';
    if (usesMachine) return 'leg-press';
    if (usesDumbbell) return 'goblet-squat';
    return 'squat';
  }

  if (exercise.primaryMuscle === 'hamstrings') {
    if (exercise.movementPattern === 'knee-flexion') return hasAny(name, ['mesa', 'deitad', 'nordica', 'bola']) ? 'prone-leg-curl' : 'seated-leg-curl';
    return usesDumbbell ? 'dumbbell-hinge' : 'barbell-hinge';
  }

  if (exercise.primaryMuscle === 'glutes') {
    if (name.includes('hip thrust') || name.includes('elevação pélvica')) return 'hip-thrust';
    if (hasAny(name, ['ponte', 'frog pump'])) return 'glute-bridge';
    if (hasAny(name, ['abducao', 'coice', 'caminhada lateral'])) return 'hip-abduction';
    if (exercise.movementPattern === 'squat') return equipment.has('smith') ? 'smith-squat' : usesDumbbell ? 'goblet-squat' : 'squat';
    if (exercise.laterality !== 'bilateral') return 'dumbbell-hinge';
    return usesDumbbell ? 'dumbbell-hinge' : 'deadlift';
  }

  if (exercise.primaryMuscle === 'chest') {
    if (exercise.movementPattern === 'isolation') return usesCable ? 'crossover' : 'fly';
    if (equipment.has('bodyweight') || equipment.has('rings')) return 'pushup';
    if (usesMachine) return 'chest-machine';
    if (name.includes('inclinado')) return 'incline-press';
    return usesDumbbell ? 'bench-dumbbell' : 'bench-barbell';
  }

  if (exercise.primaryMuscle === 'lats' || exercise.primaryMuscle === 'back' || exercise.primaryMuscle === 'lower-back') {
    if (exercise.movementPattern === 'hinge') return usesDumbbell ? 'dumbbell-hinge' : 'barbell-hinge';
    if (exercise.movementPattern === 'vertical-pull') return equipment.has('bodyweight') || equipment.has('rings') ? 'pullup' : 'pulldown';
    if (exercise.movementPattern === 'isolation') return 'straight-arm-pulldown';
    if (usesMachine) return 'machine-row';
    if (usesCable || equipment.has('suspension') || equipment.has('rings')) return 'cable-row';
    if (exercise.laterality !== 'bilateral' || usesDumbbell) return 'one-arm-row';
    return 'barbell-row';
  }

  if (exercise.primaryMuscle === 'front-delts') return usesMachine ? 'machine-press' : 'shoulder-press';
  if (exercise.primaryMuscle === 'side-delts') return exercise.movementPattern === 'isolation' ? 'lateral-raise' : 'shoulder-press';
  if (exercise.primaryMuscle === 'rear-delts') return name.includes('face pull') ? 'face-pull' : 'reverse-fly';

  if (exercise.primaryMuscle === 'biceps') {
    if (name.includes('scott')) return 'preacher-curl';
    if (name.includes('martelo')) return 'hammer-curl';
    return usesBar || usesCable || usesMachine ? 'barbell-curl' : 'dumbbell-curl';
  }

  if (exercise.primaryMuscle === 'triceps') {
    if (name.includes('testa')) return 'skull-crusher';
    if (hasAny(name, ['frances', 'acima da cabeca'])) return 'overhead-extension';
    if (usesCable) return name.includes('corda') ? 'rope-pushdown' : 'bar-pushdown';
    if (equipment.has('bodyweight')) return 'pushup';
    return usesMachine ? 'machine-press' : 'overhead-extension';
  }

  if (exercise.primaryMuscle === 'forearms') return exercise.movementPattern === 'carry' ? 'shrug' : 'wrist-curl';
  if (exercise.primaryMuscle === 'traps' || exercise.primaryMuscle === 'neck') return 'shrug';

  if (exercise.movementPattern === 'olympic' || exercise.movementPattern === 'hinge') return 'deadlift';
  if (exercise.movementPattern === 'plyometric' || exercise.movementPattern === 'locomotion') return 'lunge';
  if (exercise.movementPattern === 'carry') return 'shrug';
  if (exercise.movementPattern === 'vertical-push') return 'shoulder-press';
  if (usesBar) return 'deadlift';
  return 'squat';
}
