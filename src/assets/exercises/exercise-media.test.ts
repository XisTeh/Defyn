import { describe, expect, it } from 'vitest';
import { BASE_EXERCISES } from '../../domain/training/exercise-library';
import { getOriginalExerciseImage } from './exercise-images';
import { BASE_EXERCISE_MEDIA, BASE_EXERCISE_MEDIA_COUNT, getBaseExerciseMedia } from './exercise-media';

describe('base exercise illustration manifest', () => {
  it('keeps the original illustrated catalog stable inside the expanded library', () => {
    expect(BASE_EXERCISE_MEDIA_COUNT).toBe(52);
    expect(BASE_EXERCISES.length).toBeGreaterThan(200);
    expect(Object.keys(BASE_EXERCISE_MEDIA).sort()).toEqual(BASE_EXERCISES.slice(0, 52).map((exercise) => exercise.id).sort());
    expect(new Set(Object.values(BASE_EXERCISE_MEDIA).map((media) => media.asset)).size).toBe(52);
    for (const exercise of BASE_EXERCISES.slice(0, 52)) {
      const media = getBaseExerciseMedia(exercise.id);
      expect(media?.id).toBe(exercise.id);
      expect(media?.asset).toMatch(/^defyn-svg:[a-z0-9-]+$/);
      expect(media?.pose).toBeTruthy();
      expect(getOriginalExerciseImage(exercise.id)).toMatch(/defyn-exercise-\d{2}\.png$/);
    }
    expect(getBaseExerciseMedia(BASE_EXERCISES[52]!.id)).toBeUndefined();
  });
});
