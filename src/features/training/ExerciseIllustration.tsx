import { getBaseExerciseMedia, type ExerciseIllustrationPose } from '../../assets/exercises/exercise-media';
import { getOriginalExerciseImage } from '../../assets/exercises/exercise-images';
import { resolveExerciseIllustrationPose } from '../../assets/exercises/exercise-pose';
import { MUSCLE_LABELS, type Exercise, type MuscleGroup } from '../../domain/training/training';

type Props = { exercise?: Exercise; large?: boolean; className?: string };

/** Original, compact SVG illustrations for the fixed DEFYN exercise library. */
export function ExerciseIllustration({ exercise, large = false, className = '' }: Props) {
  if (!exercise) return <ExerciseInitials large={large} className={className} />;
  const media = getBaseExerciseMedia(exercise.id);
  const pose = media?.pose ?? resolveExerciseIllustrationPose(exercise);
  const image = getOriginalExerciseImage(exercise.id);
  return <span className={`exercise-mark exercise-illustration muscle-${exercise.primaryMuscle} ${large ? 'large' : ''} ${className}`.trim()} role="img" aria-label={`Ilustração de ${exercise.name}`} data-asset={media?.asset ?? `defyn-derived:${pose}`}>{image ? <img src={image} alt="" /> : <TechnicalFigure pose={pose} muscle={exercise.primaryMuscle} />}</span>;
}

function ExerciseInitials({ exercise, large, className }: Props) {
  const label = exercise ? MUSCLE_LABELS[exercise.primaryMuscle] : '?';
  return <span className={`exercise-mark muscle-${exercise?.primaryMuscle ?? 'other'} ${large ? 'large' : ''} ${className}`.trim()} aria-label={exercise ? `Representação de ${label}` : 'Exercício indisponível'}><b>{label.slice(0, 2).toUpperCase()}</b><i aria-hidden="true" /></span>;
}

function TechnicalFigure({ pose, muscle }: { pose: ExerciseIllustrationPose; muscle: MuscleGroup }) {
  const family = poseFamily(pose);
  return <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false" className={`exercise-svg pose-${pose}`}>
    <rect className="svg-panel" x="5" y="5" width="110" height="110" rx="18" />
    <path className="svg-grid" d="M20 18H100M16 96H104M18 20V100M102 20V100" />
    {family === 'bench' && <BenchFigure pose={pose} muscle={muscle} />}
    {family === 'pull' && <PullFigure pose={pose} muscle={muscle} />}
    {family === 'stand' && <StandingFigure pose={pose} muscle={muscle} />}
    {family === 'lower' && <LowerFigure pose={pose} muscle={muscle} />}
    {family === 'floor' && <FloorFigure pose={pose} muscle={muscle} />}
  </svg>;
}

function BenchFigure({ pose, muscle }: FigureProps) {
  const isFly = pose === 'fly'; const inclined = pose === 'incline-press'; const pushup = pose === 'pushup'; const skull = pose === 'skull-crusher';
  if (pushup) return <>
    <path className="svg-floor" d="M14 92H106" /><path className="svg-ink" d="M30 66L54 70L80 84M54 70L46 91M66 76L63 93M29 67L20 85" /><circle className="svg-head" cx="28" cy="58" r="7" />
    <Muscles muscle={muscle} at="torso" /><path className="svg-equip" d="M45 91H71" />
  </>;
  if (pose === 'chest-machine') return <><Machine /><circle className="svg-head" cx="59" cy="38" r="7" /><path className="svg-ink" d="M60 45L60 69L48 94M60 69L74 94M57 52L78 62M63 52L82 61" /><Muscles muscle={muscle} at="torso" /><path className="svg-equip" d="M82 61H98M82 62L88 77" /></>;
  if (pose === 'crossover') return <><Machine /><FigureBase muscle={muscle} arms="side" /><path className="svg-cable" d="M96 27L76 62M25 27L44 62" /><path className="svg-equip" d="M25 27V98" /></>;
  return <>
    <path className="svg-equip" d={inclined ? 'M27 89L54 61L87 89M20 90H98' : 'M23 82H96M39 82L33 96M80 82L88 96'} />
    <circle className="svg-head" cx="38" cy={inclined ? 57 : 66} r="7" /><path className="svg-ink" d={inclined ? 'M44 60L62 72L77 82M59 70L46 82M68 75L61 93M77 82L89 94' : 'M45 67L65 72L82 84M61 72L48 80M69 76L61 94M82 84L90 95'} />
    <Muscles muscle={muscle} at="torso" />
    {isFly ? <path className="svg-ink" d="M52 68L32 55M58 70L84 56" /> : <Barbell kind={pose === 'bench-dumbbell' || pose === 'incline-press' ? 'dumbbell' : 'barbell'} y={skull ? 50 : 48} />}
  </>;
}

