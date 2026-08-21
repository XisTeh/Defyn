import { describe, expect, it } from 'vitest';
import { DiaryService } from './diary-service';
import type { DiaryEntry, MealCategory } from '../../domain/diary/diary';
import type { DiaryRepository } from '../../domain/diary/repository';
import type { Food } from '../../domain/food/food';

class MemoryDiary implements DiaryRepository {
  entries: DiaryEntry[] = []; meals: MealCategory[] = [];
  async saveEntry(entry: DiaryEntry) { this.entries = [...this.entries.filter((item) => item.id !== entry.id), entry]; }
  async listEntries(profileId: string, date: string) { return this.entries.filter((item) => item.profileId === profileId && item.date === date); }
  async removeEntry(id: string) { this.entries = this.entries.filter((item) => item.id !== id); }
  async removeByProfile(profileId: string) { this.entries = this.entries.filter((item) => item.profileId !== profileId); }
  async saveMealCategory(meal: MealCategory) { this.meals = [...this.meals.filter((item) => item.id !== meal.id), meal]; }
  async listMealCategories(profileId: string) { return this.meals.filter((item) => item.profileId === profileId); }
}
const now = () => new Date('2026-08-21T12:00:00.000Z'); let sequence = 0; const id = () => `id-${++sequence}`;
const rice: Food = { id:'food', name:'Arroz', nameNormalized:'arroz', searchTextNormalized:'arroz', basePortion:{quantity:100,unit:'g'}, portions:[], nutrients:{caloriesKcal:130,proteinGrams:2.5,carbsGrams:28,fatGrams:0.3}, dataSource:'manual', createdAt:now().toISOString(),updatedAt:now().toISOString() };
describe('serviço do diário', () => {
  it('cria refeições padrão uma única vez', async () => { const repo=new MemoryDiary(); const service=new DiaryService(repo,now,id); expect(await service.ensureDefaultMeals('a')).toHaveLength(4); expect(await service.ensureDefaultMeals('a')).toHaveLength(4); });
  it('adiciona alimento proporcionalmente', async () => { const repo=new MemoryDiary(); const service=new DiaryService(repo,now,id); const entry=await service.addFood('a','2026-08-21','lunch',rice,150); expect(entry.item.nutrients.caloriesKcal).toBe(195); });
  it('edita quantidade usando o snapshot', async () => { const repo=new MemoryDiary(); const service=new DiaryService(repo,now,id); const entry=await service.addFood('a','2026-08-21','lunch',rice,100); const updated=await service.updateQuantity(entry,200); expect(updated.item.nutrients.carbsGrams).toBe(56); });
  it('move entre refeições', async () => { const repo=new MemoryDiary(); const service=new DiaryService(repo,now,id); const entry=await service.addFood('a','2026-08-21','lunch',rice,100); expect((await service.move(entry,'dinner')).mealCategoryId).toBe('dinner'); });
  it('isola perfis', async () => { const repo=new MemoryDiary(); const service=new DiaryService(repo,now,id); await service.addFood('a','2026-08-21','lunch',rice,100); await service.addFood('b','2026-08-21','lunch',rice,100); expect(await repo.listEntries('a','2026-08-21')).toHaveLength(1); });
  it('isola dias', async () => { const repo=new MemoryDiary(); const service=new DiaryService(repo,now,id); await service.addFood('a','2026-08-21','lunch',rice,100); await service.addFood('a','2026-08-22','lunch',rice,100); expect(await repo.listEntries('a','2026-08-21')).toHaveLength(1); });
  it('mantém snapshot quando o alimento muda', async () => { const repo=new MemoryDiary(); const service=new DiaryService(repo,now,id); const entry=await service.addFood('a','2026-08-21','lunch',rice,100); const changed={...rice,nutrients:{...rice.nutrients,caloriesKcal:999}}; expect(changed.nutrients.caloriesKcal).toBe(999); expect(entry.item.nutrients.caloriesKcal).toBe(130); });
});
