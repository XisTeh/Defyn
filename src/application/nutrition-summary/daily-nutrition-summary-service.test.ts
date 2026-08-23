import { describe, expect, it } from 'vitest';
import type { DailyNutritionSummary } from '../../domain/nutrition-summary/daily-nutrition-summary';
import type { DailyNutritionSummaryRepository } from '../../domain/nutrition-summary/repository';
import { DailyNutritionSummaryService, parseOptionalBrazilianDecimal } from './daily-nutrition-summary-service';

class MemoryRepository implements DailyNutritionSummaryRepository {
  rows: DailyNutritionSummary[]=[];
  get(profileId:string,localDate:string){return Promise.resolve(this.rows.find((row)=>row.profileId===profileId&&row.localDate===localDate));}
  listByPeriod(profileId:string,start:string|undefined,end:string){return Promise.resolve(this.rows.filter((row)=>row.profileId===profileId&&(!start||row.localDate>=start)&&row.localDate<=end));}
  async save(summary:DailyNutritionSummary){this.rows=this.rows.filter((row)=>row.id!==summary.id);this.rows.push(summary);}
  async remove(profileId:string,localDate:string){this.rows=this.rows.filter((row)=>row.profileId!==profileId||row.localDate!==localDate);}
  async removeByProfile(profileId:string){this.rows=this.rows.filter((row)=>row.profileId!==profileId);}
}

describe('DailyNutritionSummaryService',()=>{
  it('cria e edita um único resumo por perfil/data sem misturar perfis',async()=>{const repo=new MemoryRepository();let sequence=0;const service=new DailyNutritionSummaryService(repo,()=>new Date('2026-08-23T12:00:00Z'),()=> `summary-${++sequence}`);await service.save('a','2026-08-23',{caloriesKcal:2000});await service.save('a','2026-08-23',{proteinG:150});await service.save('b','2026-08-23',{caloriesKcal:0});expect(repo.rows).toHaveLength(2);expect(await service.get('a','2026-08-23')).toMatchObject({id:'summary-1',proteinG:150,caloriesKcal:undefined});expect(await service.get('b','2026-08-23')).toMatchObject({caloriesKcal:0});});
  it('preserva zero e diferencia campo ausente',async()=>{const repo=new MemoryRepository();const service=new DailyNutritionSummaryService(repo,undefined,()=> 'zero');const saved=await service.save('a','2026-08-23',{caloriesKcal:0});expect(saved?.caloriesKcal).toBe(0);expect(saved?.proteinG).toBeUndefined();});
  it('isola resumos de datas diferentes',async()=>{const repo=new MemoryRepository();let sequence=0;const service=new DailyNutritionSummaryService(repo,undefined,()=>`date-${++sequence}`);await service.save('a','2026-08-22',{proteinG:120});await service.save('a','2026-08-23',{proteinG:140});expect((await service.listByPeriod('a','2026-08-23','2026-08-23')).map((item)=>item.proteinG)).toEqual([140]);});
  it('remove registro quando todos os campos ficam vazios',async()=>{const repo=new MemoryRepository();const service=new DailyNutritionSummaryService(repo,undefined,()=> 'id');await service.save('a','2026-08-23',{note:'contexto'});await service.save('a','2026-08-23',{});expect(repo.rows).toEqual([]);});
  it('aceita decimal brasileiro, ponto decimal e rejeita valor negativo',()=>{expect(parseOptionalBrazilianDecimal('1.234,5')).toBe(1234.5);expect(parseOptionalBrazilianDecimal('55.5')).toBe(55.5);expect(parseOptionalBrazilianDecimal('')).toBeUndefined();expect(()=>parseOptionalBrazilianDecimal('-1')).toThrow();});
});
