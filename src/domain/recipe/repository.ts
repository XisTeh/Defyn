import type { Recipe } from './recipe';

export interface RecipeRepository {
  getById(id: string): Promise<Recipe | undefined>;
  list(): Promise<Recipe[]>;
  save(recipe: Recipe): Promise<void>;
  remove(id: string): Promise<void>;
}
