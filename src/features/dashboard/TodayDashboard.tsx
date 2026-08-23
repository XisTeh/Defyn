import { useEffect, useState } from 'react';
import { GetTodayDashboardService, type TodayDashboard as DashboardData } from '../../application/dashboard/get-today-dashboard';
import { WaterService } from '../../application/hydration/water-service';
import { TrainingService, type TodayWorkout } from '../../application/training/training-service';
import { calculateHydrationPace, type WaterEntry } from '../../domain/hydration/hydration';
import { presentationRound } from '../../domain/nutrition';
import { formatLocalDate } from '../../domain/shared/local-date';
import { repositories } from '../../infrastructure/repositories';
import { Button } from '../../shared/components/Button';
import './today-dashboard.css';

const dashboardService = new GetTodayDashboardService(repositories.profiles, repositories.nutritionTargets, repositories.dailyNutritionSummaries, repositories.water);
const waterService = new WaterService(repositories.water);
const trainingService = new TrainingService(repositories.trainingProfiles, repositories.exercises, repositories.workoutPlans, repositories.workoutSessions);

interface TodayDashboardProps {
  profileId: string;
  revision: number;
  onNotice: (message: string) => void;
  onNavigateTraining: () => void;
  onNavigateDiary: () => void;
  onNavigateProgress: () => void;
}

