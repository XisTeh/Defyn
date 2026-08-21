import type { DiaryRepository } from '../../domain/diary/repository';
import type { WaterRepository } from '../../domain/hydration/repository';
import type { LocalMedia, MediaRepository } from '../../domain/media/media';
import type { UserProfile } from '../../domain/profile/profile';
import { aggregateHydration, aggregateNutrition, aggregateTraining, calculateWeightTrend, type HydrationProgress, type NutritionProgress, type TrainingProgress, type WeightTrend } from '../../domain/progress/analytics';
import { validateMeasurements, validateWeight, type BodyMeasurements, type ProgressPeriod, type ProgressPhotoCategory, type ProgressPhotoMetadata, type ProgressRecord, type WeightSource } from '../../domain/progress/progress';
import type { ProgressRepository } from '../../domain/progress/repository';
import type { NutritionTargetRepository } from '../../domain/targets/repository';
import type { WorkoutPlanRepository, WorkoutSessionRepository } from '../../domain/training/repository';

export interface ProgressOverview { period: ProgressPeriod; records: ProgressRecord[]; photos: ProgressPhotoMetadata[]; trend: WeightTrend; nutrition: NutritionProgress; hydration: HydrationProgress; training: TrainingProgress; insights: string[]; }

export class ProgressService {
  constructor(private readonly progress: ProgressRepository, private readonly diary: DiaryRepository, private readonly targets: NutritionTargetRepository, private readonly water: WaterRepository, private readonly plans: WorkoutPlanRepository, private readonly sessions: WorkoutSessionRepository, private readonly media: MediaRepository, private readonly now:()=>Date=()=>new Date(), private readonly id:()=>string=()=>crypto.randomUUID()) {}

  async overview(profile: UserProfile, period: ProgressPeriod): Promise<ProgressOverview> {
    const [records,photos,diaryEntries,targets,waterEntries,plans,sessions] = await Promise.all([this.progress.listRecords(profile.id,period),this.progress.listPhotoMetadata(profile.id,period),this.diary.listEntriesByPeriod!(profile.id,period.startLocalDate,period.endLocalDate),this.targets.listForProfile(profile.id),this.water.listByPeriod!(profile.id,period.startLocalDate,period.endLocalDate),this.plans.list(profile.id),this.sessions.listByPeriod!(profile.id,period.startLocalDate,period.endLocalDate)]);
    const logs=await this.sessions.listSetLogsForSessions!(profile.id,sessions.map((s)=>s.id)); const trend=calculateWeightTrend(records,period.endLocalDate); const nutrition=aggregateNutrition(diaryEntries,targets,period); const hydration=aggregateHydration(waterEntries,profile,records,period); const training=aggregateTraining(sessions,logs,plans,period);
    return {period,records,photos,trend,nutrition,hydration,training,insights:buildInsights(trend,nutrition,hydration,training)};
  }

  async saveRecord(profileId:string, input:{id?:string;localDate:string;occurredAt?:string;weightKg?:number;measurements?:BodyMeasurements;note?:string;source?:'manual'|'check-in';weightSource?:WeightSource}) { if(input.weightKg!==undefined) validateWeight(input.weightKg); if(input.measurements) validateMeasurements(input.measurements); if(input.source!=='check-in' && input.weightKg===undefined && !input.measurements && !input.note?.trim()) throw new Error('Informe peso, medida ou uma observação.'); const timestamp=this.now().toISOString(); const existing=input.id?await this.progress.getRecord!(profileId,input.id):undefined; const record:ProgressRecord={id:existing?.id??this.id(),profileId,localDate:input.localDate,occurredAt:input.occurredAt??`${input.localDate}T12:00:00`,weightKg:input.weightKg,weightSource:input.weightKg!==undefined?(input.weightSource??'manual'):undefined,measurements:input.measurements,note:input.note?.trim()||undefined,source:input.source??'manual',createdAt:existing?.createdAt??timestamp,updatedAt:timestamp}; await this.progress.saveRecord(record); return record; }
  removeRecord(profileId:string,id:string){return this.progress.removeRecord!(profileId,id);}
  async savePhoto(profileId:string,checkInId:string|undefined,localDate:string,category:ProgressPhotoCategory,prepared:LocalMedia,note?:string){ const timestamp=this.now().toISOString(); const photo:ProgressPhotoMetadata={id:prepared.ownerId??this.id(),profileId,localDate,occurredAt:`${localDate}T12:00:00`,category,mediaId:prepared.id,checkInId,note:note?.trim()||undefined,createdAt:timestamp,updatedAt:timestamp}; await this.media.save({...prepared,ownerType:'progress',ownerId:photo.id}); await this.progress.savePhotoMetadata(photo); return photo; }
  removePhoto(profileId:string,id:string){return this.progress.removePhoto!(profileId,id);}
  removeCheckIn(profileId:string,id:string){return this.progress.removeCheckIn!(profileId,id);}
}

export function buildInsights(trend:WeightTrend,nutrition:NutritionProgress,hydration:HydrationProgress,training:TrainingProgress):string[]{ const values:string[]=[]; if(trend.kind!=='insufficient') values.push(trend.message); if(nutrition.registeredDays) values.push(`Há diário em ${nutrition.registeredDays} dia(s); proteína atingiu a meta em ${nutrition.proteinDaysAtTarget} deles.`); if(hydration.registeredDays) values.push(`A média registrada de água foi ${Math.round((hydration.averageMl??0)/100)/10} L em ${hydration.registeredDays} dia(s).`); if(training.completedSessions) values.push(`${training.completedSessions} treino(s) foram concluídos no período.`); return values.slice(0,4); }
