/** Build-time local image map. Vite emits and precaches only these original DEFYN assets. */
import { BASE_EXERCISE_MEDIA, type ExerciseIllustrationPose } from './exercise-media';

const thumbnailModules = import.meta.glob('./generated/thumbnails/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;

export function getOriginalExerciseImage(exerciseId: string): string | undefined {
  return thumbnailModules[`./generated/thumbnails/${exerciseId}.png`];
}

/** Reuses the original anatomical thumbnail that best represents a generated pose. */
export function getRepresentativeExerciseImage(pose: ExerciseIllustrationPose): string | undefined {
  const representative = Object.values(BASE_EXERCISE_MEDIA).find((media) => media.pose === pose);
  return representative ? getOriginalExerciseImage(representative.id) : undefined;
}
