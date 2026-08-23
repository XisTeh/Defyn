import { describe, expect, it } from 'vitest';
import type { WaterEntry } from '../../domain/hydration/hydration';
import type { WaterRepository } from '../../domain/hydration/repository';
import type { DailyNutritionSummary } from '../../domain/nutrition-summary/daily-nutrition-summary';
import type { DailyNutritionSummaryRepository } from '../../domain/nutrition-summary/repository';
import type { UserProfile } from '../../domain/profile/profile';
import type { ProfileRepository } from '../../domain/profile/repository';
import type { NutritionTargetSnapshot } from '../../domain/targets/nutrition-target';
import type { NutritionTargetRepository } from '../../domain/targets/repository';
import { GetTodayDashboardService } from './get-today-dashboard';

describe('agregação isolada do dashboard', () => {
  it('não mistura resumo, target ou água entre perfis', async () => {
    const service = fixture();
    const a = await service.execute('profile-a'); const b = await service.execute('profile-b');
    expect(a.nutritionSummary?.caloriesKcal).toBe(500); expect(b.nutritionSummary?.caloriesKcal).toBe(0);
    expect(a.hydration.consumedMl).toBe(800); expect(b.hydration.consumedMl).toBe(300);
    expect(a.nutritionTarget.result.calorieTarget).toBe(2200); expect(b.nutritionTarget.result.calorieTarget).toBe(1800);
  });

  it('consulta apenas o dia local atual e mantém histórico anterior fora do total', async () => {
    const a = await fixture().execute('profile-a');
    expect(a.localDate).toBe('2026-08-21');
    expect(a.hydration.entries.map((entry) => entry.id).sort()).toEqual(['water-a1','water-a2']);
  });
});

function fixture(): GetTodayDashboardService {
  const profiles = new Map([['profile-a',profile('profile-a',80)],['profile-b',profile('profile-b',60)]]);
  const profileRepository: ProfileRepository = { getById:async(id)=>profiles.get(id),list:async()=>[...profiles.values()],save:async(value)=>{profiles.set(value.id,value);},remove:async(id)=>{profiles.delete(id);} };
  const targets=[target('target-a','profile-a',2200),target('target-b','profile-b',1800)];
  const targetRepository: NutritionTargetRepository={save:async()=>undefined,getActiveForProfile:async(profileId)=>targets.find((item)=>item.profileId===profileId),listForProfile:async(profileId)=>targets.filter((item)=>item.profileId===profileId),removeByProfile:async()=>undefined};
  const summaries=[summary('summary-a','profile-a','2026-08-21',500),summary('summary-b','profile-b','2026-08-21',0),summary('summary-old','profile-a','2026-08-20',900)];
  const summaryRepository: DailyNutritionSummaryRepository={get:async(profileId,date)=>summaries.find((item)=>item.profileId===profileId&&item.localDate===date),listByPeriod:async()=>[],save:async()=>undefined,remove:async()=>undefined,removeByProfile:async()=>undefined};
  const entries=[water('water-a1','profile-a','2026-08-21',300),water('water-a2','profile-a','2026-08-21',500),water('water-a-old','profile-a','2026-08-20',900),water('water-b','profile-b','2026-08-21',300)];
  const waterRepository: WaterRepository={listByProfileAndDate:async(profileId,date)=>entries.filter((entry)=>entry.profileId===profileId&&entry.localDate===date),save:async()=>undefined,remove:async()=>undefined,removeByProfile:async()=>undefined};
  return new GetTodayDashboardService(profileRepository,targetRepository,summaryRepository,waterRepository,()=>new Date(2026,7,21,12));
}
function summary(id:string,profileId:string,localDate:string,caloriesKcal:number):DailyNutritionSummary{return{id,profileId,localDate,caloriesKcal,createdAt:`${localDate}T12:00:00.000Z`,updatedAt:`${localDate}T12:00:00.000Z`};}
function profile(id:string,weight:number):UserProfile{return{id,name:id,dateOfBirth:'1990-01-01',metabolicSex:'male',heightCm:175,currentWeightKg:weight,goal:'fat-loss',activity:{factor:1.5},metabolicMethod:'mifflin-st-jeor',calorieGoal:{mode:'deficit',adjustmentKcal:400},macroConfiguration:{mode:'derived-carbs',protein:{mode:'per-kg',gramsPerKg:2},fat:{mode:'per-kg',gramsPerKg:1}},hydrationConfiguration:{mode:'weight-based',mlPerKg:35},units:{weight:'kg',height:'cm',energy:'kcal'},createdAt:'2026-08-21T00:00:00.000Z',updatedAt:'2026-08-21T00:00:00.000Z'};}
function target(id:string,profileId:string,calories:number):NutritionTargetSnapshot{return{id,profileId,startsAt:'2026-08-21T00:00:00.000Z',createdAt:'2026-08-21T00:00:00.000Z',updatedAt:'2026-08-21T00:00:00.000Z',input:{sex:'male',weightKg:80,heightCm:175,ageYears:36,metabolicMethod:'mifflin-st-jeor',activityFactor:1.5,calorieGoal:{mode:'custom',targetKcal:calories},macros:{mode:'manual',proteinGrams:160,carbGrams:200,fatGrams:70}},result:{bmr:1700,metabolicMethod:'mifflin-st-jeor',activityFactor:1.5,tdee:2550,calorieAdjustment:calories-2550,calorieTarget:calories,macros:{protein:{grams:160,calories:640},carbs:{grams:200,calories:800},fat:{grams:70,calories:630}}}};}
function water(id:string,profileId:string,localDate:string,amountMl:number):WaterEntry{return{id,profileId,localDate,amountMl,occurredAt:`${localDate}T12:00:00.000Z`,createdAt:`${localDate}T12:00:00.000Z`,updatedAt:`${localDate}T12:00:00.000Z`};}
