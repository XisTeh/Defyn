import type { NutrientValues, PortionUnit } from './food';

export interface ParsedNutritionLabel {
  rawText: string;
  portion?: { quantity: number; unit: PortionUnit };
  reference?: { quantity: number; unit: 'g' | 'ml' };
  productName?: string;
  nutrients: NutrientValues;
  confidence: Partial<Record<keyof NutrientValues | 'portion', 'high' | 'review'>>;
  warnings: string[];
  columns?: { selected: 'portion' | 'per100' | 'unknown'; portion?: NutrientValues; per100?: NutrientValues };
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

type NutrientKey = Exclude<keyof NutrientValues, 'other'>;
const rowDefinitions: readonly { key: NutrientKey; label: RegExp; unit: 'g' | 'mg' | 'kcal' }[] = [
  { key: 'caloriesKcal', label: /valor\s*energ[eé]tico|energia/i, unit: 'kcal' },
  { key: 'addedSugarsGrams', label: /a[cç][uú]cares?\s*adicionados?/i, unit: 'g' },
  { key: 'sugarsGrams', label: /a[cç][uú]cares?\s*totais?/i, unit: 'g' },
  { key: 'carbsGrams', label: /carboidratos?/i, unit: 'g' },
  { key: 'proteinGrams', label: /prote[ií]nas?/i, unit: 'g' },
  { key: 'saturatedFatGrams', label: /gorduras?\s*saturadas?/i, unit: 'g' },
  { key: 'transFatGrams', label: /gorduras?\s*trans/i, unit: 'g' },
  { key: 'fatGrams', label: /gorduras?\s*totais?/i, unit: 'g' },
  { key: 'fiberGrams', label: /fibra\s*alimentar|fibras?/i, unit: 'g' },
  { key: 'sodiumMg', label: /s[oó]dio/i, unit: 'mg' },
];

function rowNumbers(lines: string[], definition: typeof rowDefinitions[number]): number[] {
  const lineIndex = lines.findIndex((line) => definition.label.test(line));
  if (lineIndex < 0) return [];
  const line = lines[lineIndex] ?? '';
  const match = line.match(definition.label);
  const suffix = match ? line.slice((match.index ?? 0) + match[0].length) : line;
  const withContinuation = /\d/.test(suffix) ? suffix : `${suffix} ${lines[lineIndex + 1] ?? ''}`;
  const withoutUnitHint = withContinuation.replace(/^\s*\([^)]{0,8}\)/, ' ');
  if (definition.unit === 'kcal') {
    const kcalValues = [...withoutUnitHint.matchAll(/(\d+(?:[.,]\d+)?)\s*kcal/gi)].flatMap((item) => item[1] ? [decimal(item[1])] : []).filter((value): value is number => value !== undefined);
    if (kcalValues.length) return kcalValues;
  }
  return [...withoutUnitHint.matchAll(/\d+(?:[.,]\d+)?/g)].flatMap((item) => item[0] ? [decimal(item[0])] : []).filter((value): value is number => value !== undefined);
}

function parseColumnValues(lines: string[], hasSplitColumns: boolean) {
  const portion: NutrientValues = {};
  const per100: NutrientValues = {};
  const fallback: NutrientValues = {};
  for (const definition of rowDefinitions) {
    const values = rowNumbers(lines, definition);
    if (!values.length) continue;
    if (hasSplitColumns && values.length >= 2) {
      per100[definition.key] = values[0];
      portion[definition.key] = values[1];
    } else fallback[definition.key] = values[0];
  }
  return { portion, per100, fallback };
}

function hasValues(values: NutrientValues) { return Object.values(values).some((value) => typeof value === 'number'); }

export function parseBrazilianNutritionLabel(rawText: string): ParsedNutritionLabel {
  const text = rawText.replace(/\r/g, '').replace(/[|¦]/g, ' ');
  const lines = text.split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const portionMatch = text.match(/por[cç][aã]o[^\d]{0,30}(\d+(?:[.,]\d+)?)\s*(g|ml|un(?:idade)?)/i);
  const referenceMatch = text.match(/(?:por\s*)?(100)\s*(g|ml)/i);
  const portionQuantity = portionMatch?.[1] ? decimal(portionMatch[1]) : undefined;
  const portionUnit = portionMatch?.[2]?.toLowerCase();
  const headerHas100 = lines.some((line) => /100\s*(?:g|ml)/i.test(line) && /%\s*v\s*d/i.test(line));
  const headerHasPortion = portionQuantity !== undefined && lines.some((line) => {
    if (!/%\s*v\s*d/i.test(line)) return false;
    const normalizedQuantity = String(portionQuantity).replace('.', '[.,]');
    return new RegExp(`${normalizedQuantity}\\s*${portionUnit === 'ml' ? 'ml' : 'g'}`, 'i').test(line);
  });
  const hasSplitColumns = headerHas100 && headerHasPortion;
  const columnValues = parseColumnValues(lines, hasSplitColumns);
  const energy = columnValues.fallback.caloriesKcal ?? matchValue(text, ['valor\\s*energ[eé]tico', 'energia'], 'kcal') ?? (() => {
    const found = text.match(/(\d+(?:[.,]\d+)?)\s*kcal/i);
    return found?.[1] ? decimal(found[1]) : undefined;
  })();
  const legacyNutrients: NutrientValues = {
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
  const nutrients: NutrientValues = hasValues(columnValues.portion) ? columnValues.portion : { ...legacyNutrients, ...columnValues.fallback };
  const foundCount = Object.values(nutrients).filter((value) => typeof value === 'number').length;
  const warnings: string[] = [];
  if (!portionMatch) warnings.push('Porção não identificada; informe-a antes de salvar.');
  if (hasSplitColumns) warnings.push(`Valores da coluna da porção declarada (${portionQuantity} ${portionUnit}) foram priorizados. A coluna de 100 g/ml continua disponível para revisão.`);
  else if (portionMatch && referenceMatch) warnings.push('O rótulo contém coluna por porção e por 100 g/ml, mas o alinhamento não ficou claro. Confirme a base dos valores.');
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
    columns: hasSplitColumns ? { selected: 'portion', portion: columnValues.portion, per100: columnValues.per100 } : { selected: 'unknown' },
  };
}