export function TodayDashboard({ profileId, revision, onNotice, onNavigateTraining, onNavigateDiary, onNavigateProgress }: TodayDashboardProps) {
  const [data, setData] = useState<DashboardData>();
  const [training, setTraining] = useState<TodayWorkout>();
  const [error, setError] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [editingId, setEditingId] = useState<string>();
  const [editingAmount, setEditingAmount] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([dashboardService.execute(profileId), trainingService.getToday(profileId)])
      .then(([dashboard, workout]) => { if (active) { setData(dashboard); setTraining(workout); setError(''); } })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o dia.'); });
    return () => { active = false; };
  }, [profileId, revision]);

  function withWater(entries: WaterEntry[]): void {
    setData((current) => {
      if (!current) return current;
      const consumedMl = entries.reduce((sum, entry) => sum + entry.amountMl, 0);
      const routine = current.profile.hydrationRoutine ?? { wakeTime: '07:00', sleepTime: '23:00' };
      return { ...current, hydration: { ...current.hydration, entries, consumedMl, remainingMl: Math.max(0, current.hydration.targetMl - consumedMl), percentage: current.hydration.targetMl ? (consumedMl / current.hydration.targetMl) * 100 : 0, pace: calculateHydrationPace(current.hydration.targetMl, consumedMl, routine.wakeTime, routine.sleepTime, new Date()) } };
    });
  }

  async function addWater(amountMl: number) {
    if (!data || !Number.isFinite(amountMl) || amountMl <= 0) return;
    const previous = data.hydration.entries;
    const timestamp = new Date().toISOString();
    withWater([{ id: `optimistic-${timestamp}`, profileId, amountMl, occurredAt: timestamp, localDate: data.localDate, createdAt: timestamp, updatedAt: timestamp }, ...previous]);
    try {
      const saved = await waterService.log(profileId, amountMl);
      withWater([saved, ...previous]);
      setCustomAmount('');
      onNotice(`+${amountMl} ml registrado.`);
    } catch (caught) {
      withWater(previous);
      setError(caught instanceof Error ? caught.message : 'Não foi possível registrar a água.');
    }
  }

  async function updateWater(entry: WaterEntry) {
    const amount = Number(editingAmount);
    if (!data || !Number.isFinite(amount) || amount <= 0) return;
    const previous = data.hydration.entries;
    const optimistic = previous.map((item) => item.id === entry.id ? { ...item, amountMl: amount } : item);
    withWater(optimistic);
    setEditingId(undefined);
    try { await waterService.update(entry, amount); onNotice('Registro de água atualizado.'); }
    catch { withWater(previous); setError('Não foi possível atualizar a água.'); }
  }

  async function removeWater(entry: WaterEntry) {
    if (!data) return;
    const previous = data.hydration.entries;
    withWater(previous.filter((item) => item.id !== entry.id));
    try { await waterService.remove(entry.id); onNotice('Registro de água removido.'); }
    catch { withWater(previous); setError('Não foi possível remover a água.'); }
  }

  if (error) return <div className="page-state error-state" role="alert"><strong>Algo saiu do ritmo.</strong><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></div>;
  if (!data || data.profile.id !== profileId) return <div className="dashboard-skeleton" aria-label="Carregando o dia"><span /><span /><span /></div>;

  const target = data.nutritionTarget.result;
  const summary = data.nutritionSummary;
  return <div className="today-page">
    <header className="today-header"><div><span className="page-eyebrow">Hoje · {formatLocalDate(new Date())}</span><h1>Olá, {data.profile.name}.</h1><p>Treino, hidratação, direção nutricional e progresso em um só lugar.</p></div><div className="today-profile-chip"><span>{data.profile.currentWeightKg.toLocaleString('pt-BR')} kg</span><small>{goalLabel(data.profile.goal)}</small></div></header>

    <section className="today-workout-card today-priority-card">
      <div><span className="page-eyebrow">Treino de hoje</span><h2>{training?.activeSession?.templateName ?? training?.template?.name ?? 'Nenhum treino planejado'}</h2><p>{training?.activeSession ? 'Sessão em andamento e salva neste dispositivo.' : training?.template ? `${training.template.focus} · ${training.template.exercises.length} exercícios · ~${training.template.approximateMinutes} min` : 'Abra Treinos para montar ou escolher sua ficha.'}</p></div>
      <Button className="today-workout-action" type="button" onClick={onNavigateTraining}>{training?.activeSession ? 'Continuar treino' : training?.template ? 'Iniciar treino' : 'Abrir treinos'} <span aria-hidden="true">↗</span></Button>
    </section>

    <section className="lower-grid">
      <article className="water-card"><div className="water-card-header"><div><span className="page-eyebrow">Hidratação</span><h2>{formatLiters(data.hydration.consumedMl)} <small>/ {formatLiters(data.hydration.targetMl)}</small></h2></div><div className="water-percent"><strong>{Math.min(999, presentationRound(data.hydration.percentage))}%</strong><small>da meta</small></div></div><ProgressBar value={data.hydration.consumedMl} target={data.hydration.targetMl} label="Progresso da hidratação" /><div className="water-actions" aria-label="Registrar água">{[200,300,500].map((amount)=><button key={amount} type="button" onClick={()=>void addWater(amount)}>+ {amount} ml</button>)}</div><form className="custom-water" onSubmit={(event)=>{event.preventDefault();void addWater(Number(customAmount));}}><label htmlFor="custom-water">Outro valor</label><div><input id="custom-water" type="number" min="1" max="10000" inputMode="numeric" placeholder="450" value={customAmount} onChange={(event)=>setCustomAmount(event.target.value)}/><span>ml</span><button type="submit" disabled={!customAmount}>Registrar</button></div></form></article>
      <article className="water-history-card"><div className="card-topline"><span>Registros de hoje</span><small>{data.hydration.entries.length} entrada(s)</small></div>{data.hydration.entries.length===0?<div className="water-empty"><strong>Nenhuma água registrada.</strong><p>Campos sem registro continuam sem dado.</p></div>:<ul className="water-history-list">{data.hydration.entries.map((entry)=><li key={entry.id}><time dateTime={entry.occurredAt}>{new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(entry.occurredAt))}</time>{editingId===entry.id?<form onSubmit={(event)=>{event.preventDefault();void updateWater(entry);}}><input aria-label="Nova quantidade em mililitros" type="number" min="1" max="10000" value={editingAmount} onChange={(event)=>setEditingAmount(event.target.value)}/><button type="submit">Salvar</button><button type="button" onClick={()=>setEditingId(undefined)}>Cancelar</button></form>:<><strong>+ {entry.amountMl.toLocaleString('pt-BR')} ml</strong><div><button type="button" onClick={()=>{setEditingId(entry.id);setEditingAmount(String(entry.amountMl));}}>Editar</button><button type="button" onClick={()=>void removeWater(entry)}>Excluir</button></div></>}</li>)}</ul>}</article>
    </section>

    <section className="daily-grid nutrition-direction-grid">
      <article className="calorie-card"><div className="card-topline"><span>Direção nutricional</span><small>Meta ativa</small></div><div className="calorie-display"><strong>{presentationRound(target.calorieTarget).toLocaleString('pt-BR')}</strong><span>kcal / dia</span></div><div className="target-macros"><span>Proteína <b>{presentationRound(target.macros.protein.grams)} g</b></span><span>Carboidratos <b>{presentationRound(target.macros.carbs.grams)} g</b></span><span>Gorduras <b>{presentationRound(target.macros.fat.grams)} g</b></span></div><p>Metas são referências configuráveis; o registro diário é opcional.</p></article>
      <article className="macro-card manual-summary-card"><div className="card-topline"><span>Resumo manual de hoje</span><small>{summary ? 'Registrado' : 'Opcional'}</small></div><div className="manual-summary-values"><Metric label="Calorias" value={summary?.caloriesKcal} unit="kcal"/><Metric label="Proteína" value={summary?.proteinG} unit="g"/><Metric label="Carboidratos" value={summary?.carbohydratesG} unit="g"/><Metric label="Gorduras" value={summary?.fatG} unit="g"/></div>{summary?.note&&<p className="summary-note">{summary.note}</p>}<button className="secondary-action summary-open-action" type="button" onClick={onNavigateDiary}>{summary?'Editar resumo':'Registrar resumo'} →</button></article>
    </section>

    <section className="diary-empty-card progress-cta"><div><span className="page-eyebrow">Progresso e check-in</span><h2>Acompanhe fatos ao longo do tempo.</h2><p>Peso, medidas, fotos, treino, hidratação e médias dos campos nutricionais realmente registrados.</p><button type="button" className="secondary-action" onClick={onNavigateProgress}>Abrir progresso →</button></div><span className="empty-day-mark" aria-hidden="true">↗</span></section>
  </div>;
}

function Metric({label,value,unit}:{label:string;value:number|undefined;unit:string}) { return <span><small>{label}</small><strong>{value===undefined?'Sem dado':`${value.toLocaleString('pt-BR')} ${unit}`}</strong></span>; }
function ProgressBar({value,target,label}:{value:number;target:number;label:string}) { const percentage=target>0?Math.min(100,value/target*100):0; return <div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={presentationRound(percentage)} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${percentage}%`}}/></div>; }
function goalLabel(goal:string){return goal==='fat-loss'?'Definição':goal==='weight-gain'?'Ganho':'Manutenção';}
function formatLiters(ml:number){return `${(ml/1000).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2})} L`;}
