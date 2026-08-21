import { describe, expect, it } from 'vitest';
import { migrateFoodToV3, migrateProfileToV3 } from './migration-v3';
import type { Food } from '../../domain/food/food';
import type { UserProfile } from '../../domain/profile/profile';
const timestamp = '2026-08-21T00:00:00.000Z';
describe('migration v2 → v3', () => {
  it('normaliza alimento preservando id e nutrientes', () => { const legacy = { id:'f', name:'Pão Integral', basePortion:{quantity:100,unit:'g'}, nutrients:{caloriesKcal:250}, dataSource:'user-entered', createdAt:timestamp, updatedAt:timestamp } as Food; const migrated = migrateFoodToV3(legacy); expect(migrated).toMatchObject({ id:'f', nameNormalized:'pao integral', dataSource:'manual', portions:[] }); expect(migrated.nutrients.caloriesKcal).toBe(250); });
  it('adiciona preferências opcionais ao perfil', () => expect(migrateProfileToV3(profile()).nutritionPlanning?.mealsPerDay).toBe(4));
  it('adiciona rotina de hidratação sem alterar a meta', () => { const migrated = migrateProfileToV3(profile()); expect(migrated.hydrationRoutine).toMatchObject({ wakeTime:'07:00', sleepTime:'23:00' }); expect(migrated.hydrationConfiguration).toEqual({ mode:'weight-based', mlPerKg:35 }); });
});
function profile(): UserProfile { return { id:'p', name:'A', dateOfBirth:'1990-01-01', metabolicSex:'male', heightCm:175, currentWeightKg:80, goal:'maintenance', activity:{factor:1.5}, metabolicMethod:'mifflin-st-jeor', calorieGoal:{mode:'maintenance'}, macroConfiguration:{ mode:'manual', proteinGrams:100, carbGrams:200, fatGrams:60 }, hydrationConfiguration:{mode:'weight-based',mlPerKg:35}, units:{weight:'kg',height:'cm',energy:'kcal'}, createdAt:timestamp,updatedAt:timestamp }; }