function PullFigure({ pose, muscle }: FigureProps) {
  const pullup = pose === 'pullup'; const row = pose === 'cable-row' || pose === 'machine-row'; const bent = pose === 'barbell-row' || pose === 'one-arm-row';
  if (pullup) return <><path className="svg-equip" d="M21 20H99M26 20V35M94 20V35" /><circle className="svg-head" cx="60" cy="43" r="7" /><path className="svg-ink" d="M57 51L60 70M57 56L39 35M63 56L81 35M59 70L48 91M61 70L72 91" /><Muscles muscle={muscle} at="back" /></>;
  if (bent) return <><path className="svg-floor" d="M14 98H106" /><circle className="svg-head" cx="48" cy="43" r="7" /><path className="svg-ink" d="M52 49L67 65L82 71M64 62L49 69M67 65L56 94M82 71L87 94" /><Muscles muscle={muscle} at="back" /><Barbell kind={pose === 'one-arm-row' ? 'dumbbell' : 'barbell'} y={75} /></>;
  if (row) return <><Machine /><circle className="svg-head" cx="62" cy="43" r="7" /><path className="svg-ink" d="M61 50L60 70L80 82M59 55L85 62M60 70L48 93M65 71L75 93" /><Muscles muscle={muscle} at="back" /><path className="svg-cable" d="M94 27L85 62" /></>;
  const straight = pose === 'straight-arm-pulldown';
  return <><Machine /><circle className="svg-head" cx="55" cy="42" r="7" /><path className="svg-ink" d={straight ? 'M57 50L62 71L78 89M60 54L88 67M62 71L54 94M66 72L75 94' : 'M57 50L61 72L78 86M59 55L40 38M62 55L81 39M61 72L52 94M65 72L75 94'} /><Muscles muscle={muscle} at="back" /><path className="svg-cable" d={straight ? 'M95 25L88 67' : 'M95 25L81 39M95 25L40 38'} /></>;
}

function StandingFigure({ pose, muscle }: FigureProps) {
  const lateral = pose === 'lateral-raise'; const face = pose === 'face-pull'; const reverse = pose === 'reverse-fly'; const curl = pose.includes('curl'); const pushdown = pose.includes('pushdown'); const overhead = pose === 'overhead-extension' || pose === 'shoulder-press'; const shrug = pose === 'shrug';
  if (reverse) return <PullFigure pose="barbell-row" muscle={muscle} />;
  if (face || pushdown || pose === 'machine-press') return <><Machine /><FigureBase muscle={muscle} /><path className="svg-cable" d={face ? 'M96 29L73 50M96 29L45 50' : 'M96 29L62 67'} /></>;
  if (pose === 'preacher-curl') return <><path className="svg-equip" d="M30 87L50 62L71 87M30 87H92" /><FigureBase muscle={muscle} /><Barbell kind="barbell" y={64} /></>;
  if (overhead) return <><FigureBase muscle={muscle} arms="up" /><Barbell kind={pose === 'shoulder-press' ? 'dumbbell' : 'dumbbell'} y={25} /></>;
  if (lateral) return <><FigureBase muscle={muscle} arms="side" /><Barbell kind="dumbbell" y={62} /></>;
  if (shrug) return <><FigureBase muscle={muscle} /><Barbell kind="dumbbell" y={78} /></>;
  if (curl) return <><FigureBase muscle={muscle} arms="curl" /><Barbell kind={pose === 'barbell-curl' ? 'barbell' : 'dumbbell'} y={60} /></>;
  if (pose === 'wrist-curl') return <><path className="svg-equip" d="M27 78H91" /><FigureBase muscle={muscle} arms="low" /><Barbell kind="dumbbell" y={78} /></>;
  return <FigureBase muscle={muscle} />;
}

