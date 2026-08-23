import type { DiaryEntry, MealCategory } from '../../domain/diary/diary';
import type { DiaryRepository } from '../../domain/diary/repository';
import type { Food } from '../../domain/food/food';
import type { FoodRepository } from '../../domain/food/repository';
import type { UserProfile } from '../../domain/profile/profile';
import type { ProfileRepository } from '../../domain/profile/repository';
import type { ProgressPeriod, ProgressPhotoCategory, ProgressPhotoMetadata, ProgressRecord } from '../../domain/progress/progress';
import type { ProgressRepository } from '../../domain/progress/repository';
import type { Recipe } from '../../domain/recipe/recipe';
import type { RecipeRepository } from '../../domain/recipe/repository';
import type { NutritionTargetSnapshot } from '../../domain/targets/nutrition-target';
import type { NutritionTargetRepository } from '../../domain/targets/repository';
import type { DefynDatabase } from './database';
import type { ActiveProfileRepository } from '../../domain/profile/repository';
import type { WaterEntry } from '../../domain/hydration/hydration';
import type { WaterRepository } from '../../domain/hydration/repository';
import type { ProfileDataGateway } from '../../application/profile/delete-profile';
import { normalizeFoodSearch } from '../../domain/food/food';
import type { FoodPreference } from '../../domain/food/food-preference';
import type { LocalMedia, MediaRepository } from '../../domain/media/media';
import type { FavoriteMeal } from '../../domain/diary/diary';
import { BASE_EXERCISES } from '../../domain/training/exercise-library';
import type { Exercise, ExerciseFavorite, TrainingProfile, WorkoutPlan, WorkoutSession, WorkoutSetLog } from '../../domain/training/training';
import type { ExerciseRepository, TrainingProfileRepository, WorkoutPlanRepository, WorkoutSessionRepository } from '../../domain/training/repository';
import type { DailyNutritionSummary } from '../../domain/nutrition-summary/daily-nutrition-summary';
import type { DailyNutritionSummaryRepository } from '../../domain/nutrition-summary/repository';
import type { RoutineRepository } from '../../domain/routine/repository';
import type { ReminderSnooze, RoutineDay, RoutineProfile, SleepRecord } from '../../domain/routine/routine';

export class IndexedDbProfileRepository implements ProfileRepository {
  constructor(private readonly database: DefynDatabase) {}
  getById(id: string) { return this.database.profiles.get(id); }
  list() { return this.database.profiles.orderBy('updatedAt').reverse().toArray(); }
  async save(profile: UserProfile) { await this.database.profiles.put(profile); }
  async remove(id: string) { await this.database.profiles.delete(id); }
}

export class IndexedDbActiveProfileRepository implements ActiveProfileRepository {
  constructor(private readonly database: DefynDatabase) {}
  async get() {
    const preference = await this.database.preferences.get('activeProfileId');
    return typeof preference?.value === 'string' ? preference.value : undefined;
  }
  async set(profileId: string) {
    await this.database.preferences.put({ key: 'activeProfileId', value: profileId });
  }
  async clear() { await this.database.preferences.delete('activeProfileId'); }
}

export class IndexedDbNutritionTargetRepository implements NutritionTargetRepository {
  constructor(private readonly database: DefynDatabase) {}
  async save(snapshot: NutritionTargetSnapshot) { await this.database.nutritionTargets.put(snapshot); }
  getActiveForProfile(profileId: string) {
    return this.database.nutritionTargets
      .where('profileId')
      .equals(profileId)
      .filter((target) => target.endsAt === undefined)
      .last();
  }
  listForProfile(profileId: string) {
    return this.database.nutritionTargets.where('profileId').equals(profileId).sortBy('startsAt');
  }
  async removeByProfile(profileId: string) {
    await this.database.nutritionTargets.where('profileId').equals(profileId).delete();
  }
}

export class IndexedDbDailyNutritionSummaryRepository implements DailyNutritionSummaryRepository {
  constructor(private readonly database: DefynDatabase) {}
  get(profileId: string, localDate: string) { return this.database.dailyNutritionSummaries.where('[profileId+localDate]').equals([profileId, localDate]).first(); }
  listByPeriod(profileId: string, startLocalDate: string | undefined, endLocalDate: string) { return this.database.dailyNutritionSummaries.where('[profileId+localDate]').between([profileId, startLocalDate ?? '0000-00-00'], [profileId, endLocalDate], true, true).sortBy('localDate'); }
  async save(summary: DailyNutritionSummary) { await this.database.dailyNutritionSummaries.put(summary); }
  async remove(profileId: string, localDate: string) { await this.database.dailyNutritionSummaries.where('[profileId+localDate]').equals([profileId, localDate]).delete(); }
  async removeByProfile(profileId: string) { await this.database.dailyNutritionSummaries.where('profileId').equals(profileId).delete(); }
}

