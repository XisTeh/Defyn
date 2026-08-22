import type { NutrientValues, PortionUnit } from './food';
import {
  CORE_NUTRIENT_KEYS,
  ensureCanonicalNutritionLabel,
  validateNutritionLabelStructure,
  type CoreNutrientKey,
  type NutritionLabel,
  type NutritionLabelBasisUnit,
  type NutritionLabelColumn,
  type NutritionLabelCellStatus,
} from './nutrition-label';

export interface NutritionLabelOcrLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface ParsedNutritionLabel {
  rawText: string;
  structuredText: string;
  portion?: { quantity: number; unit: PortionUnit };
  servingsPerContainer?: number;
  reference?: { quantity: number; unit: 'g' | 'ml' };
  productName?: string;
  nutrients: NutrientValues;
  nutritionLabel?: NutritionLabel;
  confidence: Partial<Record<keyof NutrientValues | 'portion', 'high' | 'review'>>;
  warnings: string[];
  columns?: { selected: 'portion' | 'per100' | 'unknown'; portion?: NutrientValues; per100?: NutrientValues; dailyValuesPercent?: Partial<Record<CoreNutrientKey, number>> };
}

export const NUTRITION_LABEL_ROWS: readonly { key: CoreNutrientKey; label: string; unit: 'g' | 'mg' | 'kcal' | 'kJ'; pattern: RegExp }[] = [
  { key: 'caloriesKcal', label: 'Valor energético', unit: 'kcal', pattern: /valor\s*energetico|energia/i },
  { key: 'energyKj', label: 'Valor energético (kJ)', unit: 'kJ', pattern: /valor\s*energetico|energia/i },
  { key: 'carbsGrams', label: 'Carboidratos', unit: 'g', pattern: /carboidratos?/i },
  { key: 'sugarsGrams', label: 'Açúcares totais', unit: 'g', pattern: /a[cç]ucares?\s*totais?/i },
  { key: 'addedSugarsGrams', label: 'Açúcares adicionados', unit: 'g', pattern: /a[cç]ucares?\s*adicionados?/i },
  { key: 'proteinGrams', label: 'Proteínas', unit: 'g', pattern: /proteinas?/i },
  { key: 'fatGrams', label: 'Gorduras totais', unit: 'g', pattern: /gorduras?\s*totais?|gordura\s*total/i },
  { key: 'saturatedFatGrams', label: 'Gorduras saturadas', unit: 'g', pattern: /gorduras?\s*saturadas?/i },
  { key: 'transFatGrams', label: 'Gorduras trans', unit: 'g', pattern: /gorduras?\s*trans/i },
  { key: 'fiberGrams', label: 'Fibra alimentar', unit: 'g', pattern: /fibra\s*alimenta[ril]|fibras?/i },
  { key: 'sodiumMg', label: 'Sódio', unit: 'mg', pattern: /sodio/i },
];

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[|¦]/g, ' ').replace(/\s+/g, ' ').trim();
}

function decimal(value: string): number | undefined {
  const compact = value.replace(/\s/g, '');
  if (/^[-—]$/.test(compact)) return undefined;
  const safelyCorrected = /\d/.test(compact) && /^[\dOIlS.,]+$/.test(compact)
    ? compact.replace(/[O]/g, '0').replace(/[Il]/g, '1').replace(/S/g, '5')
    : compact;
  const normalized = safelyCorrected.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function reconstructNutritionLabelText(rawText: string, layoutLines: readonly NutritionLabelOcrLine[] = []): string {
  if (!layoutLines.length) return rawText.replace(/\r/g, '');
  const medianHeight = [...layoutLines].map((line) => Math.max(1, line.bbox.y1 - line.bbox.y0)).sort((a, b) => a - b)[Math.floor(layoutLines.length / 2)] ?? 12;
  const ordered = [...layoutLines].sort((a, b) => Math.abs(a.bbox.y0 - b.bbox.y0) <= medianHeight * .45 ? a.bbox.x0 - b.bbox.x0 : a.bbox.y0 - b.bbox.y0);
  const rows: NutritionLabelOcrLine[][] = [];
  for (const line of ordered) {
    const row = rows.find((candidate) => Math.abs((candidate[0]?.bbox.y0 ?? 0) - line.bbox.y0) <= medianHeight * .45);
    if (row) row.push(line); else rows.push([line]);
  }
  return rows.sort((a, b) => (a[0]?.bbox.y0 ?? 0) - (b[0]?.bbox.y0 ?? 0)).map((row) => row.sort((a, b) => a.bbox.x0 - b.bbox.x0).map((line) => line.text.trim()).filter(Boolean).join('   ')).join('\n');
}

function numericTokens(value: string): Array<number | undefined> {
  return [...value.matchAll(/(?:\d[\dOIlS]*(?:[.,][\dOIlS]+)?|[-—])/g)].map((match) => decimal(match[0]));
}

function findRowTokens(lines: string[], row: typeof NUTRITION_LABEL_ROWS[number]): Array<number | undefined> {
  const index = lines.findIndex((line) => {
    const normalized = normalizeText(line);
    if (!row.pattern.test(normalized)) return false;
    if (row.key === 'energyKj') return /k\s*j/i.test(normalized);
    if (row.key === 'caloriesKcal') return /kcal/i.test(normalized) || !/k\s*j/i.test(normalized);
    return true;
  });
  if (index < 0) return [];
  const line = normalizeText(lines[index] ?? '');
  const matched = line.match(row.pattern);
  let suffix = matched ? line.slice((matched.index ?? 0) + matched[0].length) : line;
  suffix = suffix.replace(/^\s*\([^)]{0,16}\)/, ' ');
  if (!/\d|[-—]/.test(suffix)) suffix = `${suffix} ${normalizeText(lines[index + 1] ?? '')}`;
  return numericTokens(suffix);
}

