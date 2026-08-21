import type { Food } from './food';

export interface FoodRepository {
  getById(id: string): Promise<Food | undefined>;
  findByBarcode(barcode: string): Promise<Food | undefined>;
  list(): Promise<Food[]>;
  search(query: string, limit?: number): Promise<Food[]>;
  save(food: Food): Promise<void>;
  remove(id: string): Promise<void>;
}
