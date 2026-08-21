import type { DiaryEntry, FavoriteMeal, MealCategory } from './diary';

export interface DiaryRepository {
  saveEntry(entry: DiaryEntry): Promise<void>;
  listEntries(profileId: string, date: string): Promise<DiaryEntry[]>;
  listEntriesByPeriod?(profileId: string, startLocalDate: string | undefined, endLocalDate: string): Promise<DiaryEntry[]>;
  removeEntry(id: string): Promise<void>;
  getEntry?(id: string): Promise<DiaryEntry | undefined>;
  removeByProfile(profileId: string): Promise<void>;
  saveMealCategory(category: MealCategory): Promise<void>;
  listMealCategories(profileId: string): Promise<MealCategory[]>;
  removeMealCategory?(id: string): Promise<void>;
  saveFavoriteMeal?(meal: FavoriteMeal): Promise<void>;
  listFavoriteMeals?(profileId: string): Promise<FavoriteMeal[]>;
  removeFavoriteMeal?(id: string): Promise<void>;
}
