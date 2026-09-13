import { describe, expect, it } from 'vitest';
import { BASE_EXERCISES, normalizeExerciseName, searchExercises } from './exercise-library';

describe('catálogo expandido de exercícios', () => {
  it('não repete nomes nem IDs e mantém os 52 IDs originais', () => {
    const ids = BASE_EXERCISES.map((exercise) => exercise.id);
    const names = BASE_EXERCISES.map((exercise) => exercise.normalizedName);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
    expect(BASE_EXERCISES).toHaveLength(241);
    expect(ids.slice(0, 52)).toEqual(Array.from({ length: 52 }, (_, index) => `defyn-exercise-${String(index + 1).padStart(2, '0')}`));
  });

  it('inclui o búlgaro e suas principais variações de equipamento', () => {
    const variants = searchExercises(BASE_EXERCISES, 'agachamento bulgaro');
    expect(variants.map((exercise) => exercise.name)).toEqual(expect.arrayContaining([
      'Agachamento búlgaro com halteres',
      'Agachamento búlgaro com barra',
      'Agachamento búlgaro no Smith',
      'Agachamento búlgaro com peso corporal',
    ]));
    expect(variants.every((exercise) => exercise.laterality === 'unilateral')).toBe(true);
  });

  it('busca sem acentos e por novos equipamentos e grupos musculares', () => {
    expect(normalizeExerciseName('BÚLGARO')).toBe('bulgaro');
    expect(searchExercises(BASE_EXERCISES, 'trap bar').some((exercise) => exercise.name === 'Levantamento terra com trap bar')).toBe(true);
    expect(searchExercises(BASE_EXERCISES, 'lombar').some((exercise) => exercise.primaryMuscle === 'lower-back')).toBe(true);
    expect(searchExercises(BASE_EXERCISES, '', undefined, 'machine').length).toBeGreaterThan(25);
    expect(searchExercises(BASE_EXERCISES, '', undefined, 'dumbbell').length).toBeGreaterThan(35);
    expect(BASE_EXERCISES.find((exercise) => exercise.name === 'Farmer hold com halteres')?.metric).toBe('seconds');
  });
});
