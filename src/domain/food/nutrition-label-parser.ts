import type { NutrientValues, PortionUnit } from './food';
import {
  CORE_NUTRIENT_KEYS,
  ensureCanonicalNutritionLabel,
  validateNutritionLabelStructure,
  type CoreNutrientKey,
  type NutritionLabel,
  type NutritionLabelBasisUnit,
  type NutritionLabelCellDeclaration,
  type NutritionLabelCellStatus,
  type NutritionLabelColumn,
} from './nutrition-label';

export interface NutritionLabelOcrToken {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  source?: 'document' | 'numeric-pass';
}

export interface NutritionLabelOcrLine extends NutritionLabelOcrToken {
  words?: NutritionLabelOcrToken[];
}

export interface NutritionOcrDebugCell {
  nutrient: CoreNutrientKey;
  columnId: string;
  raw: string;
  confidence: number;
  value?: number;
  declaration?: NutritionLabelCellDeclaration;
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
  debug?: { tokens: NutritionLabelOcrToken[]; cells: NutritionOcrDebugCell[] };
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

interface ParsedCell {
  raw: string;
  value?: number;
  declaration?: NutritionLabelCellDeclaration;
  confidence: number;
}

interface SpatialColumn {
  column: NutritionLabelColumn;
  centerX: number;
  left: number;
  right: number;
}

export function normalizeNutritionOcrText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[|¦]/g, ' ').replace(/\s+/g, ' ').trim();
}

function decimal(value: string): number | undefined {
  const compact = value.replace(/\s/g, '');
  if (!/^\d+(?:[.,]\d+)?$/.test(compact)) return undefined;
  const parsed = Number(compact.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function tokenizeNutritionMeasurement(value: string): ParsedCell {
  const raw = value.trim();
  const compact = normalizeNutritionOcrText(raw).replace(/^[([]|[)\].,:;]+$/g, '').trim();
  if (/^(?:—|–|-)$/.test(compact)) return { raw, declaration: 'dash', confidence: 100 };
  const match = compact.match(/^(\d+(?:[.,]\d+)?)\s*(g|mg|kcal|kj|ml|%)?$/i);
  if (!match?.[1]) return { raw, confidence: 0 };
  return { raw, value: decimal(match[1]), confidence: 100 };
}

function tokenCenterX(token: NutritionLabelOcrToken) { return (token.bbox.x0 + token.bbox.x1) / 2; }

function allWords(lines: readonly NutritionLabelOcrLine[]): NutritionLabelOcrToken[] {
  return lines.flatMap((line) => line.words?.length ? line.words : []);
}

function groupedWords(lines: readonly NutritionLabelOcrLine[]): NutritionLabelOcrToken[][] {
  const words = allWords(lines);
  if (!words.length) return [];
  const medianHeight = words.map((word) => Math.max(1, word.bbox.y1 - word.bbox.y0)).sort((a, b) => a - b)[Math.floor(words.length / 2)] ?? 12;
  const groups: NutritionLabelOcrToken[][] = [];
  for (const word of [...words].sort((a, b) => tokenCenterY(a) - tokenCenterY(b) || a.bbox.x0 - b.bbox.x0)) {
    const group = groups.find((candidate) => Math.abs(tokenCenterY(candidate[0]!) - tokenCenterY(word)) <= medianHeight * .9);
    if (group) group.push(word); else groups.push([word]);
  }
  return groups.map((group) => group.sort((a, b) => a.bbox.x0 - b.bbox.x0));
}

function tokenCenterY(token: NutritionLabelOcrToken) { return (token.bbox.y0 + token.bbox.y1) / 2; }

function rowMatches(row: typeof NUTRITION_LABEL_ROWS[number], text: string): boolean {
  const normalized = normalizeNutritionOcrText(text);
  const canonical = normalizeNutritionOcrText(row.label).toLowerCase();
  const candidate = normalized.toLowerCase().split(/\s+/).slice(0, canonical.split(/\s+/).length).join(' ').replace(/[^a-z ]/g, '');
  const direct = row.pattern.test(normalized);
  const fuzzy = candidate.length >= 5 && levenshtein(candidate, canonical.replace(/[^a-z ]/g, '')) <= Math.max(1, Math.floor(canonical.length * .1));
  if (!direct && !fuzzy) return false;
  if (row.key === 'energyKj') return /k\s*j/i.test(normalized);
  if (row.key === 'caloriesKcal') return /kcal/i.test(normalized) || !/k\s*j/i.test(normalized);
  return true;
}

function levenshtein(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0] ?? 0; previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column] ?? column; const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      previous[column] = Math.min(above + 1, (previous[column - 1] ?? row) + 1, diagonal + cost); diagonal = above;
    }
  }
  return previous[right.length] ?? Math.max(left.length, right.length);
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