function numberFrom(text: string, pattern: RegExp): number | undefined {
  const found = text.match(pattern);
  return found?.[1] ? decimal(found[1]) : undefined;
}

function assign(column: NutritionLabelColumn, key: CoreNutrientKey, value: number | undefined, status: NutritionLabelCellStatus) {
  if (value === undefined) return;
  if (column.kind === 'daily-value') column.dailyValuesPercent = { ...column.dailyValuesPercent, [key]: value };
  else column.values = { ...column.values, [key]: value };
  column.cellStatus = { ...column.cellStatus, [key]: status };
}

function columnDefinitions(lines: string[], serving?: { quantity: number; unit: NutritionLabelBasisUnit }): NutritionLabelColumn[] {
  const header = lines.find((line) => /%\s*v\s*d/i.test(normalizeText(line)) || (/100\s*(g|ml)/i.test(normalizeText(line)) && serving && new RegExp(`${serving.quantity}\\s*${serving.unit}`, 'i').test(normalizeText(line))));
  const normalized = normalizeText(header ?? '');
  const has100 = /100\s*(g|ml)/i.exec(normalized);
  const hasServing = serving && new RegExp(`${String(serving.quantity).replace('.', '[.,]')}\\s*${serving.unit}`, 'i').test(normalized);
  const hasDailyValue = /%\s*v\s*d/i.test(normalized);
  const columns: NutritionLabelColumn[] = [];
  if (has100?.[1]) columns.push({ id: 'per-100', label: `100 ${has100[1].toLowerCase()}`, kind: 'amount', basis: { quantity: 100, unit: has100[1].toLowerCase() as NutritionLabelBasisUnit }, values: {}, source: 'explicit' });
  if (hasServing && serving) columns.push({ id: 'declared-serving', label: `${serving.quantity} ${serving.unit}`, kind: 'amount', basis: serving, values: {}, source: 'explicit' });
  if (hasDailyValue) columns.push({ id: 'daily-value', label: '%VD', kind: 'daily-value', dailyValuesPercent: {}, source: 'explicit' });
  if (!columns.some((column) => column.kind === 'amount') && serving) columns.unshift({ id: 'declared-serving', label: `${serving.quantity} ${serving.unit}`, kind: 'amount', basis: serving, values: {}, source: 'explicit' });
  if (!columns.some((column) => column.kind === 'amount') && has100?.[1]) columns.unshift({ id: 'per-100', label: `100 ${has100[1].toLowerCase()}`, kind: 'amount', basis: { quantity: 100, unit: has100[1].toLowerCase() as NutritionLabelBasisUnit }, values: {}, source: 'explicit' });
  return columns;
}

function hasValues(values?: NutrientValues) { return Boolean(values && Object.values(values).some((value) => typeof value === 'number')); }

