/**
 * Static, original DEFYN exercise illustration manifest.
 *
 * This intentionally stays outside IndexedDB: base illustrations are product
 * assets, while user-created exercises can continue to use `thumbnailMediaId`.
 */
export type ExerciseIllustrationPose =
  | 'bench-barbell' | 'bench-dumbbell' | 'incline-press' | 'chest-machine' | 'fly' | 'crossover' | 'pushup'
  | 'pulldown' | 'pullup' | 'cable-row' | 'barbell-row' | 'one-arm-row' | 'machine-row' | 'straight-arm-pulldown'
  | 'shoulder-press' | 'machine-press' | 'lateral-raise' | 'reverse-fly' | 'face-pull'
  | 'barbell-curl' | 'dumbbell-curl' | 'hammer-curl' | 'preacher-curl' | 'rope-pushdown' | 'bar-pushdown' | 'overhead-extension' | 'skull-crusher'
  | 'squat' | 'goblet-squat' | 'smith-squat' | 'leg-press' | 'leg-extension' | 'lunge' | 'seated-leg-curl' | 'prone-leg-curl'
  | 'barbell-hinge' | 'dumbbell-hinge' | 'deadlift' | 'hip-thrust' | 'glute-bridge' | 'hip-abduction' | 'hip-adduction'
  | 'standing-calf' | 'seated-calf' | 'single-calf' | 'plank' | 'crunch' | 'leg-raise' | 'cable-crunch' | 'shrug' | 'wrist-curl';

export interface ExerciseMediaSpec {
  readonly id: string;
  /** Stable logical SVG asset name, kept together with the vector renderer. */
  readonly asset: `defyn-svg:${string}`;
  readonly pose: ExerciseIllustrationPose;
}

const entry = (id: string, asset: string, pose: ExerciseIllustrationPose): ExerciseMediaSpec => ({ id, asset: `defyn-svg:${asset}`, pose });

