import { useEffect, useState } from 'react';
import { GetTodayDashboardService, type TodayDashboard as DashboardData } from '../../application/dashboard/get-today-dashboard';
import { WaterService } from '../../application/hydration/water-service';
import { presentationRound } from '../../domain/nutrition';
import { formatLocalDate } from '../../domain/shared/local-date';
import type { WaterEntry } from '../../domain/hydration/hydration';
import { calculateHydrationPace, hydrationCheckpoints } from '../../domain/hydration/hydration';
import { repositories } from '../../infrastructure/repositories';
import { TrainingService, type TodayWorkout } from '../../application/training/training-service';
import { Button } from '../../shared/components/Button';
import './today-dashboard.css';

const dashboardService = new GetTodayDashboardService(
  repositories.profiles,
  repositories.nutritionTargets,
  repositories.diary,
  repositories.water,
);
const waterService = new WaterService(repositories.water);
const trainingService = new TrainingService(repositories.trainingProfiles, repositories.exercises, repositories.workoutPlans, repositories.workoutSessions);

interface TodayDashboardProps {
  profileId: string;
  revision: number;
  onNotice: (message: string) => void;
  onNavigateTraining: () => void;
}

export function TodayDashboard({ profileId, revision, onNotice, onNavigateTraining }: TodayDashboardProps) {
  const [data, setData] = useState<DashboardData>();
  const [error, setError] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [editingId, setEditingId] = useState<string>();
  const [editingAmount, setEditingAmount] = useState('');
  const [training, setTraining] = useState<TodayWorkout>();

  useEffect(() => {
    let active = true;
    dashboardService.execute(profileId)
      .then((result) => { if (active) setData(result); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o dia.'); });
    return () => { active = false; };
  }, [profileId, revision]);

  useEffect(() => {
    let active = true;
    trainingService.getToday(profileId).then((result) => { if (active) setTraining(result); }).catch(() => { if (active) setTraining(undefined); });
    return () => { active = false; };
  }, [profileId, revision]);

  function withWater(entries: WaterEntry[]): void {
    setData((current) => {
      if (!current) return current;
      const consumedMl = entries.reduce((sum, entry) => sum + entry.amountMl, 0);
      const routine = current.profile.hydrationRoutine ?? { wakeTime: '07:00', sleepTime: '23:00' };
      return { ...current, hydration: { ...current.hydration, entries, consumedMl, remainingMl: Math.max(0, current.hydration.targetMl - consumedMl), percentage: (consumedMl / current.hydration.targetMl) * 100, pace: calculateHydrationPace(current.hydration.targetMl, consumedMl, routine.wakeTime, routine.sleepTime, new Date()) } };
    });
  }

  async function addWater(amountMl: number) {
    if (!data) return;
    const previous = data.hydration.entries;
    const timestamp = new Date().toISOString();
    const optimistic: WaterEntry = { id: `optimistic-${timestamp}`, profileId, amountMl, occurredAt: timestamp, localDate: data.localDate, createdAt: timestamp, updatedAt: timestamp };
    withWater([optimistic, ...previous]);
    try {
      const saved = await waterService.log(profileId, amountMl);
      withWater([saved, ...previous]);
      setCustomAmount('');
      onNotice(`+${amountMl} ml registrado para ${data.profile.name}.`);
    } catch (caught) {
      withWater(previous);
      setError(caught instanceof Error ? caught.message : 'Não foi possível registrar a água.');
    }
  }

  async function updateWater(entry: WaterEntry) {
    const amount = Number(editingAmount);
    if (!data) return;
    const previous = data.hydration.entries;
    const optimistic = previous.map((item) => item.id === entry.id ? { ...item, amountMl: amount } : item);
    withWater(optimistic);
    setEditingId(undefined);
    try {
      const saved = await waterService.update(entry, amount);
      withWater(optimistic.map((item) => item.id === saved.id ? saved : item));
      onNotice('Registro de água atualizado.');
    } catch (caught) {
      withWater(previous);
      setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar o registro.');
    }
  }

  async function removeWater(entry: WaterEntry) {
    if (!data) return;
    const previous = data.hydration.entries;
    withWater(previous.filter((item) => item.id !== entry.id));
    try {
      await waterService.remove(entry.id);
      onNotice('Registro de água removido.');
    } catch {
      withWater(previous);
      setError('Não foi possível remover o registro.');
    }
  }

  if (error) return <div className="page-state error-state" role="alert"><strong>Algo saiu do ritmo.</strong><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></div>;
  if (!data || data.profile.id !== profileId) return <DashboardSkeleton />;

  const target = data.nutritionTarget.result;
  const calorieExceeded = data.consumedCalories > target.calorieTarget;
  return (
    <div className="today-page">
      <header className="today-header">
        <div><span className="page-eyebrow">Hoje · {formatLocalDate(new Date())}</span><h1>Olá, {data.profile.name}.</h1><p>Este é o seu ritmo de hoje, sem dados inventados.</p></div>
        <div className="today-profile-chip"><span>{data.profile.currentWeightKg.toLocaleString('pt-BR')} kg</span><small>{goalLabel(data.profile.goal)}</small></div>
      </header>

      <section className="daily-grid">
        <article className="calorie-card">
          <div className="card-topline"><span>Energia diária</span><small>Meta ativa</small></div>
          <div className="calorie-display"><strong>{presentationRound(data.consumedCalories).toLocaleString('pt-BR')}</strong><span>/ {presentationRound(target.calorieTarget).toLocaleString('pt-BR')} kcal</span></div>
          <ProgressBar value={data.consumedCalories} target={target.calorieTarget} label="Progresso de calorias" />
          <p className={calorieExceeded ? 'over-target' : ''}>{calorieExceeded ? `+${presentationRound(data.consumedCalories - target.calorieTarget)} kcal acima da meta` : `${presentationRound(data.remainingCalories).toLocaleString('pt-BR')} kcal restantes`}</p>
        </article>

        <article className="macro-card">
          <div className="card-topline"><span>Macronutrientes</span><small>Consumido / meta</small></div>
          <MacroProgress label="Proteína" consumed={data.macros.protein.consumed} target={data.macros.protein.target} color="protein" />
          <MacroProgress label="Carboidratos" consumed={data.macros.carbs.consumed} target={data.macros.carbs.target} color="carbs" />
          <MacroProgress label="Gorduras" consumed={data.macros.fat.consumed} target={data.macros.fat.target} color="fat" />
        </article>
      </section>

      {(training?.template || training?.activeSession) && <section className="today-workout-card">
        <div><span className="page-eyebrow">Treino de hoje</span><h2>{training.activeSession?.templateName ?? training.template?.name}</h2><p>{training.activeSession ? 'Há uma sessão em andamento e salva neste dispositivo.' : `${training.template?.focus} · ${training.template?.exercises.length ?? 0} exercícios · ~${training.template?.approximateMinutes ?? 0} min`}</p></div>
        <Button className="today-workout-action" type="button" onClick={onNavigateTraining}>{training.activeSession ? 'Continuar treino' : 'Iniciar treino'} <span aria-hidden="true">↗</span></Button>
      </section>}

      <section className="lower-grid">
        <article className="water-card">
          <div className="water-card-header"><div><span className="page-eyebrow">Hidratação</span><h2>{formatLiters(data.hydration.consumedMl)} <small>/ {formatLiters(data.hydration.targetMl)}</small></h2></div><div className="water-percent"><strong>{Math.min(999, presentationRound(data.hydration.percentage))}%</strong><small>da meta</small></div></div>
          <ProgressBar value={data.hydration.consumedMl} target={data.hydration.targetMl} label="Progresso da hidratação" />
          <div className={`hydration-pace ${data.hydration.pace.state}`}><strong>Ritmo de hoje</strong><span>Esperado até agora: ~{formatLiters(data.hydration.pace.expectedMl)}</span><p>{paceMessage(data.hydration.pace.state)}</p></div>
          {data.profile.hydrationRoutine?.pacingMode === 'checkpoints' && <div className="hydration-checkpoints">{hydrationCheckpoints(data.hydration.targetMl).map((point) => <span key={point.label}><small>{point.label}</small><strong>{formatLiters(point.targetMl)}</strong></span>)}</div>}
          <div className="water-actions" aria-label="Registrar água">{[200, 300, 500].map((amount) => <button key={amount} type="button" onClick={() => addWater(amount)}>+ {amount} ml</button>)}</div>
          <form className="custom-water" onSubmit={(event) => { event.preventDefault(); void addWater(Number(customAmount)); }}><label htmlFor="custom-water">Outro valor</label><div><input id="custom-water" type="number" min="1" max="10000" inputMode="numeric" placeholder="450" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} /><span>ml</span><button type="submit" disabled={!customAmount}>Registrar</button></div></form>
          <p className="water-estimate-note">Meta configurada para {data.profile.hydrationConfiguration.mode === 'weight-based' ? `${data.profile.hydrationConfiguration.mlPerKg} ml/kg` : 'valor personalizado'}.</p>
        </article>

        <article className="water-history-card">
          <div className="card-topline"><span>Registros de hoje</span><small>{data.hydration.entries.length} {data.hydration.entries.length === 1 ? 'entrada' : 'entradas'}</small></div>
          {data.hydration.entries.length === 0 ? <div className="water-empty"><span aria-hidden="true">≈</span><strong>Seu copo começa vazio.</strong><p>Registre a primeira água do dia para acompanhar seu progresso.</p></div> : <ul className="water-history-list">{data.hydration.entries.map((entry) => <li key={entry.id}>
            <time dateTime={entry.occurredAt}>{new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(entry.occurredAt))}</time>
            {editingId === entry.id ? <form onSubmit={(event) => { event.preventDefault(); void updateWater(entry); }}><input aria-label="Nova quantidade em mililitros" type="number" min="1" max="10000" value={editingAmount} onChange={(event) => setEditingAmount(event.target.value)} /><button type="submit">Salvar</button><button type="button" onClick={() => setEditingId(undefined)}>Cancelar</button></form> : <><strong>+ {entry.amountMl.toLocaleString('pt-BR')} ml</strong><div><button type="button" onClick={() => { setEditingId(entry.id); setEditingAmount(String(entry.amountMl)); }}>Editar</button><button type="button" onClick={() => void removeWater(entry)}>Excluir</button></div></>}
          </li>)}</ul>}
        </article>
      </section>

      <section className="diary-empty-card"><div><span className="page-eyebrow">Refeições de hoje</span><h2>{data.meals.some((meal) => meal.itemCount) ? 'Seu dia, refeição por refeição.' : 'Seu diário está vazio hoje.'}</h2>{data.meals.some((meal) => meal.itemCount) ? <ul className="dashboard-meal-list">{data.meals.map((meal) => <li key={meal.id}><span>{meal.name}</span><strong>{meal.itemCount ? `${presentationRound(meal.caloriesKcal)} kcal` : '—'}</strong></li>)}</ul> : <p>Quando você registrar sua primeira refeição, calorias e macros aparecerão aqui automaticamente.</p>}</div><span className="empty-day-mark" aria-hidden="true">{String(data.meals.reduce((sum, meal) => sum + meal.itemCount, 0)).padStart(2, '0')}</span></section>
    </div>
  );
}