export function parseBrazilianNutritionLabel(rawText: string, layoutLines: readonly NutritionLabelOcrLine[] = []): ParsedNutritionLabel {
  const structuredText = reconstructNutritionLabelText(rawText, layoutLines);
  const lines = structuredText.split('\n').map(normalizeText).filter(Boolean);
  const searchable = normalizeText(structuredText);
  const servingQuantity = numberFrom(searchable, /por[cç]ao[^\d]{0,30}(\d+(?:[.,]\d+)?)\s*(?:g|ml)/i);
  const servingUnitMatch = searchable.match(/por[cç]ao[^\d]{0,30}\d+(?:[.,]\d+)?\s*(g|ml)/i);
  const serving = servingQuantity !== undefined && servingUnitMatch?.[1] ? { quantity: servingQuantity, unit: servingUnitMatch[1].toLowerCase() as NutritionLabelBasisUnit } : undefined;
  const servingsPerContainer = numberFrom(searchable, /por[cç]oes?\s*por\s*embalagem[^\d]{0,20}(\d+(?:[.,]\d+)?)/i);
  const referenceMatch = searchable.match(/(?:por\s*)?100\s*(g|ml)/i);
  const columns = columnDefinitions(lines, serving);
  for (const row of NUTRITION_LABEL_ROWS) {
    const values = findRowTokens(lines, row);
    columns.forEach((column, index) => assign(column, row.key, values[index], 'probable'));
  }

  let nutritionLabel: NutritionLabel | undefined;
  if (columns.some((column) => column.kind === 'amount' && hasValues(column.values))) {
    try {
      nutritionLabel = ensureCanonicalNutritionLabel({ version: 1, servingsPerContainer, declaredServing: serving, columns, rawText });
      const issues = validateNutritionLabelStructure(nutritionLabel);
      for (const issue of issues) for (const column of nutritionLabel.columns) for (const key of issue.nutrientKeys) if (column.values?.[key] !== undefined) column.cellStatus = { ...column.cellStatus, [key]: 'review' };
    } catch { nutritionLabel = undefined; }
  }

  const per100 = nutritionLabel?.columns.find((column) => column.id === 'per-100')?.values;
  const portion = nutritionLabel?.columns.find((column) => column.id === 'declared-serving')?.values;
  const dailyValuesPercent = nutritionLabel?.columns.find((column) => column.kind === 'daily-value')?.dailyValuesPercent;
  const calculationColumn = nutritionLabel?.columns.find((column) => column.id === nutritionLabel?.calculationBasis.columnId);
  const legacyFallback: NutrientValues = {};
  if (!nutritionLabel) {
    for (const row of NUTRITION_LABEL_ROWS) {
      const value = findRowTokens(lines, row)[0];
      if (value !== undefined) legacyFallback[row.key] = value;
    }
  }
  const nutrients = calculationColumn?.values ?? legacyFallback;
  const foundCount = CORE_NUTRIENT_KEYS.filter((key) => nutrients[key] !== undefined).length;
  const warnings: string[] = [];
  if (!serving) warnings.push('Porção não identificada; informe-a antes de salvar.');
  if (nutritionLabel?.calculationBasis.source === 'derived') warnings.push(`A base de 100 ${nutritionLabel.calculationBasis.unit} foi derivada da porção impressa e está marcada como derivada.`);
  if (per100 && portion) warnings.push('As colunas de 100 g/ml e da porção foram preservadas separadamente; arredondamentos do fabricante não serão sobrescritos.');
  if (foundCount < 4) warnings.push('Poucos nutrientes foram reconhecidos. Campos ausentes continuam vazios e precisam ser conferidos.');
  if (nutritionLabel) warnings.push(...validateNutritionLabelStructure(nutritionLabel).map((issue) => issue.message));
  const confidence = Object.fromEntries(CORE_NUTRIENT_KEYS.filter((key) => nutrients[key] !== undefined).map((key) => [key, nutritionLabel?.columns.find((column) => column.id === nutritionLabel?.calculationBasis.columnId)?.cellStatus?.[key] === 'review' ? 'review' : 'high'])) as ParsedNutritionLabel['confidence'];
  if (serving) confidence.portion = 'high';

  return {
    rawText, structuredText, portion: serving, servingsPerContainer,
    reference: referenceMatch?.[1] ? { quantity: 100, unit: referenceMatch[1].toLowerCase() as 'g' | 'ml' } : undefined,
    nutrients, nutritionLabel, confidence, warnings,
    columns: nutritionLabel ? { selected: nutritionLabel.calculationBasis.source === 'explicit' && nutritionLabel.calculationBasis.quantity === 100 ? 'per100' : 'portion', portion, per100, dailyValuesPercent } : { selected: 'unknown' },
  };
}