function headerCandidate(words: NutritionLabelOcrToken[], quantity: number, unit: NutritionLabelBasisUnit): number | undefined {
  for (let index = 0; index < words.length; index += 1) {
    const first = normalizeNutritionOcrText(words[index]?.text ?? '');
    const second = normalizeNutritionOcrText(words[index + 1]?.text ?? '');
    const pattern = new RegExp(`^${String(quantity).replace('.', '[.,]')}\\s*${unit}$`, 'i');
    if (pattern.test(first)) return tokenCenterX(words[index]!);
    if (pattern.test(`${first} ${second}`) && words[index + 1]) return (words[index]!.bbox.x0 + words[index + 1]!.bbox.x1) / 2;
    if (unit === 'g' && new RegExp(`^${String(quantity).replace('.', '[.,]')}[69]$`).test(first)) return tokenCenterX(words[index]!);
  }
  return undefined;
}

function dailyHeaderCandidate(words: NutritionLabelOcrToken[]): number | undefined {
  for (let index = 0; index < words.length; index += 1) {
    const first = normalizeNutritionOcrText(words[index]?.text ?? '').replace(/\s/g, '');
    const second = normalizeNutritionOcrText(words[index + 1]?.text ?? '').replace(/\s/g, '');
    if (/^%?vd$/i.test(first)) return tokenCenterX(words[index]!);
    if (first === '%' && /^vd$/i.test(second) && words[index + 1]) return (words[index]!.bbox.x0 + words[index + 1]!.bbox.x1) / 2;
  }
  return undefined;
}