function LowerFigure({ pose, muscle }: FigureProps) {
  const hinge = pose.includes('hinge') || pose === 'deadlift'; const machine = pose === 'leg-press' || pose.includes('leg-') || pose.includes('hip-');
  if (machine) return <MachineLower pose={pose} muscle={muscle} />;
  const lunge = pose === 'lunge';
  return <><path className="svg-floor" d="M15 98H105" /><circle className="svg-head" cx={hinge ? 48 : 60} cy="35" r="7" /><path className="svg-ink" d={hinge ? 'M53 41L68 59L83 65M68 59L57 92M82 66L89 94M56 51L35 60' : lunge ? 'M60 42L59 63L43 88M59 63L77 86M59 51L47 61M62 51L74 61' : 'M60 42L60 64L45 84M60 64L77 84M58 51L43 59M62 51L77 59'} /><Muscles muscle={muscle} at={hinge ? 'back' : 'legs'} />{hinge ? <Barbell kind={pose === 'dumbbell-hinge' ? 'dumbbell' : 'barbell'} y={69} /> : pose === 'goblet-squat' ? <Barbell kind="dumbbell" y={53} /> : pose === 'smith-squat' ? <path className="svg-equip" d="M31 18V99M89 18V99" /> : <Barbell kind="barbell" y={34} />}</>;
}

function FloorFigure({ pose, muscle }: FigureProps) {
  if (pose === 'cable-crunch') return <PullFigure pose="straight-arm-pulldown" muscle={muscle} />;
  const plank = pose === 'plank'; const legs = pose === 'leg-raise';
  return <><path className="svg-floor" d="M15 94H105" /><circle className="svg-head" cx="35" cy={plank ? 61 : 72} r="7" /><path className="svg-ink" d={plank ? 'M41 65L64 70L87 87M59 69L49 92M68 72L62 94' : legs ? 'M42 74L62 80L85 51M62 80L92 82M53 78L45 92' : 'M42 74L61 82L81 88M61 82L75 66M61 82L48 92'} /><Muscles muscle={muscle} at="core" /></>;
}