export class IndexedDbFoodRepository implements FoodRepository {
  constructor(private readonly database: DefynDatabase) {}
  getById(id: string) { return this.database.foods.get(id); }
  findByBarcode(barcode: string) { return this.database.foods.where('barcode').equals(barcode).first(); }
  list() { return this.database.foods.orderBy('nameNormalized').toArray(); }
  async search(query: string, limit = 30) {
    const normalized = normalizeFoodSearch(query);
    if (!normalized) return this.database.foods.orderBy('updatedAt').reverse().limit(limit).toArray();
    const barcode = await this.findByBarcode(query.trim());
    const matches = await this.database.foods.filter((food) => food.searchTextNormalized.includes(normalized)).limit(limit).toArray();
    return barcode && !matches.some((food) => food.id === barcode.id) ? [barcode, ...matches].slice(0, limit) : matches;
  }
  async save(food: Food) { await this.database.foods.put(food); }
  async remove(id: string) { await this.database.foods.delete(id); }
}

export class IndexedDbDiaryRepository implements DiaryRepository {
  constructor(private readonly database: DefynDatabase) {}
  async saveEntry(entry: DiaryEntry) { await this.database.diaryEntries.put(entry); }
  listEntries(profileId: string, date: string) {
    return this.database.diaryEntries.where('[profileId+date]').equals([profileId, date]).toArray();
  }
  listEntriesByPeriod(profileId: string, startLocalDate: string | undefined, endLocalDate: string) {
    return this.database.diaryEntries.where('[profileId+date]').between([profileId, startLocalDate ?? '0000-00-00'], [profileId, endLocalDate], true, true).toArray();
  }
  async removeEntry(id: string) { await this.database.diaryEntries.delete(id); }
  getEntry(id: string) { return this.database.diaryEntries.get(id); }
  async removeByProfile(profileId: string) {
    await this.database.diaryEntries.where('profileId').equals(profileId).delete();
    await this.database.mealCategories.where('profileId').equals(profileId).delete();
  }
  async saveMealCategory(category: MealCategory) { await this.database.mealCategories.put(category); }
  listMealCategories(profileId: string) {
    return this.database.mealCategories.where('profileId').equals(profileId).sortBy('order');
  }
  async removeMealCategory(id: string) { await this.database.mealCategories.delete(id); }
  async saveFavoriteMeal(meal: FavoriteMeal) { await this.database.favoriteMeals.put(meal); }
  listFavoriteMeals(profileId: string) { return this.database.favoriteMeals.where('profileId').equals(profileId).toArray(); }
  async removeFavoriteMeal(id: string) { await this.database.favoriteMeals.delete(id); }
}

export class IndexedDbFoodPreferenceRepository {
  constructor(private readonly database: DefynDatabase) {}
  get(profileId: string, foodId: string) { return this.database.foodPreferences.where('[profileId+foodId]').equals([profileId, foodId]).first(); }
  listForProfile(profileId: string) { return this.database.foodPreferences.where('profileId').equals(profileId).toArray(); }
  async save(preference: FoodPreference) { await this.database.foodPreferences.put(preference); }
  async removeByProfile(profileId: string) { await this.database.foodPreferences.where('profileId').equals(profileId).delete(); }
}

export class IndexedDbMediaRepository implements MediaRepository {
  constructor(private readonly database: DefynDatabase) {}
  getById(id: string) { return this.database.media.get(id); }
  async save(media: LocalMedia) { await this.database.media.put(media); }
  async remove(id: string) { await this.database.media.delete(id); }
  list() { return this.database.media.toArray(); }
  async removeOrphans(referencedIds: ReadonlySet<string>) {
    const orphans = await this.database.media.filter((item) => !referencedIds.has(item.id)).primaryKeys();
    await this.database.media.bulkDelete(orphans);
    return orphans.length;
  }
}

