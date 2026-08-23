import Dexie, { type EntityTable, type Table } from 'dexie';
import type { DiaryEntry, FavoriteMeal, MealCategory } from '../../domain/diary/diary';
import type { FoodPreference } from '../../domain/food/food-preference';
import type { LocalMedia } from '../../domain/media/media';
import type { Food } from '../../domain/food/food';
import type { UserProfile } from '../../domain/profile/profile';
import type { ProgressPhotoMetadata, ProgressRecord } from '../../domain/progress/progress';
import type { Recipe } from '../../domain/recipe/recipe';
import type { NutritionTargetSnapshot } from '../../domain/targets/nutrition-target';
import type { WaterEntry } from '../../domain/hydration/hydration';
import type { Exercise, ExerciseFavorite, TrainingProfile, WorkoutPlan, WorkoutSession, WorkoutSetLog } from '../../domain/training/training';
import type { DailyNutritionSummary } from '../../domain/nutrition-summary/daily-nutrition-summary';
import { migrateProfileToV2, selectMigratedActiveProfileId } from './migration-v2';
import { migrateFoodToV3, migrateProfileToV3 } from './migration-v3';
import { migrateProgressPhotoToV5, migrateProgressRecordToV5 } from './migration-v5';

export const DATABASE_NAME = 'defyn-local';
export const DATABASE_VERSION = 6;

export class DefynDatabase extends Dexie {
  profiles!: EntityTable<UserProfile, 'id'>;
  nutritionTargets!: EntityTable<NutritionTargetSnapshot, 'id'>;
  foods!: EntityTable<Food, 'id'>;
  recipes!: EntityTable<Recipe, 'id'>;
  diaryEntries!: EntityTable<DiaryEntry, 'id'>;
  mealCategories!: EntityTable<MealCategory, 'id'>;
  progressRecords!: EntityTable<ProgressRecord, 'id'>;
  progressPhotos!: EntityTable<ProgressPhotoMetadata, 'id'>;
  preferences!: Table<{ key: string; value: string | number | boolean }, string>;
  waterEntries!: EntityTable<WaterEntry, 'id'>;
  media!: EntityTable<LocalMedia, 'id'>;
  foodPreferences!: EntityTable<FoodPreference, 'id'>;
  favoriteMeals!: EntityTable<FavoriteMeal, 'id'>;
  trainingProfiles!: EntityTable<TrainingProfile, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  exerciseFavorites!: EntityTable<ExerciseFavorite, 'id'>;
  workoutPlans!: EntityTable<WorkoutPlan, 'id'>;
  workoutSessions!: EntityTable<WorkoutSession, 'id'>;
  workoutSetLogs!: EntityTable<WorkoutSetLog, 'id'>;
  dailyNutritionSummaries!: EntityTable<DailyNutritionSummary, 'id'>;

