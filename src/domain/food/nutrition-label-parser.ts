import type { NutrientValues, PortionUnit } from './food';

export interface ParsedNutritionLabel {
  rawText: string;
  portion?: { quantity: number; unit: PortionUnit };
  reference?: { quantity: number; unit: 'g' | 'ml' };
  productName?: string;
  nutrients: NutrientValues;
  confidence: Partial<Record<keyof NutrientValues | 'portion', 'high' | 'review'>>;
  warnings: string[];
}

function decimal(value: string): number | undefined {
  const normalized = value.replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function matchValue(text: string, labels: readonly string[], unit: 'g' | 'mg' | 'kcal'): number | undefined {
  for (const label of labels) {
    const pattern = new RegExp(`${label}[^\\n\\d]{0,24}(\\d+(?:[.,]\\d+)?)\\s*${unit}`, 'i');
    const found = text.match(pattern);
    if (found?.[1]) return decimal(found[1]);
  }
}

export function parseBrazilianNutritionLabel(rawText: string): ParsedNutritionLabel {
  const text = rawText.replace(/\r/g, '').replace(/[|]/g, 'I');
  const portionMatch = text.match(/por[cç][aã]o[^\d]{0,30}(\d+(?:[.,]\d+)?)\s*(g|ml|un(?:idade)?)/i);
  const referenceMatch = text.match(/(?:por\s*)?(100)\s*(g|ml)/i);
  const energy = matchValue(text, ['valor\\s*energ[eé]tico', 'energia'], 'kcal') ?? (() => {
    const found = text.match(/(\d+(?:[.,]\d+)?)\s*kcal/i);
    return found?.[1] ? decimal(found[1]) : undefined;
  })();
  const nutrients: NutrientValues = {
    caloriesKcal: energy,
    carbsGrams: matchValue(text, ['carboidratos?'], 'g'),
    proteinGrams: matchValue(text, ['prote[ií]nas?'], 'g'),
    fatGrams: matchValue(text, ['gorduras?\\s*totais'], 'g'),
    saturatedFatGrams: matchValue(text, ['gorduras?\\s*saturadas?'], 'g'),
    transFatGrams: matchValue(text, ['gorduras?\\s*trans'], 'g'),
    fiberGrams: matchValue(text, ['fibra\\s*alimentar', 'fibras?'], 'g'),
    sugarsGrams: matchValue(text, ['a[cç][uú]cares?\\s*totais'], 'g'),
    addedSugarsGrams: matchValue(text, ['a[cç][uú]cares?\\s*adicionados'], 'g'),
    sodiumMg: matchValue(text, ['s[oó]dio'], 'mg'),
  };
  const foundCount = Object.values(nutrients).filter((value) => typeof value === 'number').length;
  const warnings: string[] = [];
  if (!portionMatch) warnings.push('Porção não identificada; informe-a antes de salvar.');
  if (portionMatch && referenceMatch) warnings.push('O rótulo contém coluna por porção e por 100 g/ml. Confirme de qual coluna vieram os valores.');
  if (portionMatch && (decimal(portionMatch[1] ?? '') ?? 0) <= 0) warnings.push('A porção reconhecida é inválida e precisa ser corrigida.');
  if (foundCount < 4) warnings.push('Poucos nutrientes foram reconhecidos. Confira o rótulo e complete somente o que estiver visível.');
  const confidence = Object.fromEntries(Object.entries(nutrients).filter(([, value]) => value !== undefined).map(([key]) => [key, foundCount >= 4 ? 'high' : 'review'])) as ParsedNutritionLabel['confidence'];
  if (portionMatch) confidence.portion = 'high';
  return {
    rawText,
    portion: portionMatch?.[1] && portionMatch[2] ? { quantity: decimal(portionMatch[1]) ?? 0, unit: portionMatch[2].toLowerCase().startsWith('un') ? 'unit' : portionMatch[2].toLowerCase() } : undefined,
    reference: referenceMatch?.[2] ? { quantity: 100, unit: referenceMatch[2].toLowerCase() as 'g' | 'ml' } : undefined,
    nutrients,
    confidence,
    warnings,
  };
}