export class IndexedDbProgressRepository implements ProgressRepository {
  constructor(private readonly database: DefynDatabase) {}
  async saveRecord(record: ProgressRecord) { await this.database.progressRecords.put(record); }
  async getRecord(profileId: string, id: string) { const item = await this.database.progressRecords.get(id); return item?.profileId === profileId ? item : undefined; }
  listRecords(profileId: string, period?: ProgressPeriod) { return period ? this.database.progressRecords.where('[profileId+localDate]').between([profileId, period.startLocalDate ?? '0000-00-00'], [profileId, period.endLocalDate], true, true).sortBy('localDate') : this.database.progressRecords.where('profileId').equals(profileId).sortBy('localDate'); }
  async removeRecord(profileId: string, id: string) { const item = await this.getRecord(profileId,id); if (item) await this.database.progressRecords.delete(id); }
  async savePhotoMetadata(photo: ProgressPhotoMetadata) { await this.database.progressPhotos.put(photo); }
  async getPhotoMetadata(profileId: string, id: string) { const item = await this.database.progressPhotos.get(id); return item?.profileId === profileId ? item : undefined; }
  async listPhotoMetadata(profileId: string, period?: ProgressPeriod, category?: ProgressPhotoCategory) { const items = period ? await this.database.progressPhotos.where('[profileId+localDate]').between([profileId, period.startLocalDate ?? '0000-00-00'], [profileId, period.endLocalDate], true, true).sortBy('localDate') : await this.database.progressPhotos.where('profileId').equals(profileId).sortBy('localDate'); return category ? items.filter((item)=>item.category===category) : items; }
  async removePhoto(profileId: string, id: string) { const photo = await this.getPhotoMetadata(profileId,id); if (!photo) return; await this.database.transaction('rw',[this.database.progressPhotos,this.database.media],async()=>{ await this.database.progressPhotos.delete(id); if(photo.mediaId) await this.database.media.delete(photo.mediaId); }); }
  async removeCheckIn(profileId: string, id: string) { const record=await this.getRecord(profileId,id); if(!record) return; const photos=await this.database.progressPhotos.where('checkInId').equals(id).filter((p)=>p.profileId===profileId).toArray(); await this.database.transaction('rw',[this.database.progressRecords,this.database.progressPhotos,this.database.media],async()=>{ await this.database.progressRecords.delete(id); await this.database.progressPhotos.bulkDelete(photos.map((p)=>p.id)); await this.database.media.bulkDelete(photos.flatMap((p)=>p.mediaId?[p.mediaId]:[])); }); }
  async removeByProfile(profileId: string) {
    await this.database.progressRecords.where('profileId').equals(profileId).delete();
    await this.database.progressPhotos.where('profileId').equals(profileId).delete();
  }
}

export class IndexedDbRecipeRepository implements RecipeRepository {
  constructor(private readonly database: DefynDatabase) {}
  getById(id: string) { return this.database.recipes.get(id); }
  list() { return this.database.recipes.orderBy('name').toArray(); }
  async save(recipe: Recipe) { await this.database.recipes.put(recipe); }
  async remove(id: string) { await this.database.recipes.delete(id); }
}

export class IndexedDbWaterRepository implements WaterRepository {
  constructor(private readonly database: DefynDatabase) {}
  listByProfileAndDate(profileId: string, localDate: string) {
    return this.database.waterEntries.where('[profileId+localDate]').equals([profileId, localDate]).toArray();
  }
  listByPeriod(profileId: string, startLocalDate: string | undefined, endLocalDate: string) { return this.database.waterEntries.where('[profileId+localDate]').between([profileId,startLocalDate ?? '0000-00-00'],[profileId,endLocalDate],true,true).toArray(); }
  async save(entry: WaterEntry) { await this.database.waterEntries.put(entry); }
  async remove(id: string) { await this.database.waterEntries.delete(id); }
  async removeByProfile(profileId: string) {
    await this.database.waterEntries.where('profileId').equals(profileId).delete();
  }
}

