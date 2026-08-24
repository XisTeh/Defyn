import type { BackupGateway } from '../../application/backup/backup-service';
import type { DefynBackupData } from '../../domain/export/export-format';
import type { DefynDatabase } from './database';

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return `data:${blob.type};base64,${btoa(binary)}`;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match?.[1] || !match[2]) throw new Error('Mídia inválida no backup.');
  const binary = atob(match[2]); const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: match[1] });
}

export class IndexedDbBackupGateway implements BackupGateway {
  constructor(private readonly database: DefynDatabase) {}

  async readAll(): Promise<DefynBackupData> {
    const [
      profiles, nutritionTargets, foods, recipes, diaryEntries, mealCategories,
      waterEntries, progressRecords, progressPhotos, preferences, foodPreferences, favoriteMeals, media,
      trainingProfiles, exercises, exerciseFavorites, workoutPlans, workoutSessions, workoutSetLogs, dailyNutritionSummaries,
      routineProfiles, routineDays, sleepRecords, reminderSnoozes,
    ] = await Promise.all([
      this.database.profiles.toArray(),
      this.database.nutritionTargets.toArray(),
      this.database.foods.toArray(),
      this.database.recipes.toArray(),
      this.database.diaryEntries.toArray(),
      this.database.mealCategories.toArray(),
      this.database.waterEntries.toArray(),
      this.database.progressRecords.toArray(),
      this.database.progressPhotos.toArray(),
      this.database.preferences.toArray(),
      this.database.foodPreferences.toArray(),
      this.database.favoriteMeals.toArray(),
      this.database.media.toArray(),
      this.database.trainingProfiles.toArray(),
      this.database.exercises.toArray(),
      this.database.exerciseFavorites.toArray(),
      this.database.workoutPlans.toArray(),
      this.database.workoutSessions.toArray(),
      this.database.workoutSetLogs.toArray(),
      this.database.dailyNutritionSummaries.toArray(),
      this.database.routineProfiles.toArray(),
      this.database.routineDays.toArray(),
      this.database.sleepRecords.toArray(),
      this.database.reminderSnoozes.toArray(),
    ]);
    const serializedMedia = await Promise.all(media.map(async ({ blob, ...item }) => ({ ...item, dataUrl: await blobToDataUrl(blob) })));
    return {
      profiles, nutritionTargets, foods, recipes, diaryEntries, mealCategories,
      waterEntries, progressRecords, progressPhotos, preferences, foodPreferences, favoriteMeals, media: serializedMedia,
      trainingProfiles, exercises, exerciseFavorites, workoutPlans, workoutSessions, workoutSetLogs, dailyNutritionSummaries,
      routineProfiles, routineDays, sleepRecords, reminderSnoozes,
    };
  }

  async replaceAll(data: DefynBackupData): Promise<void> {
    const tables = [
      this.database.profiles, this.database.nutritionTargets, this.database.foods,
      this.database.recipes, this.database.diaryEntries, this.database.mealCategories,
      this.database.waterEntries, this.database.progressRecords,
      this.database.progressPhotos, this.database.preferences,
      this.database.foodPreferences, this.database.favoriteMeals, this.database.media,
      this.database.trainingProfiles, this.database.exercises, this.database.exerciseFavorites,
      this.database.workoutPlans, this.database.workoutSessions, this.database.workoutSetLogs,
      this.database.dailyNutritionSummaries,
      this.database.routineProfiles, this.database.routineDays, this.database.sleepRecords, this.database.reminderSnoozes,
    ];
    await this.database.transaction('rw', tables, async () => {
      await Promise.all(tables.map((table) => table.clear()));
      await this.database.profiles.bulkPut(data.profiles);
      await this.database.nutritionTargets.bulkPut(data.nutritionTargets);
      await this.database.foods.bulkPut(data.foods);
      await this.database.recipes.bulkPut(data.recipes);
      await this.database.diaryEntries.bulkPut(data.diaryEntries);
      await this.database.mealCategories.bulkPut(data.mealCategories);
      await this.database.waterEntries.bulkPut(data.waterEntries);
      await this.database.progressRecords.bulkPut(data.progressRecords);
      await this.database.progressPhotos.bulkPut(data.progressPhotos);
      await this.database.preferences.bulkPut(data.preferences);
      await this.database.foodPreferences.bulkPut(data.foodPreferences);
      await this.database.favoriteMeals.bulkPut(data.favoriteMeals);
      await this.database.media.bulkPut(data.media.map(({ dataUrl, ...item }) => ({ ...item, blob: dataUrlToBlob(dataUrl) })));
      await this.database.trainingProfiles.bulkPut(data.trainingProfiles);
      await this.database.exercises.bulkPut(data.exercises);
      await this.database.exerciseFavorites.bulkPut(data.exerciseFavorites);
      await this.database.workoutPlans.bulkPut(data.workoutPlans);
      await this.database.workoutSessions.bulkPut(data.workoutSessions);
      await this.database.workoutSetLogs.bulkPut(data.workoutSetLogs);
      await this.database.dailyNutritionSummaries.bulkPut(data.dailyNutritionSummaries);
      await this.database.routineProfiles.bulkPut(data.routineProfiles);
      await this.database.routineDays.bulkPut(data.routineDays);
      await this.database.sleepRecords.bulkPut(data.sleepRecords);
      await this.database.reminderSnoozes.bulkPut(data.reminderSnoozes);
    });
  }

  async clearAll(): Promise<void> {
    const tables = [
      this.database.profiles, this.database.nutritionTargets, this.database.foods,
      this.database.recipes, this.database.diaryEntries, this.database.mealCategories,
      this.database.waterEntries, this.database.progressRecords,
      this.database.progressPhotos, this.database.preferences,
      this.database.foodPreferences, this.database.favoriteMeals, this.database.media,
      this.database.trainingProfiles, this.database.exercises, this.database.exerciseFavorites,
      this.database.workoutPlans, this.database.workoutSessions, this.database.workoutSetLogs,
      this.database.dailyNutritionSummaries,
      this.database.routineProfiles, this.database.routineDays, this.database.sleepRecords, this.database.reminderSnoozes,
    ];
    await this.database.transaction('rw', tables, async () => {
      await Promise.all(tables.map((table) => table.clear()));
    });
  }
}
