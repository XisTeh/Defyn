import { describe, expect, it } from 'vitest';
import { nutritionForAmount } from './nutrition-label';
import { parseBrazilianNutritionLabel, tokenizeNutritionMeasurement, type NutritionLabelOcrLine, type NutritionLabelOcrToken } from './nutrition-label-parser';

const x = { per100: 220, portion: 300, daily: 375 };
function word(text: string, left: number, y: number, source: NutritionLabelOcrToken['source'] = 'document'): NutritionLabelOcrToken {
  return { text, confidence: source === 'numeric-pass' ? 96 : 86, source, bbox: { x0: left, y0: y, x1: left + Math.max(16, text.length * 7), y1: y + 16 } };
}
function labelWords(label: string, y: number): NutritionLabelOcrToken[] {
  let left = 10;
  return label.split(' ').map((part) => { const token = word(part, left, y); left = token.bbox.x1 + 5; return token; });
}
function line(text: string, y: number, words: NutritionLabelOcrToken[]): NutritionLabelOcrLine {
  return { text, confidence: 86, source: 'document', bbox: { x0: 10, y0: y, x1: 410, y1: y + 16 }, words };
}
function row(label: string, y: number, documentValues: string[], numericValues: Array<string | undefined>): NutritionLabelOcrLine {
  const positions = [x.per100, x.portion, x.daily];
  const document = documentValues.flatMap((value, index) => value === '' ? [] : [word(value, positions[index]!, y)]);
  const numeric = numericValues.flatMap((value, index) => value === undefined ? [] : [word(value, positions[index]!, y, 'numeric-pass')]);
  return line(`${label} ${documentValues.join(' ')}`, y, [...labelWords(label, y), ...document, ...numeric]);
}

const fixture1Raw = `INFORMAÇÃO NUTRICIONAL
Porções por embalagem: 12
Porção: 60 g (1 fatia)
100 g 60 g %VD`;

const fixture1Layout: NutritionLabelOcrLine[] = [
  line('Porções por embalagem: 12', 10, [...labelWords('Porções por embalagem', 10), word('12', 220, 10)]),
  line('Porção: 60 g (1 fatia)', 32, [...labelWords('Porção', 32), word('60', 220, 32), word('g', 244, 32), word('(1', 270, 32), word('fatia)', 290, 32)]),
  line('100 g 60 g %VD', 55, [word('100', 200, 55), word('g', 230, 55), word('60', 285, 55), word('g', 307, 55), word('%VD', 360, 55)]),
  row('Valor energético', 80, ['400', '240', '12'], ['400', '240', '12']),
  row('Carboidratos', 102, ['60', '369', '12'], ['60', '369', '12']),
  row('Açúcares totais', 124, ['409', '249', ''], ['409', '249', undefined]),
  row('Açúcares adicionados', 146, ['359', '219', '42'], ['359', '219', '42']),
  row('Proteínas', 168, ['49', '249', '5'], ['49', '249', '5']),
  row('Gorduras totais', 190, ['189', '119', '20'], ['189', '119', '20']),
  row('Gorduras saturadas', 212, ['89', '4,89', '24'], ['89', '4,89', '24']),
  row('Gorduras trans', 234, ['—', '—', '10'], ['—', '—', '10']),
  row('Fibra alimentar', 256, ['29', '1,29', '5'], ['29', '1,29', '5']),
  row('Sódio', 278, ['300', '180', '8'], ['300', '180', '8']),
];

const fixture2 = `INFORMAÇÃO NUTRICIONAL
Porções por embalagem: cerca de 33
Porção: 15 g (1 colher de sopa)
100 g | 15 g | %VD
Valor energético (kcal) 651 98 5
Carboidratos (g) 19 3 1
Açúcares totais (g) 4 0,6
Proteínas (g) 23 3 7
Gorduras totais (g) 54 8 12
Gorduras saturadas (g) 9,7 1,5 7
Fibra alimentar (g) 7,8 1 5
Não contém quantidades significativas de açúcares adicionados, gorduras trans e sódio.`;