export class IndexedDbProfileDataGateway implements ProfileDataGateway {
  constructor(private readonly database: DefynDatabase) {}
  async deleteProfileAndOwnedData(profileId: string): Promise<void> {
    await this.database.transaction(
      'rw',
      [
        this.database.profiles,
        this.database.nutritionTargets,
        this.database.diaryEntries,
        this.database.mealCategories,
        this.database.progressRecords,
        this.database.progressPhotos,
        this.database.waterEntries,
        this.database.foodPreferences,
        this.database.favoriteMeals,
        this.database.media,
        this.database.trainingProfiles,
        this.database.exercises,
        this.database.exerciseFavorites,
        this.database.workoutPlans,
        this.database.workoutSessions,
        this.database.workoutSetLogs,
        this.database.dailyNutritionSummaries,
        this.database.routineProfiles,
        this.database.routineDays,
        this.database.sleepRecords,
        this.database.reminderSnoozes,
      ],
      async () => {
        const customExerciseIds = await this.database.exercises.where('ownerProfileId').equals(profileId).primaryKeys();
        const progressMediaIds = (await this.database.progressPhotos.where('profileId').equals(profileId).toArray()).flatMap((photo) => photo.mediaId ? [photo.mediaId] : []);
        await Promise.all([
          this.database.profiles.delete(profileId),
          this.database.nutritionTargets.where('profileId').equals(profileId).delete(),
          this.database.diaryEntries.where('profileId').equals(profileId).delete(),
          this.database.mealCategories.where('profileId').equals(profileId).delete(),
          this.database.progressRecords.where('profileId').equals(profileId).delete(),
          this.database.progressPhotos.where('profileId').equals(profileId).delete(),
          this.database.waterEntries.where('profileId').equals(profileId).delete(),
          this.database.foodPreferences.where('profileId').equals(profileId).delete(),
          this.database.favoriteMeals.where('profileId').equals(profileId).delete(),
          this.database.media.where('id').anyOf(progressMediaIds).delete(),
          this.database.media.where('ownerId').anyOf([profileId, ...customExerciseIds]).delete(),
          this.database.trainingProfiles.where('profileId').equals(profileId).delete(),
          this.database.exercises.where('ownerProfileId').equals(profileId).delete(),
          this.database.exerciseFavorites.where('profileId').equals(profileId).delete(),
          this.database.workoutPlans.where('profileId').equals(profileId).delete(),
          this.database.workoutSessions.where('profileId').equals(profileId).delete(),
          this.database.workoutSetLogs.where('profileId').equals(profileId).delete(),
          this.database.dailyNutritionSummaries.where('profileId').equals(profileId).delete(),
          this.database.routineProfiles.where('profileId').equals(profileId).delete(),
          this.database.routineDays.where('profileId').equals(profileId).delete(),
          this.database.sleepRecords.where('profileId').equals(profileId).delete(),
          this.database.reminderSnoozes.where('profileId').equals(profileId).delete(),
        ]);
      },
    );
  }
}

export class IndexedDbTrainingProfileRepository implements TrainingProfileRepository {
  constructor(private readonly database: DefynDatabase) {}
  get(profileId: string) { return this.database.trainingProfiles.where('profileId').equals(profileId).first(); }
  async save(profile: TrainingProfile) { await this.database.trainingProfiles.put(profile); }
  async removeByProfile(profileId: string) { await this.database.trainingProfiles.where('profileId').equals(profileId).delete(); }
}

export class IndexedDbExerciseRepository implements ExerciseRepository {
  constructor(private readonly database: DefynDatabase) {}
  async list(profileId: string) {
    const custom = await this.database.exercises.where('ownerProfileId').equals(profileId).toArray();
    return [...BASE_EXERCISES, ...custom].sort((a, b) => a.normalizedName.localeCompare(b.normalizedName, 'pt-BR'));
  }
  async getById(profileId: string, exerciseId: string) {
    return BASE_EXERCISES.find((item) => item.id === exerciseId) ?? this.database.exercises.where('ownerProfileId').equals(profileId).filter((item) => item.id === exerciseId).first();
  }
  async saveCustom(exercise: Exercise) {
    if (!exercise.isCustom || !exercise.ownerProfileId) throw new Error('Exercício customizado sem perfil proprietário.');
    await this.database.exercises.put(exercise);
  }
  async removeCustom(exerciseId: string, profileId: string) {
    const exercise = await this.database.exercises.get(exerciseId);
    if (exercise?.ownerProfileId === profileId) await this.database.exercises.delete(exerciseId);
  }
  listFavorites(profileId: string) { return this.database.exerciseFavorites.where('profileId').equals(profileId).toArray(); }
  async saveFavorite(favorite: ExerciseFavorite) { await this.database.exerciseFavorites.put(favorite); }
  async removeFavorite(profileId: string, exerciseId: string) { await this.database.exerciseFavorites.where('[profileId+exerciseId]').equals([profileId, exerciseId]).delete(); }
}

export class IndexedDbWorkoutPlanRepository implements WorkoutPlanRepository {
  constructor(private readonly database: DefynDatabase) {}
  getActive(profileId: string) { return this.database.workoutPlans.where('[profileId+status]').equals([profileId, 'active']).last(); }
  async getById(profileId: string, planId: string) { const plan = await this.database.workoutPlans.get(planId); return plan?.profileId === profileId ? plan : undefined; }
  list(profileId: string) { return this.database.workoutPlans.where('profileId').equals(profileId).reverse().sortBy('updatedAt'); }
  async save(plan: WorkoutPlan) { await this.database.workoutPlans.put(plan); }
  async removeByProfile(profileId: string) { await this.database.workoutPlans.where('profileId').equals(profileId).delete(); }
}