export const BASE_EXERCISE_MEDIA: Readonly<Record<string, ExerciseMediaSpec>> = {
  'defyn-exercise-01': entry('defyn-exercise-01', 'supino-reto-barra', 'bench-barbell'),
  'defyn-exercise-02': entry('defyn-exercise-02', 'supino-reto-halteres', 'bench-dumbbell'),
  'defyn-exercise-03': entry('defyn-exercise-03', 'supino-inclinado-halteres', 'incline-press'),
  'defyn-exercise-04': entry('defyn-exercise-04', 'chest-press', 'chest-machine'),
  'defyn-exercise-05': entry('defyn-exercise-05', 'crucifixo-halteres', 'fly'),
  'defyn-exercise-06': entry('defyn-exercise-06', 'crossover-polia', 'crossover'),
  'defyn-exercise-07': entry('defyn-exercise-07', 'flexao-bracos', 'pushup'),
  'defyn-exercise-08': entry('defyn-exercise-08', 'puxada-frontal', 'pulldown'),
  'defyn-exercise-09': entry('defyn-exercise-09', 'barra-fixa', 'pullup'),
  'defyn-exercise-10': entry('defyn-exercise-10', 'remada-baixa', 'cable-row'),
  'defyn-exercise-11': entry('defyn-exercise-11', 'remada-curvada-barra', 'barbell-row'),
  'defyn-exercise-12': entry('defyn-exercise-12', 'remada-unilateral-halter', 'one-arm-row'),
  'defyn-exercise-13': entry('defyn-exercise-13', 'remada-maquina-articulada', 'machine-row'),
  'defyn-exercise-14': entry('defyn-exercise-14', 'pulldown-bracos-estendidos', 'straight-arm-pulldown'),
  'defyn-exercise-15': entry('defyn-exercise-15', 'desenvolvimento-halteres', 'shoulder-press'),
  'defyn-exercise-16': entry('defyn-exercise-16', 'desenvolvimento-maquina', 'machine-press'),
  'defyn-exercise-17': entry('defyn-exercise-17', 'elevacao-lateral', 'lateral-raise'),
  'defyn-exercise-18': entry('defyn-exercise-18', 'crucifixo-inverso', 'reverse-fly'),
  'defyn-exercise-19': entry('defyn-exercise-19', 'face-pull', 'face-pull'),
  'defyn-exercise-20': entry('defyn-exercise-20', 'rosca-direta-barra', 'barbell-curl'),
  'defyn-exercise-21': entry('defyn-exercise-21', 'rosca-alternada', 'dumbbell-curl'),
  'defyn-exercise-22': entry('defyn-exercise-22', 'rosca-martelo', 'hammer-curl'),
  'defyn-exercise-23': entry('defyn-exercise-23', 'rosca-scott', 'preacher-curl'),
  'defyn-exercise-24': entry('defyn-exercise-24', 'triceps-corda', 'rope-pushdown'),
  'defyn-exercise-25': entry('defyn-exercise-25', 'triceps-barra', 'bar-pushdown'),
  'defyn-exercise-26': entry('defyn-exercise-26', 'triceps-frances', 'overhead-extension'),
  'defyn-exercise-27': entry('defyn-exercise-27', 'triceps-testa', 'skull-crusher'),
  'defyn-exercise-28': entry('defyn-exercise-28', 'agachamento-livre', 'squat'),
  'defyn-exercise-29': entry('defyn-exercise-29', 'agachamento-goblet', 'goblet-squat'),
  'defyn-exercise-30': entry('defyn-exercise-30', 'agachamento-smith', 'smith-squat'),
  'defyn-exercise-31': entry('defyn-exercise-31', 'leg-press-45', 'leg-press'),
  'defyn-exercise-32': entry('defyn-exercise-32', 'cadeira-extensora', 'leg-extension'),
  'defyn-exercise-33': entry('defyn-exercise-33', 'afundo-halteres', 'lunge'),
  'defyn-exercise-34': entry('defyn-exercise-34', 'passada', 'lunge'),
  'defyn-exercise-35': entry('defyn-exercise-35', 'cadeira-flexora', 'seated-leg-curl'),
  'defyn-exercise-36': entry('defyn-exercise-36', 'mesa-flexora', 'prone-leg-curl'),
  'defyn-exercise-37': entry('defyn-exercise-37', 'stiff-barra', 'barbell-hinge'),
  'defyn-exercise-38': entry('defyn-exercise-38', 'terra-romeno-halteres', 'dumbbell-hinge'),
  'defyn-exercise-39': entry('defyn-exercise-39', 'levantamento-terra', 'deadlift'),
  'defyn-exercise-40': entry('defyn-exercise-40', 'hip-thrust', 'hip-thrust'),
  'defyn-exercise-41': entry('defyn-exercise-41', 'ponte-gluteos', 'glute-bridge'),
  'defyn-exercise-42': entry('defyn-exercise-42', 'cadeira-abdutora', 'hip-abduction'),
  'defyn-exercise-43': entry('defyn-exercise-43', 'cadeira-adutora', 'hip-adduction'),
  'defyn-exercise-44': entry('defyn-exercise-44', 'panturrilha-em-pe', 'standing-calf'),
  'defyn-exercise-45': entry('defyn-exercise-45', 'panturrilha-sentado', 'seated-calf'),
  'defyn-exercise-46': entry('defyn-exercise-46', 'panturrilha-unilateral', 'single-calf'),
  'defyn-exercise-47': entry('defyn-exercise-47', 'prancha-frontal', 'plank'),
  'defyn-exercise-48': entry('defyn-exercise-48', 'abdominal-supra', 'crunch'),
  'defyn-exercise-49': entry('defyn-exercise-49', 'elevacao-pernas', 'leg-raise'),
  'defyn-exercise-50': entry('defyn-exercise-50', 'abdominal-polia', 'cable-crunch'),
  'defyn-exercise-51': entry('defyn-exercise-51', 'encolhimento-halteres', 'shrug'),
  'defyn-exercise-52': entry('defyn-exercise-52', 'rosca-punho', 'wrist-curl'),
};

export const BASE_EXERCISE_MEDIA_COUNT = Object.keys(BASE_EXERCISE_MEDIA).length;

export function getBaseExerciseMedia(id: string): ExerciseMediaSpec | undefined {
  return BASE_EXERCISE_MEDIA[id];
}
