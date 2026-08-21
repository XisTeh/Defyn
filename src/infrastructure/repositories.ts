import { defynDatabase } from './indexed-db/database';
import {
  IndexedDbDiaryRepository,
  IndexedDbFoodRepository,
  IndexedDbNutritionTargetRepository,
  IndexedDbProfileRepository,
  IndexedDbProgressRepository,
  IndexedDbRecipeRepository,
  IndexedDbActiveProfileRepository,
  IndexedDbProfileDataGateway,
  IndexedDbWaterRepository,
  IndexedDbFoodPreferenceRepository,
  IndexedDbMediaRepository,
  IndexedDbTrainingProfileRepository,
  IndexedDbExerciseRepository,
  IndexedDbWorkoutPlanRepository,
  IndexedDbWorkoutSessionRepository,
} from './indexed-db/repositories';
import { IndexedDbBackupGateway } from './indexed-db/backup-gateway';

export const repositories = {
  profiles: new IndexedDbProfileRepository(defynDatabase),
  nutritionTargets: new IndexedDbNutritionTargetRepository(defynDatabase),
  foods: new IndexedDbFoodRepository(defynDatabase),
  diary: new IndexedDbDiaryRepository(defynDatabase),
  progress: new IndexedDbProgressRepository(defynDatabase),
  recipes: new IndexedDbRecipeRepository(defynDatabase),
  activeProfile: new IndexedDbActiveProfileRepository(defynDatabase),
  profileData: new IndexedDbProfileDataGateway(defynDatabase),
  water: new IndexedDbWaterRepository(defynDatabase),
  foodPreferences: new IndexedDbFoodPreferenceRepository(defynDatabase),
  media: new IndexedDbMediaRepository(defynDatabase),
  backup: new IndexedDbBackupGateway(defynDatabase),
  trainingProfiles: new IndexedDbTrainingProfileRepository(defynDatabase),
  exercises: new IndexedDbExerciseRepository(defynDatabase),
  workoutPlans: new IndexedDbWorkoutPlanRepository(defynDatabase),
  workoutSessions: new IndexedDbWorkoutSessionRepository(defynDatabase),
};
