import { LocalDataDetector } from '../../application/auth/local-data-detector';
import { defynDatabase } from './database';

const USER_DATA_STORES = [
  defynDatabase.profiles,
  defynDatabase.nutritionTargets,
  defynDatabase.foods,
  defynDatabase.recipes,
  defynDatabase.diaryEntries,
  defynDatabase.mealCategories,
  defynDatabase.progressRecords,
  defynDatabase.progressPhotos,
  defynDatabase.waterEntries,
  defynDatabase.media,
  defynDatabase.foodPreferences,
  defynDatabase.favoriteMeals,
  defynDatabase.trainingProfiles,
  defynDatabase.exerciseFavorites,
  defynDatabase.workoutPlans,
  defynDatabase.workoutSessions,
  defynDatabase.workoutSetLogs,
  defynDatabase.dailyNutritionSummaries,
  defynDatabase.routineProfiles,
  defynDatabase.routineDays,
  defynDatabase.sleepRecords,
  defynDatabase.reminderSnoozes,
];

export const localDataDetector = new LocalDataDetector(USER_DATA_STORES);
