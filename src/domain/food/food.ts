import type { AuditedEntity } from '../shared/types';

export interface NutrientValues {
  caloriesKcal?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  fiberGrams?: number;
  sugarsGrams?: number;
  addedSugarsGrams?: number;
  saturatedFatGrams?: number;
  transFatGrams?: number;
  sodiumMg?: number;
  other?: Record<string, { value: number; unit: string }>;
}

export type PortionUnit = 'g' | 'ml' | 'unit' | 'slice' | 'scoop' | 'tablespoon' | string;
export type FoodDataSource = 'manual' | 'nutrition-label-ocr' | 'barcode-local' | 'recipe' | 'future-database' | 'user-entered' | 'label-scan' | 'barcode' | 'imported';

export interface FoodPortion {
  id: string;
  label: string;
  quantity: number;
  unit: PortionUnit;
  equivalentBaseQuantity: number;
}

export interface Food extends AuditedEntity {
  name: string;
  nameNormalized: string;
  searchTextNormalized: string;
  brand?: string;
  description?: string;
  barcode?: string;
  category?: string;
  basePortion: {
    quantity: number;
    unit: PortionUnit;
    equivalentWeightGrams?: number;
    equivalentVolumeMl?: number;
  };
  portions: FoodPortion[];
  nutrients: NutrientValues;
  notes?: string;
  dataSource: FoodDataSource;
  imageMediaId?: string;
  allergens?: string[];
  tags?: string[];
  nutritionLabelPhotoRef?: string;
}

export interface ConsumedPortion {
  quantity: number;
  unit: PortionUnit;
}

export function scaleNutrients(
  base: NutrientValues,
  baseQuantity: number,
  consumedQuantity: number,
): NutrientValues {
  if (![baseQuantity, consumedQuantity].every(Number.isFinite) || baseQuantity <= 0 || consumedQuantity < 0) {
    throw new RangeError('As quantidades da porção precisam ser finitas; a base deve ser positiva.');
  }
  const ratio = consumedQuantity / baseQuantity;
  const scale = (value: number | undefined): number | undefined =>
    value === undefined ? undefined : value * ratio;
  return {
    caloriesKcal: scale(base.caloriesKcal),
    proteinGrams: scale(base.proteinGrams),
    carbsGrams: scale(base.carbsGrams),
    fatGrams: scale(base.fatGrams),
    fiberGrams: scale(base.fiberGrams),
    sugarsGrams: scale(base.sugarsGrams),
    addedSugarsGrams: scale(base.addedSugarsGrams),
    saturatedFatGrams: scale(base.saturatedFatGrams),
    transFatGrams: scale(base.transFatGrams),
    sodiumMg: scale(base.sodiumMg),
    other: base.other && Object.fromEntries(Object.entries(base.other).map(([key, nutrient]) => [key, { ...nutrient, value: nutrient.value * ratio }])),
  };
}

export function normalizeFoodSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
}

export function foodSearchText(name: string, brand = '', category = '', barcode = ''): string {
  return normalizeFoodSearch([name, brand, category, barcode].filter(Boolean).join(' '));
}

export function nutrientOrZero(value: number | undefined): number {
  return Number.isFinite(value) ? value ?? 0 : 0;
}

export function addNutrients(...items: readonly NutrientValues[]): NutrientValues {
  const keys = ['caloriesKcal', 'proteinGrams', 'carbsGrams', 'fatGrams', 'fiberGrams', 'sugarsGrams', 'addedSugarsGrams', 'saturatedFatGrams', 'transFatGrams', 'sodiumMg'] as const;
  return Object.fromEntries(keys.map((key) => [key, items.reduce((sum, item) => sum + nutrientOrZero(item[key]), 0)])) as NutrientValues;
}

export function validateFood(food: Pick<Food, 'name' | 'basePortion' | 'nutrients' | 'portions'>): void {
  if (!food.name.trim()) throw new Error('Informe o nome do alimento.');
  if (!Number.isFinite(food.basePortion.quantity) || food.basePortion.quantity <= 0) throw new Error('A porção base precisa ser positiva.');
  for (const value of Object.values(food.nutrients)) {
    if (typeof value === 'number' && (!Number.isFinite(value) || value < 0)) throw new Error('Nutrientes devem ser números não negativos.');
  }
  for (const portion of food.portions) {
    if (!portion.label.trim() || !Number.isFinite(portion.equivalentBaseQuantity) || portion.equivalentBaseQuantity <= 0) throw new Error('Porção personalizada inválida.');
  }
}
