import { scaleNutrients, type Food } from '../../domain/food/food';
import type { DiaryEntry, MealCategory } from '../../domain/diary/diary';
import type { DiaryRepository } from '../../domain/diary/repository';

const DEFAULT_MEALS = [['Café da manhã', '07:30'], ['Almoço', '12:30'], ['Lanche', '16:30'], ['Jantar', '20:00']] as const;

export class DiaryService {
  constructor(private readonly diary: DiaryRepository, private readonly now: () => Date = () => new Date(), private readonly id: () => string = () => crypto.randomUUID()) {}
  async ensureDefaultMeals(profileId: string): Promise<MealCategory[]> {
    const existing = await this.diary.listMealCategories(profileId);
    if (existing.length) {
      const seen = new Set<string>(); const unique: MealCategory[] = []; const duplicates: MealCategory[] = [];
      for (const meal of existing) { const key = meal.name.trim().toLocaleLowerCase('pt-BR'); if (seen.has(key)) duplicates.push(meal); else { seen.add(key); unique.push(meal); } }
      if (duplicates.length && this.diary.removeMealCategory) await Promise.all(duplicates.map((meal) => this.diary.removeMealCategory!(meal.id)));
      return unique.sort((a,b) => a.order - b.order);
    }
    const timestamp = this.now().toISOString();
    const created = DEFAULT_MEALS.map(([name, approximateTime], order) => ({ id: `${profileId}:default-meal:${order}`, profileId, name, order, hidden: false, approximateTime, createdAt: timestamp, updatedAt: timestamp }));
    await Promise.all(created.map((meal) => this.diary.saveMealCategory(meal)));
    return created;
  }
  async addFood(profileId: string, date: string, mealCategoryId: string, food: Food, quantity: number, unit = food.basePortion.unit): Promise<DiaryEntry> {
    const timestamp = this.now().toISOString();
    const entry: DiaryEntry = { id: this.id(), profileId, date, mealCategoryId, time: timestamp.slice(11, 16), item: {
      sourceType: 'food', sourceId: food.id, sourceUpdatedAt: food.updatedAt, displayName: food.name, brand: food.brand,
      consumedQuantity: quantity, consumedUnit: unit, nutrients: scaleNutrients(food.nutrients, food.basePortion.quantity, quantity),
    }, createdAt: timestamp, updatedAt: timestamp };
    await this.diary.saveEntry(entry); return entry;
  }
  async updateQuantity(entry: DiaryEntry, quantity: number): Promise<DiaryEntry> {
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Informe uma quantidade positiva.');
    const nutrients = scaleNutrients(entry.item.nutrients, entry.item.consumedQuantity, quantity);
    const updated = { ...entry, item: { ...entry.item, consumedQuantity: quantity, nutrients }, updatedAt: this.now().toISOString() };
    await this.diary.saveEntry(updated); return updated;
  }
  async move(entry: DiaryEntry, mealCategoryId: string): Promise<DiaryEntry> {
    const updated = { ...entry, mealCategoryId, updatedAt: this.now().toISOString() };
    await this.diary.saveEntry(updated); return updated;
  }
}
