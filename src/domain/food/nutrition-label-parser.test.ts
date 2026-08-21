import { describe, expect, it } from 'vitest';
import { parseBrazilianNutritionLabel } from './nutrition-label-parser';

const label = `INFORMAÇÃO NUTRICIONAL\nPorção 30 g\nValor energético 118 kcal\nCarboidratos 4,1 g\nAçúcares totais 2 g\nAçúcares adicionados 0 g\nProteínas 22 g\nGorduras totais 1,6 g\nGorduras saturadas 0,8 g\nFibra alimentar 1,2 g\nSódio 98 mg`;
describe('parser de rótulos brasileiros', () => {
  it('lê porção e energia', () => { const parsed = parseBrazilianNutritionLabel(label); expect(parsed.portion).toEqual({ quantity: 30, unit: 'g' }); expect(parsed.nutrients.caloriesKcal).toBe(118); });
  it('aceita vírgula decimal', () => expect(parseBrazilianNutritionLabel(label).nutrients.carbsGrams).toBe(4.1));
  it('lê macros', () => expect(parseBrazilianNutritionLabel(label).nutrients).toMatchObject({ proteinGrams: 22, fatGrams: 1.6 }));
  it('lê fibra e sódio em mg', () => expect(parseBrazilianNutritionLabel(label).nutrients).toMatchObject({ fiberGrams: 1.2, sodiumMg: 98 }));
  it('distingue açúcares totais e adicionados', () => expect(parseBrazilianNutritionLabel(label).nutrients).toMatchObject({ sugarsGrams: 2, addedSugarsGrams: 0 }));
  it('reconhece referência de 100 ml', () => expect(parseBrazilianNutritionLabel('100 ml\nEnergia 45 kcal').reference).toEqual({ quantity: 100, unit: 'ml' }));
  it('não inventa campo ausente', () => expect(parseBrazilianNutritionLabel('Porção 20 g\nEnergia 50 kcal').nutrients.proteinGrams).toBeUndefined());
  it('sinaliza texto parcialmente corrompido', () => expect(parseBrazilianNutritionLabel('PORÇ?O xx\nPROTEINAS 2 g').warnings.length).toBeGreaterThan(0));
  it('exige revisão quando há porção e coluna de 100 g', () => {
    const parsed = parseBrazilianNutritionLabel('Porção 30 g\n100 g\nValor energético 118 kcal\nCarboidratos 4 g\nProteínas 20 g\nGorduras totais 2 g');
    expect(parsed.warnings.some((warning) => warning.includes('coluna por porção'))).toBe(true);
  });
});