function defineColumns(lines: string[], layoutLines: readonly NutritionLabelOcrLine[], serving?: { quantity: number; unit: NutritionLabelBasisUnit }): { columns: NutritionLabelColumn[]; spatial: SpatialColumn[] } {
  const textHeader = lines.find((line) => /%\s*v\s*d/i.test(line) || /100\s*(g|ml)/i.test(line));
  const normalizedHeader = normalizeNutritionOcrText(textHeader ?? '');
  const hundred = /100\s*(g|ml)/i.exec(normalizedHeader);
  const unit = (hundred?.[1]?.toLowerCase() ?? serving?.unit) as NutritionLabelBasisUnit | undefined;
  const groups = groupedWords(layoutLines);
  const headerGroups = groups.filter((group) => /100\s*(?:g|ml)|%\s*v\s*d/i.test(normalizeNutritionOcrText(group.map((word) => word.text).join(' '))));
  const positioned: Array<{ column: NutritionLabelColumn; centerX: number }> = [];
  if (unit) {
    const centerX = headerGroups.map((group) => headerCandidate(group, 100, unit)).find((value) => value !== undefined);
    if (centerX !== undefined) positioned.push({ column: { id: 'per-100', label: `100 ${unit}`, kind: 'amount', basis: { quantity: 100, unit }, values: {}, source: 'explicit' }, centerX });
  }
  if (serving) {
    const centerX = headerGroups.map((group) => headerCandidate(group, serving.quantity, serving.unit)).find((value) => value !== undefined);
    if (centerX !== undefined) positioned.push({ column: { id: 'declared-serving', label: `${serving.quantity} ${serving.unit}`, kind: 'amount', basis: serving, values: {}, source: 'explicit' }, centerX });
  }
  const dailyX = headerGroups.map(dailyHeaderCandidate).find((value) => value !== undefined);
  if (dailyX !== undefined) positioned.push({ column: { id: 'daily-value', label: '%VD', kind: 'daily-value', dailyValuesPercent: {}, source: 'explicit' }, centerX: dailyX });

  const columns: NutritionLabelColumn[] = [];
  if (hundred?.[1] && unit) columns.push({ id: 'per-100', label: `100 ${unit}`, kind: 'amount', basis: { quantity: 100, unit }, values: {}, source: 'explicit' });
  if (serving && new RegExp(`${String(serving.quantity).replace('.', '[.,]')}\\s*${serving.unit}`, 'i').test(normalizedHeader)) columns.push({ id: 'declared-serving', label: `${serving.quantity} ${serving.unit}`, kind: 'amount', basis: serving, values: {}, source: 'explicit' });
  if (/%\s*v\s*d/i.test(normalizedHeader)) columns.push({ id: 'daily-value', label: '%VD', kind: 'daily-value', dailyValuesPercent: {}, source: 'explicit' });
  for (const item of positioned.sort((a, b) => a.centerX - b.centerX)) if (!columns.some((column) => column.id === item.column.id)) columns.push(item.column);
  if (!columns.some((column) => column.kind === 'amount') && serving) columns.unshift({ id: 'declared-serving', label: `${serving.quantity} ${serving.unit}`, kind: 'amount', basis: serving, values: {}, source: 'explicit' });
  if (!columns.some((column) => column.kind === 'amount') && unit) columns.unshift({ id: 'per-100', label: `100 ${unit}`, kind: 'amount', basis: { quantity: 100, unit }, values: {}, source: 'explicit' });

  const centers = columns.flatMap((column) => {
    const found = positioned.find((item) => item.column.id === column.id);
    return found ? [{ column, centerX: found.centerX }] : [];
  }).sort((a, b) => a.centerX - b.centerX);
  const spatial = centers.map((item, index) => ({
    ...item,
    left: index === 0 ? Number.NEGATIVE_INFINITY : ((centers[index - 1]?.centerX ?? item.centerX) + item.centerX) / 2,
    right: index === centers.length - 1 ? Number.POSITIVE_INFINITY : (item.centerX + (centers[index + 1]?.centerX ?? item.centerX)) / 2,
  }));
  return { columns, spatial };
}

function textCells(lines: string[], row: typeof NUTRITION_LABEL_ROWS[number]): ParsedCell[] {
  const index = lines.findIndex((line) => rowMatches(row, line));
  if (index < 0) return [];
  const line = normalizeNutritionOcrText(lines[index] ?? '');
  const matched = line.match(row.pattern);
  let suffix = matched ? line.slice((matched.index ?? 0) + matched[0].length) : line;
  suffix = suffix.replace(/^\s*\((?:g|mg|kcal|k\s*j)\)/i, ' ');
  if (!/\d|[-—–]/.test(suffix)) suffix = `${suffix} ${normalizeNutritionOcrText(lines[index + 1] ?? '')}`;
  return [...suffix.matchAll(/(?:^|\s)(—|–|-|\d+(?:[.,]\d+)?)(?:\s*(?:kcal|k\s*j|mg|g|ml|%))?(?=\s|$)/gi)].map((match) => tokenizeNutritionMeasurement(match[1] ?? ''));
}

function spatialCells(layoutLines: readonly NutritionLabelOcrLine[], row: typeof NUTRITION_LABEL_ROWS[number], columns: readonly SpatialColumn[]): Array<{ columnId: string; cell: ParsedCell }> {
  if (!columns.length) return [];
  const group = groupedWords(layoutLines).find((words) => rowMatches(row, words.map((word) => word.text).join(' ')));
  if (!group?.length) return [];
  let labelEnd = Number.NEGATIVE_INFINITY;
  for (let index = 1; index <= group.length; index += 1) {
    const prefix = group.slice(0, index).map((word) => word.text).join(' ');
    if (rowMatches(row, prefix)) { labelEnd = group[index - 1]?.bbox.x1 ?? labelEnd; break; }
  }
  return columns.flatMap(({ column, left, right }) => {
    const words = group.filter((word) => tokenCenterX(word) > Math.max(left, labelEnd) && tokenCenterX(word) <= right);
    if (!words.length) return [];
    const raw = words.map((word) => word.text).join(' ');
    const numericPassWords = words.filter((word) => word.source === 'numeric-pass');
    const candidates = (numericPassWords.length ? numericPassWords : words).map((word) => tokenizeNutritionMeasurement(word.text)).filter((cell) => cell.value !== undefined || cell.declaration);
    const cell = candidates[0] ?? tokenizeNutritionMeasurement(raw);
    return [{ columnId: column.id, cell: { ...cell, raw: cell.raw || raw, confidence: Math.min(...words.map((word) => word.confidence)) } }];
  });
}

