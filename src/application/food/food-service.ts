import { foodSearchText, normalizeFoodSearch, validateFood, type Food, type FoodPortion, type NutrientValues, type PortionUnit } from '../../domain/food/food';
import type { NutritionLabel } from '../../domain/food/nutrition-label';
import type { FoodRepository } from '../../domain/food/repository';

export interface SaveFoodInput {
  id?: string; name: string; brand?: string; description?: string; barcode?: string; category?: string;
  baseQuantity: number; baseUnit: PortionUnit; equivalentWeightGrams?: number; equivalentVolumeMl?: number;
  nutrients: NutrientValues; nutritionLabel?: NutritionLabel; portions?: FoodPortion[]; dataSource: Food['dataSource']; nutritionLabelPhotoRef?: string; allergens?: string[]; tags?: string[];
}

export class FoodService {
  constructor(private readonly foods: FoodRepository, private readonly now = () => new Date(), private readonly id = () => crypto.randomUUID()) {}
  async save(input: SaveFoodInput): Promise<{ food: Food; duplicates: Food[] }> {
    const timestamp = this.now().toISOString();
    const existing = input.id ? await this.foods.getById(input.id) : undefined;
    const food: Food = {
      id: existing?.id ?? this.id(), name: input.name.trim(), nameNormalized: normalizeFoodSearch(input.name),
      searchTextNormalized: foodSearchText(input.name, input.brand, input.category, input.barcode), brand: input.brand?.trim() || undefined,
      description: input.description?.trim() || undefined, barcode: input.barcode?.trim() || undefined, category: input.category?.trim() || undefined,
      basePortion: { quantity: input.baseQuantity, unit: input.baseUnit, equivalentWeightGrams: input.equivalentWeightGrams, equivalentVolumeMl: input.equivalentVolumeMl },
      portions: input.portions ?? [], nutrients: input.nutrients, nutritionLabel: input.nutritionLabel, dataSource: input.dataSource, nutritionLabelPhotoRef: input.nutritionLabelPhotoRef,
      allergens: input.allergens, tags: input.tags, createdAt: existing?.createdAt ?? timestamp, updatedAt: timestamp,
    };
    validateFood(food);
    const candidates = await this.foods.search(food.name, 12);
    const duplicates = candidates.filter((candidate) => candidate.id !== food.id && (
      (food.barcode && candidate.barcode === food.barcode) ||
      (candidate.nameNormalized === food.nameNormalized && normalizeFoodSearch(candidate.brand ?? '') === normalizeFoodSearch(food.brand ?? ''))
    ));
    await this.foods.save(food);
    return { food, duplicates };
  }
}