export class IndexedDbWorkoutSessionRepository implements WorkoutSessionRepository {
  constructor(private readonly database: DefynDatabase) {}
  async getById(profileId: string, sessionId: string) { const session = await this.database.workoutSessions.get(sessionId); return session?.profileId === profileId ? session : undefined; }
  getActive(profileId: string) { return this.database.workoutSessions.where('[profileId+status]').equals([profileId, 'active']).first(); }
  list(profileId: string) { return this.database.workoutSessions.where('profileId').equals(profileId).reverse().sortBy('startedAt'); }
  listByPeriod(profileId: string, startLocalDate: string | undefined, endLocalDate: string) { return this.database.workoutSessions.where('[profileId+localDate]').between([profileId,startLocalDate ?? '0000-00-00'],[profileId,endLocalDate],true,true).toArray(); }
  listByDate(profileId: string, localDate: string) { return this.database.workoutSessions.where('[profileId+localDate]').equals([profileId, localDate]).toArray(); }
  async save(session: WorkoutSession) { await this.database.workoutSessions.put(session); }
  listSetLogs(profileId: string, sessionId: string) { return this.database.workoutSetLogs.where('sessionId').equals(sessionId).filter((item) => item.profileId === profileId).toArray(); }
  listExerciseLogs(profileId: string, exerciseId: string) { return this.database.workoutSetLogs.where('[profileId+exerciseId]').equals([profileId, exerciseId]).toArray(); }
  listSetLogsForSessions(profileId: string, sessionIds: string[]) { return sessionIds.length ? this.database.workoutSetLogs.where('sessionId').anyOf(sessionIds).filter((item)=>item.profileId===profileId).toArray() : Promise.resolve([]); }
  async saveSetLog(log: WorkoutSetLog) { await this.database.workoutSetLogs.put(log); }
  async removeSetLog(profileId: string, logId: string) { const log = await this.database.workoutSetLogs.get(logId); if (log?.profileId === profileId) await this.database.workoutSetLogs.delete(logId); }
  async removeByProfile(profileId: string) { await this.database.workoutSessions.where('profileId').equals(profileId).delete(); await this.database.workoutSetLogs.where('profileId').equals(profileId).delete(); }
}

export class IndexedDbRoutineRepository implements RoutineRepository {
  constructor(private readonly database: DefynDatabase) {}
  getProfile(profileId: string) { return this.database.routineProfiles.where('profileId').equals(profileId).first(); }
  async saveProfile(profile: RoutineProfile) { await this.database.routineProfiles.put(profile); }
  listDays(profileId: string) { return this.database.routineDays.where('profileId').equals(profileId).toArray(); }
  async saveDay(day: RoutineDay) { await this.database.routineDays.put(day); }
  async saveDays(days: RoutineDay[]) { await this.database.routineDays.bulkPut(days); }
  getSleep(profileId: string, localDate: string) { return this.database.sleepRecords.where('[profileId+localDate]').equals([profileId, localDate]).first(); }
  listSleep(profileId: string, startLocalDate?: string, endLocalDate?: string) {
    if (!startLocalDate && !endLocalDate) return this.database.sleepRecords.where('profileId').equals(profileId).toArray();
    return this.database.sleepRecords.where('[profileId+localDate]').between([profileId, startLocalDate ?? '0000-00-00'], [profileId, endLocalDate ?? '9999-12-31'], true, true).toArray();
  }
  async saveSleep(record: SleepRecord) { await this.database.sleepRecords.put(record); }
  async removeSleep(profileId: string, id: string) { const record = await this.database.sleepRecords.get(id); if (record?.profileId === profileId) await this.database.sleepRecords.delete(id); }
  getSnooze(profileId: string, reminderKind: string) { return this.database.reminderSnoozes.where('[profileId+reminderKind]').equals([profileId, reminderKind]).first(); }
  async saveSnooze(snooze: ReminderSnooze) { await this.database.reminderSnoozes.put(snooze); }
  async removeByProfile(profileId: string) {
    await Promise.all([
      this.database.routineProfiles.where('profileId').equals(profileId).delete(),
      this.database.routineDays.where('profileId').equals(profileId).delete(),
      this.database.sleepRecords.where('profileId').equals(profileId).delete(),
      this.database.reminderSnoozes.where('profileId').equals(profileId).delete(),
    ]);
  }
}