function assign(column: NutritionLabelColumn, key: CoreNutrientKey, cell: ParsedCell, status: NutritionLabelCellStatus) {
  if (cell.declaration) column.cellDeclaration = { ...column.cellDeclaration, [key]: cell.declaration };
  if (cell.value !== undefined) {
    if (column.kind === 'daily-value') column.dailyValuesPercent = { ...column.dailyValuesPercent, [key]: cell.value };
    else column.values = { ...column.values, [key]: cell.value };
  }
  if (cell.value !== undefined || cell.declaration) column.cellStatus = { ...column.cellStatus, [key]: status };
}

function numberFrom(text: string, pattern: RegExp): number | undefined {
  const found = text.match(pattern);
  return found?.[1] ? decimal(found[1]) : undefined;
}

function hasValues(values?: NutrientValues) { return Boolean(values && Object.values(values).some((value) => typeof value === 'number')); }
const INSIGNIFICANT_KEYS: CoreNutrientKey[] = ['addedSugarsGrams', 'transFatGrams', 'sodiumMg'];

function contextualCandidates(cell: NutritionOcrDebugCell | undefined, current: number | undefined): Array<{ value: number; cost: number }> {
  if (current === undefined) return [];
  const candidates = [{ value: current, cost: 0 }];
  const token = cell?.raw.replace(/\s/g, '').match(/\d+(?:[.,]\d+)?/)?.[0];
  if (!token?.endsWith('9') || token.length < 2) return candidates;
  const stripped = decimal(token.slice(0, -1));
  if (stripped !== undefined) {
    candidates.push({ value: stripped, cost: .001 });
    if (!/[.,]/.test(token) && stripped >= 10) candidates.push({ value: stripped / 10, cost: .003 });
  }
  return candidates;
}

function repairContextualGramGlyphs(columns: NutritionLabelColumn[], serving: { quantity: number; unit: NutritionLabelBasisUnit } | undefined, debugCells: NutritionOcrDebugCell[]): CoreNutrientKey[] {
  if (!serving || serving.unit !== 'g') return [];
  const per100 = columns.find((column) => column.id === 'per-100'); const portion = columns.find((column) => column.id === 'declared-serving');
  if (!per100?.values || !portion?.values) return [];
  const repaired: CoreNutrientKey[] = []; const ratio = serving.quantity / 100;
  for (const row of NUTRITION_LABEL_ROWS.filter((item) => item.unit === 'g')) {
    const hundred = per100.values[row.key]; const declared = portion.values[row.key];
    if (hundred === undefined || declared === undefined) continue;
    const hundredCandidates = contextualCandidates(debugCells.find((cell) => cell.nutrient === row.key && cell.columnId === 'per-100'), hundred);
    const portionCandidates = contextualCandidates(debugCells.find((cell) => cell.nutrient === row.key && cell.columnId === 'declared-serving'), declared);
    const score = (hundredValue: number, portionValue: number, cost: number) => {
      const expected = hundredValue * ratio; const proportionError = Math.abs(portionValue - expected) / Math.max(.2, Math.abs(expected));
      const physicalPenalty = hundredValue > 100.5 || portionValue > serving.quantity * 1.05 ? 4 : 0;
      return proportionError + physicalPenalty + cost;
    };
    const originalScore = score(hundred, declared, 0); let best = { hundred, declared, score: originalScore, cost: 0 };
    for (const hundredCandidate of hundredCandidates) for (const portionCandidate of portionCandidates) {
      const candidateScore = score(hundredCandidate.value, portionCandidate.value, hundredCandidate.cost + portionCandidate.cost);
      if (candidateScore < best.score) best = { hundred: hundredCandidate.value, declared: portionCandidate.value, score: candidateScore, cost: hundredCandidate.cost + portionCandidate.cost };
    }
    const pairedRepairs = hundredCandidates.filter((candidate) => candidate.cost > 0).flatMap((hundredCandidate) => portionCandidates.filter((candidate) => candidate.cost > 0).map((portionCandidate) => ({ hundred: hundredCandidate.value, declared: portionCandidate.value, score: score(hundredCandidate.value, portionCandidate.value, 0), cost: hundredCandidate.cost + portionCandidate.cost })));
    const pairedBest = pairedRepairs.sort((left, right) => (left.score + left.cost) - (right.score + right.cost))[0];
    if (pairedBest && pairedBest.score <= .2) best = pairedBest;
    const bestExpected = best.hundred * ratio; const bestError = Math.abs(best.declared - bestExpected) / Math.max(.2, Math.abs(bestExpected));
    if (best.cost > 0 && bestError <= .2 && best.score + .2 < originalScore) {
      per100.values[row.key] = best.hundred; portion.values[row.key] = best.declared;
      per100.cellStatus = { ...per100.cellStatus, [row.key]: 'review' }; portion.cellStatus = { ...portion.cellStatus, [row.key]: 'review' }; repaired.push(row.key);
    }
  }
  return repaired;
}

