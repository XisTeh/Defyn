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
  it('prioriza a coluna da porção declarada no padrão brasileiro 100 g | 60 g | %VD', () => {
    const parsed = parseBrazilianNutritionLabel(`INFORMAÇÃO NUTRICIONAL
Porções por embalagem: cerca de 4
Porção: 60 g
100 g | 60 g | %VD
Valor energético (kcal) 420 252 13
Carboidratos (g) 50 30 10
Açúcares totais (g) 12 7,2
Açúcares adicionados (g) 8 4,8 10
Proteínas (g) 20 12 24
Gorduras totais (g) 16 9,6 15
Gorduras saturadas (g) 6 3,6 18
Gorduras trans (g) 0 0
Fibra alimentar (g) 5 3 12
Sódio (mg) 500 300 15`);
    expect(parsed.columns?.selected).toBe('portion');
    expect(parsed.nutrients).toMatchObject({ caloriesKcal: 252, carbsGrams: 30, proteinGrams: 12, fatGrams: 9.6, sodiumMg: 300 });
    expect(parsed.columns?.per100).toMatchObject({ caloriesKcal: 420, carbsGrams: 50, proteinGrams: 20, fatGrams: 16, sodiumMg: 500 });
  });
  it('tolera colunas desalinhadas e vírgula trocada por ponto', () => {
    const parsed = parseBrazilianNutritionLabel('Porção 60 g\n100 g 60 g %VD\nCarboidratos (g) 42.5   25.5 9\nProteínas\n10 6 12\nGorduras totais (g) 8 4.8 7');
    expect(parsed.nutrients).toMatchObject({ carbsGrams: 25.5, proteinGrams: 6, fatGrams: 4.8 });
  });
  it('mantém campos ausentes vazios mesmo no formato de múltiplas colunas', () => {
    const parsed = parseBrazilianNutritionLabel('Porção 60 g\n100 g 60 g %VD\nValor energético (kcal) 400 240 12\nProteínas (g) 10 6 12');
    expect(parsed.nutrients.carbsGrams).toBeUndefined();
    expect(parsed.nutrients.fatGrams).toBeUndefined();
  });
});