  constructor() {
    super(DATABASE_NAME);
    this.version(1).stores({
      profiles: 'id, updatedAt',
      nutritionTargets: 'id, profileId, startsAt, endsAt, [profileId+startsAt]',
      foods: 'id, name, brand, barcode, updatedAt',
      recipes: 'id, name, updatedAt',
      diaryEntries: 'id, profileId, date, mealCategoryId, [profileId+date]',
      mealCategories: 'id, profileId, order, [profileId+order]',
      progressRecords: 'id, profileId, date, [profileId+date]',
      progressPhotos: 'id, profileId, date, [profileId+date]',
      preferences: 'key',
    });
    this.version(2).stores({
      profiles: 'id, updatedAt',
      nutritionTargets: 'id, profileId, startsAt, endsAt, [profileId+startsAt]',
      foods: 'id, name, brand, barcode, updatedAt',
      recipes: 'id, name, updatedAt',
      diaryEntries: 'id, profileId, date, mealCategoryId, [profileId+date]',
      mealCategories: 'id, profileId, order, [profileId+order]',
      progressRecords: 'id, profileId, date, [profileId+date]',
      progressPhotos: 'id, profileId, date, [profileId+date]',
      preferences: 'key',
      waterEntries: 'id, profileId, localDate, [profileId+localDate], occurredAt',
    }).upgrade(async (transaction) => {
      const profiles = transaction.table<UserProfile, string>('profiles');
      const preferences = transaction.table<{ key: string; value: string | number | boolean }, string>('preferences');
      const existingProfiles = await profiles.toArray();
      const existingActive = await preferences.get('activeProfileId');
      const activeProfileId = selectMigratedActiveProfileId(
        existingProfiles,
        typeof existingActive?.value === 'string' ? existingActive.value : undefined,
      );
      await profiles.bulkPut(existingProfiles.map(migrateProfileToV2));
      if (activeProfileId) {
        await preferences.put({ key: 'activeProfileId', value: activeProfileId });
      }
    });
    this.version(3).stores({
      profiles: 'id, updatedAt',
      nutritionTargets: 'id, profileId, startsAt, endsAt, [profileId+startsAt]',
      foods: 'id, nameNormalized, searchTextNormalized, barcode, updatedAt',
      recipes: 'id, name, nameNormalized, updatedAt',
      diaryEntries: 'id, profileId, date, mealCategoryId, [profileId+date], [profileId+mealCategoryId]',
      mealCategories: 'id, profileId, order, [profileId+order]',
      progressRecords: 'id, profileId, date, [profileId+date]',
      progressPhotos: 'id, profileId, date, [profileId+date]',
      preferences: 'key',
      waterEntries: 'id, profileId, localDate, [profileId+localDate], occurredAt',
      media: 'id, kind, ownerType, ownerId, createdAt',
      foodPreferences: 'id, profileId, foodId, [profileId+foodId], favorite, lastUsedAt',
      favoriteMeals: 'id, profileId, updatedAt',
    }).upgrade(async (transaction) => {
      const profiles = transaction.table<UserProfile, string>('profiles');
      const foods = transaction.table<Food, string>('foods');
      await profiles.toCollection().modify((profile) => { Object.assign(profile, migrateProfileToV3(profile)); });
      await foods.toCollection().modify((food) => { Object.assign(food, migrateFoodToV3(food)); });
    });
    this.version(4).stores({
      profiles: 'id, updatedAt',
      nutritionTargets: 'id, profileId, startsAt, endsAt, [profileId+startsAt]',
      foods: 'id, nameNormalized, searchTextNormalized, barcode, updatedAt',
      recipes: 'id, name, nameNormalized, updatedAt',
      diaryEntries: 'id, profileId, date, mealCategoryId, [profileId+date], [profileId+mealCategoryId]',
      mealCategories: 'id, profileId, order, [profileId+order]',
      progressRecords: 'id, profileId, date, [profileId+date]',
      progressPhotos: 'id, profileId, date, [profileId+date]',
      preferences: 'key',
      waterEntries: 'id, profileId, localDate, [profileId+localDate], occurredAt',
      media: 'id, kind, ownerType, ownerId, createdAt',
      foodPreferences: 'id, profileId, foodId, [profileId+foodId], favorite, lastUsedAt',
      favoriteMeals: 'id, profileId, updatedAt',
      trainingProfiles: 'id, &profileId, updatedAt',
      exercises: 'id, ownerProfileId, normalizedName, primaryMuscle, isCustom, updatedAt',
      exerciseFavorites: 'id, profileId, exerciseId, &[profileId+exerciseId]',
      workoutPlans: 'id, profileId, status, updatedAt, [profileId+status]',
      workoutSessions: 'id, profileId, planId, templateId, localDate, status, [profileId+localDate], [profileId+status]',
      workoutSetLogs: 'id, profileId, sessionId, exerciseId, [sessionId+exerciseId], [profileId+exerciseId], completedAt',
    });
    this.version(5).stores({
      profiles: 'id, updatedAt', nutritionTargets: 'id, profileId, startsAt, endsAt, [profileId+startsAt]', foods: 'id, nameNormalized, searchTextNormalized, barcode, updatedAt', recipes: 'id, name, nameNormalized, updatedAt', diaryEntries: 'id, profileId, date, mealCategoryId, [profileId+date], [profileId+mealCategoryId]', mealCategories: 'id, profileId, order, [profileId+order]',
      progressRecords: 'id, profileId, localDate, occurredAt, [profileId+localDate]', progressPhotos: 'id, profileId, localDate, occurredAt, category, mediaId, checkInId, [profileId+localDate], [profileId+category]', preferences: 'key', waterEntries: 'id, profileId, localDate, [profileId+localDate], occurredAt', media: 'id, kind, ownerType, ownerId, createdAt', foodPreferences: 'id, profileId, foodId, [profileId+foodId], favorite, lastUsedAt', favoriteMeals: 'id, profileId, updatedAt', trainingProfiles: 'id, &profileId, updatedAt', exercises: 'id, ownerProfileId, normalizedName, primaryMuscle, isCustom, updatedAt', exerciseFavorites: 'id, profileId, exerciseId, &[profileId+exerciseId]', workoutPlans: 'id, profileId, status, updatedAt, [profileId+status]', workoutSessions: 'id, profileId, planId, templateId, localDate, status, [profileId+localDate], [profileId+status]', workoutSetLogs: 'id, profileId, sessionId, exerciseId, [sessionId+exerciseId], [profileId+exerciseId], completedAt',
    }).upgrade(async (transaction) => {
      await transaction.table<ProgressRecord,string>('progressRecords').toCollection().modify((record)=>{ Object.assign(record,migrateProgressRecordToV5(record)); });
      await transaction.table<ProgressPhotoMetadata,string>('progressPhotos').toCollection().modify((photo)=>{ Object.assign(photo,migrateProgressPhotoToV5(photo)); });
    });
    this.version(DATABASE_VERSION).stores({
      profiles: 'id, updatedAt', nutritionTargets: 'id, profileId, startsAt, endsAt, [profileId+startsAt]', foods: 'id, nameNormalized, searchTextNormalized, barcode, updatedAt', recipes: 'id, name, nameNormalized, updatedAt', diaryEntries: 'id, profileId, date, mealCategoryId, [profileId+date], [profileId+mealCategoryId]', mealCategories: 'id, profileId, order, [profileId+order]',
      progressRecords: 'id, profileId, localDate, occurredAt, [profileId+localDate]', progressPhotos: 'id, profileId, localDate, occurredAt, category, mediaId, checkInId, [profileId+localDate], [profileId+category]', preferences: 'key', waterEntries: 'id, profileId, localDate, [profileId+localDate], occurredAt', media: 'id, kind, ownerType, ownerId, createdAt', foodPreferences: 'id, profileId, foodId, [profileId+foodId], favorite, lastUsedAt', favoriteMeals: 'id, profileId, updatedAt', trainingProfiles: 'id, &profileId, updatedAt', exercises: 'id, ownerProfileId, normalizedName, primaryMuscle, isCustom, updatedAt', exerciseFavorites: 'id, profileId, exerciseId, &[profileId+exerciseId]', workoutPlans: 'id, profileId, status, updatedAt, [profileId+status]', workoutSessions: 'id, profileId, planId, templateId, localDate, status, [profileId+localDate], [profileId+status]', workoutSetLogs: 'id, profileId, sessionId, exerciseId, [sessionId+exerciseId], [profileId+exerciseId], completedAt', dailyNutritionSummaries: 'id, profileId, localDate, &[profileId+localDate]',
    });
  }
}

export const defynDatabase = new DefynDatabase();
