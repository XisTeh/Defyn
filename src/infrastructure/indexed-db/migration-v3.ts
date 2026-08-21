import { foodSearchText, normalizeFoodSearch, type Food } from '../../domain/food/food';
import type { UserProfile } from '../../domain/profile/profile';

export function migrateFoodToV3(food: Food): Food {
  const nameNormalized = normalizeFoodSearch(food.name);
  return {
    ...food,
    nameNormalized,
    searchTextNormalized: foodSearchText(food.name, food.brand, food.category, food.barcode),
    portions: food.portions ?? [],
    dataSource: food.dataSource === 'user-entered' ? 'manual' : food.dataSource === 'label-scan' ? 'nutrition-label-ocr' : food.dataSource === 'barcode' ? 'barcode-local' : food.dataSource,
  };
}

export function migrateProfileToV3(profile: UserProfile): UserProfile {
  return {
    ...profile,
    nutritionPlanning: profile.nutritionPlanning ?? {
      mealsPerDay: 4,
      mealTimes: ['07:30', '12:30', '16:30', '20:00'],
      preferredFoods: [], dislikedFoods: [], avoidedFoods: [], dietaryRestrictions: [], intolerances: [], allergies: [], supplements: [],
      mealSizePreference: 'balanced', flexiblePlanning: true,
    },
    hydrationRoutine: profile.hydrationRoutine ?? { wakeTime: '07:00', sleepTime: '23:00', remindersEnabled: false, pacingMode: 'continuous' },
  };
}
