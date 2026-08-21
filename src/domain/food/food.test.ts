import { describe, expect, it } from 'vitest';
import { foodSearchText, normalizeFoodSearch, scaleNutrients, validateFood, type NutrientValues } from './food';

const label: NutrientValues = {
  caloriesKcal: 120,
  proteinGrams: 6,
  carbsGrams: 18,
  fatGrams: 3,
  fiberGrams: 2,
  sodiumMg: 90,
};

describe('proporcionalidade de porções', () => {
  it('escala 30 g para 45 g sem perder precisão', () => {
    expect(scaleNutrients(label, 30, 45)).toEqual({
      caloriesKcal: 180,
      proteinGrams: 9,
      carbsGrams: 27,
      fatGrams: 4.5,
      fiberGrams: 3,
      sugarsGrams: undefined,
      sodiumMg: 135,
    });
  });

  it('aceita consumo zero', () => {
    expect(scaleNutrients(label, 30, 0).caloriesKcal).toBe(0);
  });

  it('rejeita porção-base zero', () => {
    expect(() => scaleNutrients(label, 0, 45)).toThrow(RangeError);
  });

  it('rejeita quantidade consumida negativa e não finita', () => {
    expect(() => scaleNutrients(label, 30, -1)).toThrow(RangeError);
    expect(() => scaleNutrients(label, 30, Number.NaN)).toThrow(RangeError);
  });
});

describe('catálogo de alimentos', () => {
  it('normaliza acentos, caixa e espaços', () => expect(normalizeFoodSearch('  PÃO   Integral  ')).toBe('pao integral'));
  it('cria texto de busca por marca, categoria e código', () => expect(foodSearchText('Leite','Marca X','Lácteos','789')).toContain('marca x'));
  it('preserva nutrientes ausentes ao escalar', () => expect(scaleNutrients({ caloriesKcal: 100 },100,50).proteinGrams).toBeUndefined());
  it('rejeita porção personalizada inválida', () => expect(() => validateFood({ name:'A',basePortion:{quantity:100,unit:'g'},nutrients:{},portions:[{id:'p',label:'',quantity:1,unit:'slice',equivalentBaseQuantity:0}] })).toThrow(/Porção/));
});