type FigureProps = { pose: ExerciseIllustrationPose; muscle: MuscleGroup };
function FigureBase({ muscle, arms = 'low' }: { muscle: MuscleGroup; arms?: 'low' | 'up' | 'side' | 'curl' }) {
  const armPath = arms === 'up' ? 'M57 51L43 28M63 51L77 28' : arms === 'side' ? 'M57 52L33 64M63 52L87 64' : arms === 'curl' ? 'M57 52L44 66L50 55M63 52L76 66L70 55' : 'M57 52L46 70M63 52L74 70';
  return <><path className="svg-floor" d="M22 98H98" /><circle className="svg-head" cx="60" cy="34" r="7" /><path className="svg-ink" d={`M60 41L60 67L48 94M60 67L73 94${armPath}`} /><Muscles muscle={muscle} at="torso" /></>;
}
function Machine() { return <path className="svg-equip" d="M91 22V98M91 22H103M91 48H104M91 75H104M103 22V98M29 96H103" />; }
function MachineLower({ pose, muscle }: FigureProps) { return <><path className="svg-floor" d="M16 98H105" /><path className="svg-equip" d={pose === 'leg-press' ? 'M27 93L87 27M87 27L103 42M79 38L97 55' : 'M26 89H98M32 89V48M86 89V43'} /><circle className="svg-head" cx={pose === 'leg-press' ? 50 : 56} cy={pose === 'leg-press' ? 63 : 42} r="7" /><path className="svg-ink" d={pose === 'leg-press' ? 'M55 67L67 78L85 48M67 78L47 90M67 78L84 92' : 'M58 49L60 68L43 80M60 68L78 79M57 55L42 65M63 55L78 65'} /><Muscles muscle={muscle} at="legs" /></>; }
function Barbell({ kind, y }: { kind: 'barbell' | 'dumbbell'; y: number }) { return kind === 'barbell' ? <><path className="svg-barbell" d={`M25 ${y}H95`} /><path className="svg-plate" d={`M30 ${y - 7}V${y + 7}M36 ${y - 10}V${y + 10}M84 ${y - 10}V${y + 10}M90 ${y - 7}V${y + 7}`} /></> : <><path className="svg-dumbbell" d={`M35 ${y}H48M72 ${y}H85`} /><path className="svg-plate" d={`M34 ${y - 6}V${y + 6}M48 ${y - 6}V${y + 6}M72 ${y - 6}V${y + 6}M86 ${y - 6}V${y + 6}`} /></>; }
function Muscles({ muscle, at }: { muscle: MuscleGroup; at: 'torso' | 'back' | 'legs' | 'core' }) { const display = muscle === 'chest' ? 'M52 53C57 49 63 49 68 53L66 61H54Z' : muscle.includes('delt') || muscle === 'traps' ? 'M48 53C52 48 56 48 59 53L57 59H50ZM61 53C64 48 68 48 72 53L70 59H63Z' : muscle === 'biceps' || muscle === 'triceps' || muscle === 'forearms' ? 'M43 60C48 57 51 60 50 66L45 71Z' : muscle === 'core' ? 'M55 58H65V76H55Z' : muscle === 'calves' ? 'M45 80C51 78 54 82 52 89L46 91ZM70 80C76 78 79 82 77 89L71 91Z' : muscle === 'glutes' ? 'M51 68C57 64 60 67 60 74L51 78ZM61 68C67 64 70 67 70 74L61 78Z' : muscle === 'adductors' ? 'M50 72L57 74L51 88L45 86ZM63 74L70 72L76 86L70 88Z' : muscle === 'quadriceps' ? 'M44 72L54 74L50 90L43 91ZM66 74L76 72L77 91L70 90Z' : muscle === 'hamstrings' ? 'M45 73L53 72L49 88L43 90ZM67 72L75 73L77 90L71 88Z' : at === 'back' || muscle === 'back' || muscle === 'lats' ? 'M51 53L69 53L73 67L60 73L47 67Z' : 'M52 53C57 49 63 49 68 53L70 68H50Z'; return <path className="svg-muscle" d={display} />; }
function poseFamily(pose: ExerciseIllustrationPose): 'bench' | 'pull' | 'stand' | 'lower' | 'floor' { if (['bench-barbell', 'bench-dumbbell', 'incline-press', 'chest-machine', 'fly', 'crossover', 'pushup', 'skull-crusher'].includes(pose)) return 'bench'; if (['pulldown', 'pullup', 'cable-row', 'barbell-row', 'one-arm-row', 'machine-row', 'straight-arm-pulldown'].includes(pose)) return 'pull'; if (['squat', 'goblet-squat', 'smith-squat', 'leg-press', 'leg-extension', 'lunge', 'seated-leg-curl', 'prone-leg-curl', 'barbell-hinge', 'dumbbell-hinge', 'deadlift', 'hip-thrust', 'glute-bridge', 'hip-abduction', 'hip-adduction', 'standing-calf', 'seated-calf', 'single-calf'].includes(pose)) return 'lower'; if (['plank', 'crunch', 'leg-raise', 'cable-crunch'].includes(pose)) return 'floor'; return 'stand'; }
