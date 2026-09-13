import { describe, expect, it } from 'vitest';
import { BASE_EXERCISES } from '../../domain/training/exercise-library';
import { getOriginalExerciseImage } from './exercise-images';
import { resolveExerciseIllustrationPose } from './exercise-pose';

const exercise = (name: string) => {
  const found = BASE_EXERCISES.find((item) => item.name === name);
  if (!found) throw new Error(`Exercício ausente no teste: ${name}`);
  return found;
};

describe('ilustrações do catálogo publicado', () => {
  it('exige uma miniatura exclusiva por exercício publicado', () => {
    const images = new Set<string>();
    for (const item of BASE_EXERCISES) {
      const image = getOriginalExerciseImage(item.id);
      expect(image).toMatch(new RegExp(`${item.id}[^/]*\\.png$`));
      images.add(image!);
    }
    expect(images.size).toBe(BASE_EXERCISES.length);
  });

  it('representa famílias de movimento e equipamento', () => {
    expect(resolveExerciseIllustrationPose(exercise('Agachamento búlgaro com halteres'))).toBe('lunge');
    expect(resolveExerciseIllustrationPose(exercise('Supino reto na máquina'))).toBe('chest-machine');
    expect(resolveExerciseIllustrationPose(exercise('Remada baixa unilateral'))).toBe('cable-row');
    expect(resolveExerciseIllustrationPose(exercise('Rosca martelo na polia com corda'))).toBe('hammer-curl');
  });
});
