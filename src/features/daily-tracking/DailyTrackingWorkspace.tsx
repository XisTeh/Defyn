import { useEffect, useMemo, useState } from 'react';
import { DailyNutritionSummaryService, parseOptionalBrazilianDecimal } from '../../application/nutrition-summary/daily-nutrition-summary-service';
import type { UserProfile } from '../../domain/profile/profile';
import type { ProgressRecord } from '../../domain/progress/progress';
import { toLocalDateKey } from '../../domain/shared/local-date';
import type { WorkoutSession } from '../../domain/training/training';
import type { WaterEntry } from '../../domain/hydration/hydration';
import { repositories } from '../../infrastructure/repositories';
import { Button } from '../../shared/components/Button';
import './daily-tracking-workspace.css';

const summaryService = new DailyNutritionSummaryService(repositories.dailyNutritionSummaries);

type FormState = { caloriesKcal: string; proteinG: string; carbohydratesG: string; fatG: string; note: string };
const emptyForm: FormState = { caloriesKcal: '', proteinG: '', carbohydratesG: '', fatG: '', note: '' };

export function DailyTrackingWorkspace({ profile, revision, onChanged, onNotice }: { profile: UserProfile; revision: number; onChanged: () => void; onNotice: (message: string) => void }) {
  const [localDate, setLocalDate] = useState(() => toLocalDateKey(new Date()));
  const [form, setForm] = useState<FormState>(emptyForm);
  const [water, setWater] = useState<WaterEntry[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [body, setBody] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      summaryService.get(profile.id, localDate),
      repositories.water.listByProfileAndDate(profile.id, localDate),
      repositories.workoutSessions.listByDate(profile.id, localDate),
      repositories.progress.listRecords(profile.id),
    ]).then(([summary, waterEntries, sessions, records]) => {
      if (!active) return;
      setForm(summary ? {
        caloriesKcal: present(summary.caloriesKcal), proteinG: present(summary.proteinG), carbohydratesG: present(summary.carbohydratesG), fatG: present(summary.fatG), note: summary.note ?? '',
      } : emptyForm);
      setWater(waterEntries.sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)));
      setWorkouts(sessions);
      setBody(records.filter((record)=>record.localDate===localDate));
      setError('');
    }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Não foi possível abrir este dia.'); })
      .finally(()=>{if(active)setLoading(false);});
    return () => { active = false; };
  }, [profile.id, localDate, revision]);

  const waterTotal = useMemo(()=>water.reduce((sum,item)=>sum+item.amountMl,0),[water]);

  async function save() {
    setSaving(true); setError('');
    try {
      const result = await summaryService.save(profile.id, localDate, {
        caloriesKcal: parseOptionalBrazilianDecimal(form.caloriesKcal),
        proteinG: parseOptionalBrazilianDecimal(form.proteinG),
        carbohydratesG: parseOptionalBrazilianDecimal(form.carbohydratesG),
        fatG: parseOptionalBrazilianDecimal(form.fatG),
        note: form.note,
      });
      onChanged();
      onNotice(result ? 'Resumo diário salvo.' : 'Resumo vazio removido.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  }

  return <div className="tracking-page">
    <header className="tracking-header"><div><span className="page-eyebrow">Acompanhamento diário</span><h1>Diário</h1><p>Um resumo simples e opcional. Campo vazio significa “sem dado”; zero continua sendo zero.</p></div><div className="tracking-date-nav"><button type="button" aria-label="Dia anterior" onClick={()=>setLocalDate(shiftDate(localDate,-1))}>←</button><label><span>Data</span><input type="date" value={localDate} max={toLocalDateKey(new Date())} onChange={(event)=>setLocalDate(event.target.value)}/></label><button type="button" aria-label="Próximo dia" disabled={localDate>=toLocalDateKey(new Date())} onClick={()=>setLocalDate(shiftDate(localDate,1))}>→</button></div></header>

    {loading ? <div className="tracking-loading">Carregando {formatDate(localDate)}…</div> : <>
      <section className="day-overview" aria-label={`Resumo de ${formatDate(localDate)}`}>
        <FactCard eyebrow="Hidratação" value={water.length?formatLiters(waterTotal):'Sem dado'} detail={water.length?`${water.length} registro(s)`:'Nenhum registro neste dia'}/>
        <FactCard eyebrow="Treino" value={workouts.length?`${workouts.filter((item)=>item.status==='completed').length} concluído(s)`:'Sem dado'} detail={workouts.length?workouts.map((item)=>item.templateName).join(' · '):'Nenhuma sessão neste dia'}/>
        <FactCard eyebrow="Corpo" value={body.some((item)=>item.weightKg!==undefined)?`${body.find((item)=>item.weightKg!==undefined)?.weightKg?.toLocaleString('pt-BR')} kg`:'Sem dado'} detail={body.length?'Há check-in ou observação':'Nenhum registro corporal neste dia'}/>
      </section>

      <section className="nutrition-summary-editor"><header><div><span className="page-eyebrow">Nutrição</span><h2>Resumo manual</h2></div><small>Não exige alimentos, receitas ou refeições.</small></header><div className="summary-field-grid"><DecimalField label="Calorias" unit="kcal" value={form.caloriesKcal} onChange={(value)=>setForm({...form,caloriesKcal:value})}/><DecimalField label="Proteína" unit="g" value={form.proteinG} onChange={(value)=>setForm({...form,proteinG:value})}/><DecimalField label="Carboidratos" unit="g" value={form.carbohydratesG} onChange={(value)=>setForm({...form,carbohydratesG:value})}/><DecimalField label="Gorduras" unit="g" value={form.fatG} onChange={(value)=>setForm({...form,fatG:value})}/></div><label className="daily-note"><span>Nota do dia <small>(opcional)</small></span><textarea rows={4} maxLength={800} value={form.note} onChange={(event)=>setForm({...form,note:event.target.value})} placeholder="Contexto que você queira lembrar, sem julgamento automático."/></label>{error&&<p className="tracking-error" role="alert">{error}</p>}<footer><p>Os dados ficam neste dispositivo e entram no backup do DEFYN.</p><Button type="button" disabled={saving} onClick={()=>void save()}>{saving?'Salvando…':'Salvar resumo'}</Button></footer></section>

      <section className="daily-facts-grid"><DailyList title="Água registrada" empty="Nenhuma água registrada." items={water.map((item)=>({id:item.id,title:`${item.amountMl.toLocaleString('pt-BR')} ml`,detail:new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(item.occurredAt))}))}/><DailyList title="Treinos do dia" empty="Nenhuma sessão registrada." items={workouts.map((item)=>({id:item.id,title:item.templateName,detail:item.status==='completed'?'Concluído':item.status==='active'?'Em andamento':'Cancelado'}))}/><DailyList title="Corpo e check-in" empty="Nenhum dado corporal registrado." items={body.map((item)=>({id:item.id,title:item.weightKg!==undefined?`${item.weightKg.toLocaleString('pt-BR')} kg`:'Registro sem peso',detail:item.note??(item.measurements?'Medidas registradas':'Check-in')}))}/></section>
    </>}
  </div>;
}

function DecimalField({label,unit,value,onChange}:{label:string;unit:string;value:string;onChange:(value:string)=>void}) { return <label><span>{label}</span><div><input inputMode="decimal" autoComplete="off" value={value} onChange={(event)=>onChange(event.target.value)} placeholder="Sem dado"/><b>{unit}</b></div></label>; }
function FactCard({eyebrow,value,detail}:{eyebrow:string;value:string;detail:string}) { return <article><span>{eyebrow}</span><strong>{value}</strong><small>{detail}</small></article>; }
function DailyList({title,empty,items}:{title:string;empty:string;items:{id:string;title:string;detail:string}[]}) { return <article><h3>{title}</h3>{items.length?<ul>{items.map((item)=><li key={item.id}><strong>{item.title}</strong><small>{item.detail}</small></li>)}</ul>:<p>{empty}</p>}</article>; }
function present(value:number|undefined){return value===undefined?'':String(value).replace('.',',');}
function shiftDate(value:string,days:number){const date=new Date(`${value}T12:00:00`);date.setDate(date.getDate()+days);return toLocalDateKey(date);}
function formatDate(value:string){return new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date(`${value}T12:00:00`));}
function formatLiters(ml:number){return `${(ml/1000).toLocaleString('pt-BR',{maximumFractionDigits:2})} L`;}
