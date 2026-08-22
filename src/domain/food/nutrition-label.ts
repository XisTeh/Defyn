import { scaleNutrients, type NutrientValues } from './food';

export const CORE_NUTRIENT_KEYS = [
  'caloriesKcal', 'energyKj', 'carbsGrams', 'sugarsGrams', 'addedSugarsGrams',
  'proteinGrams', 'fatGrams', 'saturatedFatGrams', 'transFatGrams',
  'fiberGrams', 'sodiumMg',
] as const;

export type CoreNutrientKey = typeof CORE_NUTRIENT_KEYS[number];
export type NutritionLabelCellStatus = 'confirmed' | 'probable' | 'review' | 'missing';
export type NutritionLabelBasisUnit = 'g' | 'ml';

export interface NutritionLabelColumn {
  id: string;
  label: string;
  kind: 'amount' | 'daily-value';
  basis?: { quantity: number; unit: NutritionLabelBasisUnit };
  values?: NutrientValues;
  dailyValuesPercent?: Partial<Record<CoreNutrientKey, number>>;
  source: 'explicit' | 'derived';
  cellStatus?: Partial<Record<CoreNutrientKey, NutritionLabelCellStatus>>;
}

export interface NutritionLabel {
  version: 1;
  servingsPerContainer?: number;
  declaredServing?: { quantity: number; unit: NutritionLabelBasisUnit };
  columns: NutritionLabelColumn[];
  calculationBasis: {
    columnId: string;
    quantity: number;
    unit: NutritionLabelBasisUnit;
    source: 'explicit' | 'derived';
  };
  rawText?: string;
}

export interface NutritionLabelIssue {
  kind: 'macro-energy' | 'proportion';
  nutrientKeys: CoreNutrientKey[];
  message: string;
}

export function nutritionForAmount(baseNutrition: NutrientValues, baseAmount: number, requestedAmount: number): NutrientValues {
  return scaleNutrients(baseNutrition, baseAmount, requestedAmount);
}

export function calculationNutrition(label: NutritionLabel): NutrientValues {
  return label.columns.find((column) => column.id === label.calculationBasis.columnId)?.values ?? {};
}

export function amountColumns(label: NutritionLabel): NutritionLabelColumn[] {
  return label.columns.filter((column) => column.kind === 'amount' && column.basis && column.values);
}

export function ensureCanonicalNutritionLabel(label: Omit<NutritionLabel, 'calculationBasis'>): NutritionLabel {
  const explicitPer100 = label.columns.find((column) => column.kind === 'amount' && column.source === 'explicit' && column.basis?.quantity === 100 && (column.basis.unit === 'g' || column.basis.unit === 'ml'));
  if (explicitPer100?.basis) return { ...label, calculationBasis: { columnId: explicitPer100.id, ...explicitPer100.basis, source: 'explicit' } };

  const declared = label.declaredServing;
  const servingColumn = declared && label.columns.find((column) => column.kind === 'amount' && column.basis?.quantity === declared.quantity && column.basis.unit === declared.unit && column.values);
  if (declared && servingColumn?.values) {
    const derivedId = `derived-100-${declared.unit}`;
    const derived: NutritionLabelColumn = {
      id: derivedId,
      label: `100 ${declared.unit} (derivada)`,
      kind: 'amount',
      basis: { quantity: 100, unit: declared.unit },
      values: nutritionForAmount(servingColumn.values, declared.quantity, 100),
      source: 'derived',
      cellStatus: Object.fromEntries(CORE_NUTRIENT_KEYS.filter((key) => servingColumn.values?.[key] !== undefined).map((key) => [key, 'probable'])) as Partial<Record<CoreNutrientKey, NutritionLabelCellStatus>>,
    };
    return { ...label, columns: [...label.columns, derived], calculationBasis: { columnId: derivedId, quantity: 100, unit: declared.unit, source: 'derived' } };
  }

  const first = label.columns.find((column) => column.kind === 'amount' && column.basis && column.values);
  if (!first?.basis) throw new Error('O rótulo não possui uma base nutricional calculável.');
  return { ...label, calculationBasis: { columnId: first.id, ...first.basis, source: first.source } };
}

export function recalculateNutritionLabel(label: NutritionLabel): NutritionLabel {
  const explicitColumns = label.columns.filter((column) => column.source === 'explicit');
  return ensureCanonicalNutritionLabel({ ...label, columns: explicitColumns });
}

export function validateNutritionLabelStructure(label: NutritionLabel): NutritionLabelIssue[] {
  const issues: NutritionLabelIssue[] = [];
  const base = calculationNutrition(label);
  if (base.caloriesKcal !== undefined && base.proteinGrams !== undefined && base.carbsGrams !== undefined && base.fatGrams !== undefined) {
    const estimated = base.proteinGrams * 4 + base.carbsGrams * 4 + base.fatGrams * 9;
    const difference = Math.abs(estimated - base.caloriesKcal) / Math.max(1, base.caloriesKcal);
    if (difference > .35) issues.push({ kind: 'macro-energy', nutrientKeys: ['caloriesKcal', 'proteinGrams', 'carbsGrams', 'fatGrams'], message: 'Calorias e macronutrientes parecem muito distantes. Confira essas linhas no rótulo.' });
  }

  const per100 = label.columns.find((column) => column.kind === 'amount' && column.source === 'explicit' && column.basis?.quantity === 100 && column.values);
  const declaredServing = label.declaredServing;
  const serving = declaredServing && label.columns.find((column) => column.kind === 'amount' && column.source === 'explicit' && column.basis !== undefined && column.basis.quantity === declaredServing.quantity && column.basis.unit === declaredServing.unit && column.values);
  if (per100?.values && serving?.values && declaredServing) {
    const ratio = declaredServing.quantity / 100;
    const suspicious = CORE_NUTRIENT_KEYS.filter((key) => {
      const hundred = per100.values?.[key]; const portion = serving.values?.[key];
      if (hundred === undefined || portion === undefined) return false;
      const expected = hundred * ratio;
      return Math.abs(portion - expected) > Math.max(1, Math.abs(expected) * .25);
    });
    if (suspicious.length) issues.push({ kind: 'proportion', nutrientKeys: suspicious, message: 'Uma ou mais linhas divergem muito entre 100 g/ml e a porção. Os valores foram preservados para revisão.' });
  }
  return issues;
}

export function hasRequiredCalculationFields(label: NutritionLabel): boolean {
  const values = calculationNutrition(label);
  return ['caloriesKcal', 'proteinGrams', 'carbsGrams', 'fatGrams'].every((key) => values[key as CoreNutrientKey] !== undefined);
}
