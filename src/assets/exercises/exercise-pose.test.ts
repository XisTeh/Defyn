import { describe, expect, it } from 'vitest';
import { BASE_EXERCISES } from '../../domain/training/exercise-library';
import { getOriginalExerciseImage, getRepresentativeExerciseImage } from './exercise-images';
import { getBaseExerciseMedia } from './exercise-media';
import { resolveExerciseIllustrationPose } from './exercise-pose';

const exercise = (name: string) => {
  const found = BASE_EXERCISES.find((item) => item.name === name);
  if (!found) throw new Error(`Exercício ausente no teste: ${name}`);
  return found;
};

describe('ilustração técnica do catálogo expandido', () => {
  it('resolve uma pose para todos os exercícios sem PNG', () => {
    for (const item of BASE_EXERCISES.slice(52)) {
      const pose = resolveExerciseIllustrationPose(item);
      expect(pose).toBeTruthy();
      expect(getOriginalExerciseImage(item.id) ?? getRepresentativeExerciseImage(pose)).toMatch(/defyn-exercise-\d{2}\.png$/);
    }
  });

  it('mantém as miniaturas originais e usa uma miniatura anatômica equivalente nas novas opções', () => {
    for (const item of BASE_EXERCISES) {
      const media = getBaseExerciseMedia(item.id);
      const pose = media?.pose ?? resolveExerciseIllustrationPose(item);
      const image = getOriginalExerciseImage(item.id) ?? getRepresentativeExerciseImage(pose);
      expect(image).toMatch(/defyn-exercise-\d{2}\.png$/);
    }
  });

  it('representa famílias de movimento e equipamento', () => {
    expect(resolveExerciseIllustrationPose(exercise('Abdominal bicicleta'))).toBe('crunch');
    expect(resolveExerciseIllustrationPose(exercise('Elevação de pernas na barra'))).toBe('leg-raise');
    expect(resolveExerciseIllustrationPose(exercise('Agachamento búlgaro com halteres'))).toBe('lunge');
    expect(resolveExerciseIllustrationPose(exercise('Supino reto na máquina'))).toBe('chest-machine');
    expect(resolveExerciseIllustrationPose(exercise('Remada baixa unilateral'))).toBe('cable-row');
    expect(resolveExerciseIllustrationPose(exercise('Rosca martelo na polia com corda'))).toBe('hammer-curl');
  });
});