describe('golden fixtures OCR nutricional 06.5', () => {
  it('reconstrói a fixture limpa por bounding boxes sem anexar a unidade g ao número', () => {
    const parsed = parseBrazilianNutritionLabel(fixture1Raw, fixture1Layout);
    expect(parsed.servingsPerContainer).toBe(12);
    expect(parsed.nutritionLabel?.declaredServingDescription).toBe('1 fatia');
    expect(parsed.columns?.per100).toMatchObject({ caloriesKcal: 400, carbsGrams: 60, sugarsGrams: 40, addedSugarsGrams: 35, proteinGrams: 4, fatGrams: 18, saturatedFatGrams: 8, fiberGrams: 2, sodiumMg: 300 });
    expect(parsed.columns?.portion).toMatchObject({ caloriesKcal: 240, carbsGrams: 36, sugarsGrams: 24, addedSugarsGrams: 21, proteinGrams: 2.4, fatGrams: 11, saturatedFatGrams: 4.8, fiberGrams: 1.2, sodiumMg: 180 });
    expect(parsed.columns?.dailyValuesPercent).toMatchObject({ caloriesKcal: 12, carbsGrams: 12, addedSugarsGrams: 42, proteinGrams: 5, fatGrams: 20, saturatedFatGrams: 24, transFatGrams: 10, fiberGrams: 5, sodiumMg: 8 });
    const per100 = parsed.columns?.per100 ?? {};
    expect([per100.sugarsGrams, per100.addedSugarsGrams, per100.proteinGrams, per100.fatGrams, per100.saturatedFatGrams, per100.fiberGrams]).not.toEqual(expect.arrayContaining([409, 359, 49, 189, 89, 29]));
    const columns = parsed.nutritionLabel?.columns ?? [];
    expect(columns.find((column) => column.id === 'per-100')?.cellDeclaration?.transFatGrams).toBe('dash');
    expect(columns.find((column) => column.id === 'declared-serving')?.cellDeclaration?.transFatGrams).toBe('dash');
  });

  it('preserva a fixture de câmera, arredondamentos e declaração de quantidade não significativa', () => {
    const parsed = parseBrazilianNutritionLabel(fixture2);
    expect(parsed.servingsPerContainer).toBe(33);
    expect(parsed.nutritionLabel?.servingsPerContainerText).toBe('cerca de 33');
    expect(parsed.nutritionLabel?.declaredServingDescription).toBe('1 colher de sopa');
    expect(parsed.columns?.per100).toMatchObject({ caloriesKcal: 651, carbsGrams: 19, sugarsGrams: 4, proteinGrams: 23, fatGrams: 54, saturatedFatGrams: 9.7, fiberGrams: 7.8 });
    expect(parsed.columns?.portion).toMatchObject({ caloriesKcal: 98, carbsGrams: 3, sugarsGrams: .6, proteinGrams: 3, fatGrams: 8, saturatedFatGrams: 1.5, fiberGrams: 1 });
    expect(parsed.columns?.dailyValuesPercent).toMatchObject({ caloriesKcal: 5, carbsGrams: 1, proteinGrams: 7, fatGrams: 12, saturatedFatGrams: 7, fiberGrams: 5 });
    for (const key of ['addedSugarsGrams', 'transFatGrams', 'sodiumMg'] as const) expect(parsed.nutritionLabel?.columns.find((column) => column.id === 'per-100')?.cellDeclaration?.[key]).toBe('insignificantAmount');
    expect(parsed.nutritionLabel?.originalDeclarations?.[0]).toContain('Não contém quantidades significativas');
  });

  it('tokeniza valor e unidade contextualmente sem corrigir 409 para 40', () => {
    expect(tokenizeNutritionMeasurement('40 g').value).toBe(40);
    expect(tokenizeNutritionMeasurement('2,4 g').value).toBe(2.4);
    expect(tokenizeNutritionMeasurement('300 mg').value).toBe(300);
    expect(tokenizeNutritionMeasurement('12%').value).toBe(12);
    expect(tokenizeNutritionMeasurement('409').value).toBe(409);
    expect(tokenizeNutritionMeasurement('g').value).toBeUndefined();
    const headerWithUnitGlyph = [
      line('Porção: 15 g', 10, [...labelWords('Porção', 10), word('15', 220, 10), word('g', 244, 10)]),
      line('100g 156 %VD', 32, [word('100g', 200, 32), word('156', 285, 32), word('%VD', 360, 32)]),
      row('Carboidratos', 55, ['199', '39', '1'], ['199', '39', '1']),
    ];
    const contextual = parseBrazilianNutritionLabel('Porção: 15 g\n100g 156 %VD', headerWithUnitGlyph);
    expect(contextual.columns?.per100?.carbsGrams).toBe(19);
    expect(contextual.columns?.portion?.carbsGrams).toBe(3);
    expect(contextual.columns?.dailyValuesPercent?.carbsGrams).toBe(1);
  });

  it('escala todos os nutrientes numéricos de 100 g sem transportar %VD', () => {
    const parsed = parseBrazilianNutritionLabel(fixture1Raw, fixture1Layout);
    const at70 = nutritionForAmount(parsed.columns?.per100 ?? {}, 100, 70);
    const at80 = nutritionForAmount(parsed.columns?.per100 ?? {}, 100, 80);
    expect(at70).toMatchObject({ caloriesKcal: 280, carbsGrams: 42, sugarsGrams: 28, addedSugarsGrams: 24.5, proteinGrams: 2.8, fatGrams: 12.6, saturatedFatGrams: 5.6, fiberGrams: 1.4, sodiumMg: 210 });
    expect(at80).toMatchObject({ caloriesKcal: 320, carbsGrams: 48, sugarsGrams: 32, addedSugarsGrams: 28, proteinGrams: 3.2, fatGrams: 14.4, saturatedFatGrams: 6.4, fiberGrams: 1.6, sodiumMg: 240 });
    expect(at70).not.toHaveProperty('dailyValuesPercent');
  });
});
