import { defynDatabase } from './indexed-db/database';
import {
  IndexedDbNutritionTargetRepository,
  IndexedDbProfileRepository,
  IndexedDbProgressRepository,
  IndexedDbActiveProfileRepository,
  IndexedDbProfileDataGateway,
  IndexedDbWaterRepository,
  IndexedDbMediaRepository,
  IndexedDbTrainingProfileRepository,
  IndexedDbExerciseRepository,
  IndexedDbWorkoutPlanRepository,
  IndexedDbWorkoutSessionRepository,
  IndexedDbDailyNutritionSummaryRepository,
  IndexedDbRoutineRepository,
} from './indexed-db/repositories';
import { IndexedDbBackupGateway } from './indexed-db/backup-gateway';

export const repositories = {
  profiles: new IndexedDbProfileRepository(defynDatabase),
  nutritionTargets: new IndexedDbNutritionTargetRepository(defynDatabase),
  progress: new IndexedDbProgressRepository(defynDatabase),
  activeProfile: new IndexedDbActiveProfileRepository(defynDatabase),
  profileData: new IndexedDbProfileDataGateway(defynDatabase),
  water: new IndexedDbWaterRepository(defynDatabase),
  media: new IndexedDbMediaRepository(defynDatabase),
  backup: new IndexedDbBackupGateway(defynDatabase),
  trainingProfiles: new IndexedDbTrainingProfileRepository(defynDatabase),
  exercises: new IndexedDbExerciseRepository(defynDatabase),
  workoutPlans: new IndexedDbWorkoutPlanRepository(defynDatabase),
  workoutSessions: new IndexedDbWorkoutSessionRepository(defynDatabase),
  dailyNutritionSummaries: new IndexedDbDailyNutritionSummaryRepository(defynDatabase),
  routine: new IndexedDbRoutineRepository(defynDatabase),
};
