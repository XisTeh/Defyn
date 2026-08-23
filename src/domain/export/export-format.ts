import type { DiaryEntry, MealCategory } from '../diary/diary';
import type { Food } from '../food/food';
import type { WaterEntry } from '../hydration/hydration';
import type { UserProfile } from '../profile/profile';
import type { ProgressPhotoMetadata, ProgressRecord } from '../progress/progress';
import type { Recipe } from '../recipe/recipe';
import type { NutritionTargetSnapshot } from '../targets/nutrition-target';
import type { FoodPreference } from '../food/food-preference';
import type { FavoriteMeal } from '../diary/diary';
import type { LocalMedia } from '../media/media';
import type { Exercise, ExerciseFavorite, TrainingProfile, WorkoutPlan, WorkoutSession, WorkoutSetLog } from '../training/training';
import type { DailyNutritionSummary } from '../nutrition-summary/daily-nutrition-summary';
import type { ReminderSnooze, RoutineDay, RoutineProfile, SleepRecord } from '../routine/routine';

export const DEFYN_BACKUP_FORMAT = 'defyn-backup';
export const DEFYN_BACKUP_VERSION = 7;

export interface StoredPreference {
  key: string;
  value: string | number | boolean;
}

export interface DefynBackupData {
  profiles: UserProfile[];
  nutritionTargets: NutritionTargetSnapshot[];
  foods: Food[];
  recipes: Recipe[];
  diaryEntries: DiaryEntry[];
  mealCategories: MealCategory[];
  waterEntries: WaterEntry[];
  progressRecords: ProgressRecord[];
  progressPhotos: ProgressPhotoMetadata[];
  preferences: StoredPreference[];
  foodPreferences: FoodPreference[];
  favoriteMeals: FavoriteMeal[];
  media: StoredMediaBackup[];
  trainingProfiles: TrainingProfile[];
  exercises: Exercise[];
  exerciseFavorites: ExerciseFavorite[];
  workoutPlans: WorkoutPlan[];
  workoutSessions: WorkoutSession[];
  workoutSetLogs: WorkoutSetLog[];
  dailyNutritionSummaries: DailyNutritionSummary[];
  routineProfiles: RoutineProfile[];
  routineDays: RoutineDay[];
  sleepRecords: SleepRecord[];
  reminderSnoozes: ReminderSnooze[];
}

export interface StoredMediaBackup extends Omit<LocalMedia, 'blob'> { dataUrl: string; }

export interface DefynBackup {
  format: typeof DEFYN_BACKUP_FORMAT;
  version: typeof DEFYN_BACKUP_VERSION;
  exportedAt: string;
  data: DefynBackupData;
}