function DashboardSkeleton() {
  return <div className="dashboard-skeleton" aria-label="Carregando o dia"><span /><span /><span /></div>;
}

function ProgressBar({ value, target, label }: { value: number; target: number; label: string }) {
  const percentage = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return <div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={presentationRound(percentage)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percentage}%` }} /></div>;
}

function MacroProgress({ label, consumed, target, color }: { label: string; consumed: number; target: number; color: string }) {
  const exceeded = consumed > target;
  return <div className="macro-progress"><div><span className={`macro-indicator ${color}`} /><strong>{label}</strong><b>{presentationRound(consumed)} <small>/ {presentationRound(target)} g</small></b></div><ProgressBar value={consumed} target={target} label={`${label}: ${presentationRound(consumed)} de ${presentationRound(target)} gramas`} />{exceeded && <small className="macro-over">+{presentationRound(consumed - target)} g acima</small>}</div>;
}

function goalLabel(goal: string): string {
  return goal === 'fat-loss' ? 'Definição' : goal === 'weight-gain' ? 'Ganho' : 'Manutenção';
}

function formatLiters(ml: number): string {
  return `${(ml / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} L`;
}

function paceMessage(state: DashboardData['hydration']['pace']['state']): string {
  return state === 'target-reached' ? 'Meta atingida.' : state === 'well-below' ? 'Você está bem abaixo do ritmo planejado.' : state === 'slightly-below' ? 'Você está um pouco abaixo do ritmo.' : state === 'above-pace' ? 'Você está acima do ritmo planejado.' : state === 'outside-window' ? 'Fora da janela habitual de hidratação.' : 'Você está dentro do ritmo.';
}