export function parseBrazilianNutritionLabel(rawText: string, layoutLines: readonly NutritionLabelOcrLine[] = []): ParsedNutritionLabel {
  const structuredText = reconstructNutritionLabelText(rawText, layoutLines);
  const lines = structuredText.split('\n').map(normalizeNutritionOcrText).filter(Boolean);
  const searchable = normalizeNutritionOcrText(structuredText);
  const servingQuantity = numberFrom(searchable, /por[cç]ao[^\d]{0,30}(\d+(?:[.,]\d+)?)\s*(?:g|ml)/i);
  const servingUnitMatch = searchable.match(/por[cç]ao[^\d]{0,30}\d+(?:[.,]\d+)?\s*(g|ml)/i);
  const serving = servingQuantity !== undefined && servingUnitMatch?.[1] ? { quantity: servingQuantity, unit: servingUnitMatch[1].toLowerCase() as NutritionLabelBasisUnit } : undefined;
  const servingDescription = searchable.match(/por[cç]ao[^\d]{0,30}\d+(?:[.,]\d+)?\s*(?:g|ml)\s*\(([^)]+)\)/i)?.[1]?.trim();
  const servingsText = searchable.match(/por[cç]oes?\s*por\s*embalagem\s*:?\s*((?:cerca\s+de\s+)?\d+(?:[.,]\d+)?)/i)?.[1];
  const servingsPerContainer = servingsText ? decimal(servingsText.replace(/cerca\s+de\s+/i, '')) : undefined;
  const referenceMatch = searchable.match(/(?:por\s*)?100\s*(g|ml)/i);
  const { columns, spatial } = defineColumns(lines, layoutLines, serving);
  const debugCells: NutritionOcrDebugCell[] = [];

  for (const row of NUTRITION_LABEL_ROWS) {
    const positioned = spatialCells(layoutLines, row, spatial);
    if (positioned.length) {
      for (const { columnId, cell } of positioned) {
        const column = columns.find((item) => item.id === columnId);
        if (!column) continue;
        assign(column, row.key, cell, cell.confidence >= 75 ? 'probable' : 'review');
        debugCells.push({ nutrient: row.key, columnId, ...cell });
      }
      continue;
    }
    const cells = textCells(lines, row);
    columns.forEach((column, index) => {
      const cell = cells[index];
      if (!cell) return;
      assign(column, row.key, cell, 'probable');
      debugCells.push({ nutrient: row.key, columnId: column.id, ...cell });
    });
  }

  const repairedGlyphs = repairContextualGramGlyphs(columns, serving, debugCells);

  const insignificantText = structuredText.match(/n[aã]o\s+cont[eé]m\s+quantidades?\s+significativas?[^.\n]*/i)?.[0];
  if (insignificantText) for (const key of INSIGNIFICANT_KEYS) for (const column of columns) {
    const hasNumber = column.kind === 'daily-value' ? column.dailyValuesPercent?.[key] !== undefined : column.values?.[key] !== undefined;
    if (!hasNumber) assign(column, key, { raw: insignificantText, declaration: 'insignificantAmount', confidence: 100 }, 'confirmed');
  }

  let nutritionLabel: NutritionLabel | undefined;
  if (columns.some((column) => column.kind === 'amount' && hasValues(column.values))) {
    try {
      nutritionLabel = ensureCanonicalNutritionLabel({ version: 1, servingsPerContainer, servingsPerContainerText: servingsText, declaredServing: serving, declaredServingDescription: servingDescription, columns, rawText, originalDeclarations: insignificantText ? [insignificantText] : undefined });
      const issues = validateNutritionLabelStructure(nutritionLabel);
      for (const issue of issues) for (const column of nutritionLabel.columns) for (const key of issue.nutrientKeys) if (column.values?.[key] !== undefined) column.cellStatus = { ...column.cellStatus, [key]: 'review' };
    } catch { nutritionLabel = undefined; }
  }

  const per100 = nutritionLabel?.columns.find((column) => column.id === 'per-100')?.values;
  const portion = nutritionLabel?.columns.find((column) => column.id === 'declared-serving')?.values;
  const dailyValuesPercent = nutritionLabel?.columns.find((column) => column.kind === 'daily-value')?.dailyValuesPercent;
  const calculationColumn = nutritionLabel?.columns.find((column) => column.id === nutritionLabel?.calculationBasis.columnId);
  const legacyFallback: NutrientValues = {};
  if (!nutritionLabel) for (const row of NUTRITION_LABEL_ROWS) {
    const value = textCells(lines, row)[0]?.value;
    if (value !== undefined) legacyFallback[row.key] = value;
  }
  const nutrients = calculationColumn?.values ?? legacyFallback;
  const foundCount = CORE_NUTRIENT_KEYS.filter((key) => nutrients[key] !== undefined).length;
  const warnings: string[] = [];
  if (!serving) warnings.push('Porção não identificada; informe-a antes de salvar.');
  if (nutritionLabel?.calculationBasis.source === 'derived') warnings.push(`A base de 100 ${nutritionLabel.calculationBasis.unit} foi derivada da porção impressa e está marcada como derivada.`);
  if (repairedGlyphs.length) warnings.push('Possíveis unidades “g” anexadas aos números foram removidas somente onde linha, coluna, unidade e proporção concordaram. Essas células permanecem marcadas para revisão.');
  if (per100 && portion) warnings.push('As colunas de 100 g/ml e da porção foram preservadas separadamente; arredondamentos do fabricante não serão sobrescritos.');
  if (foundCount < 4) warnings.push('Poucos nutrientes foram reconhecidos. Campos ausentes continuam vazios e precisam ser conferidos.');
  if (nutritionLabel) warnings.push(...validateNutritionLabelStructure(nutritionLabel).map((issue) => issue.message));
  const confidence = Object.fromEntries(CORE_NUTRIENT_KEYS.filter((key) => nutrients[key] !== undefined).map((key) => [key, nutritionLabel?.columns.find((column) => column.id === nutritionLabel?.calculationBasis.columnId)?.cellStatus?.[key] === 'review' ? 'review' : 'high'])) as ParsedNutritionLabel['confidence'];
  if (serving) confidence.portion = 'high';

  return {
    rawText,
    structuredText,
    portion: serving,
    servingsPerContainer,
    reference: referenceMatch?.[1] ? { quantity: 100, unit: referenceMatch[1].toLowerCase() as 'g' | 'ml' } : undefined,
    nutrients,
    nutritionLabel,
    confidence,
    warnings,
    columns: nutritionLabel ? { selected: nutritionLabel.calculationBasis.source === 'explicit' && nutritionLabel.calculationBasis.quantity === 100 ? 'per100' : 'portion', portion, per100, dailyValuesPercent } : { selected: 'unknown' },
    debug: import.meta.env.DEV ? { tokens: allWords(layoutLines), cells: debugCells } : undefined,
  };
}
