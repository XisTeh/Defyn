import { describe, expect, it } from 'vitest';
import { parseBrazilianNutritionLabel, reconstructNutritionLabelText } from './nutrition-label-parser';

const portionOnlyLabel = `INFORMAÇÃO NUTRICIONAL
Porção 30 g
Valor energético 118 kcal
Carboidratos 4,1 g
Açúcares totais 2 g
Açúcares adicionados 0 g
Proteínas 22 g
Gorduras totais 1,6 g
Gorduras saturadas 0,8 g
Fibra alimentar 1,2 g
Sódio 98 mg`;

const completeLabel = `INFORMAÇÃO NUTRICIONAL
Porções por embalagem: cerca de 4
Porção: 60 g
100 g | 60 g | %VD
Valor energético (kcal) 420 252 13
Valor energético (kJ) 1764 1058 13
Carboidratos (g) 50 30 10
Açúcares totais (g) 12 7,2
Açúcares adicionados (g) 8 4,8 10
Proteínas (g) 20 12 24
Gorduras totais (g) 16 9,6 15
Gorduras saturadas (g) 6 3,6 18
Gorduras trans (g) 0 0
Fibra alimentar (g) 5 3 12
Sódio (mg) 500 300 15`;

describe('parser de rótulos brasileiros', () => {
  it('preserva a porção impressa e deriva uma base de 100 g identificada quando necessário', () => {
    const parsed = parseBrazilianNutritionLabel(portionOnlyLabel);
    expect(parsed.portion).toEqual({ quantity: 30, unit: 'g' });
    expect(parsed.nutritionLabel?.calculationBasis).toMatchObject({ quantity: 100, unit: 'g', source: 'derived' });
    expect(parsed.columns?.portion).toMatchObject({ caloriesKcal: 118, carbsGrams: 4.1, proteinGrams: 22, fatGrams: 1.6, fiberGrams: 1.2, sodiumMg: 98, sugarsGrams: 2, addedSugarsGrams: 0 });
    expect(parsed.nutrients.caloriesKcal).toBeCloseTo(118 / 30 * 100);
  });

  it('preserva 100 g, porção e %VD em colunas independentes e usa 100 g para cálculo', () => {
    const parsed = parseBrazilianNutritionLabel(completeLabel);
    expect(parsed.servingsPerContainer).toBe(4);
    expect(parsed.columns?.selected).toBe('per100');
    expect(parsed.nutrients).toMatchObject({ caloriesKcal: 420, energyKj: 1764, carbsGrams: 50, proteinGrams: 20, fatGrams: 16, sodiumMg: 500, transFatGrams: 0 });
    expect(parsed.columns?.portion).toMatchObject({ caloriesKcal: 252, energyKj: 1058, carbsGrams: 30, proteinGrams: 12, fatGrams: 9.6, sodiumMg: 300 });
    expect(parsed.columns?.dailyValuesPercent).toMatchObject({ caloriesKcal: 13, carbsGrams: 10, proteinGrams: 24, fatGrams: 15, sodiumMg: 15 });
    expect(parsed.warnings.some((warning) => warning.includes('preservadas separadamente'))).toBe(true);
  });

  it('tolera linhas quebradas, colunas desalinhadas e vírgula trocada por ponto', () => {
    const parsed = parseBrazilianNutritionLabel('Porção 60 g\n100 g 60 g %VD\nCarboidratos (g) 42.5   25.5 9\nProteínas\n10 6 12\nGorduras totais (g) 8 4.8 7');
    expect(parsed.nutrients).toMatchObject({ carbsGrams: 42.5, proteinGrams: 10, fatGrams: 8 });
    expect(parsed.columns?.portion).toMatchObject({ carbsGrams: 25.5, proteinGrams: 6, fatGrams: 4.8 });
  });

  it('reconstrói linhas espaciais pela coordenada vertical e ordena suas colunas por x', () => {
    const text = reconstructNutritionLabelText('', [
      { text: '60 g', confidence: 90, bbox: { x0: 220, y0: 20, x1: 260, y1: 35 } },
      { text: '100 g', confidence: 90, bbox: { x0: 150, y0: 20, x1: 195, y1: 35 } },
      { text: '%VD', confidence: 90, bbox: { x0: 290, y0: 20, x1: 325, y1: 35 } },
      { text: 'Carboidratos (g) 50 30 10', confidence: 90, bbox: { x0: 10, y0: 55, x1: 325, y1: 70 } },
    ]);
    expect(text.split('\n')[0]).toBe('100 g   60 g   %VD');
  });

  it('mantém campos ausentes vazios, sem inventar zero', () => {
    const parsed = parseBrazilianNutritionLabel('Porção 60 g\n100 g 60 g %VD\nValor energético (kcal) 400 240 12\nProteínas (g) 10 6 12');
    expect(parsed.nutrients.carbsGrams).toBeUndefined();
    expect(parsed.nutrients.fatGrams).toBeUndefined();
    expect(parsed.columns?.portion?.carbsGrams).toBeUndefined();
  });

  it('reconhece referência de 100 ml e sinaliza texto insuficiente', () => {
    expect(parseBrazilianNutritionLabel('100 ml\nEnergia 45 kcal').reference).toEqual({ quantity: 100, unit: 'ml' });
    expect(parseBrazilianNutritionLabel('PORÇ?O xx\nPROTEINAS 2 g').warnings.length).toBeGreaterThan(0);
  });
});
