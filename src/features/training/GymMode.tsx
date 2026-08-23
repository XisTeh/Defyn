import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TrainingService } from '../../application/training/training-service';
import { suggestDoubleProgression } from '../../domain/training/progression';
import { EQUIPMENT_LABELS, MUSCLE_LABELS, remainingRestSeconds, sessionVolume, type Exercise, type WorkoutSession, type WorkoutSetLog } from '../../domain/training/training';
import { detectNewRecords, formatSet } from '../../domain/training/workout-records';
import { repositories } from '../../infrastructure/repositories';
import { browserCapabilities, parseLocalizedNumber } from '../../platform/device-capabilities';
import { requestNotificationOptIn, requestScreenWakeLock, type WakeLockSentinelLike } from '../../platform/training-device';
import { Button } from '../../shared/components/Button';
import { useAccessibleDialog } from '../../shared/hooks/use-accessible-dialog';
import { useDocumentScrollLock } from '../../shared/hooks/use-document-scroll-lock';
import { ExerciseIllustration } from './ExerciseIllustration';
import './gym-mode.css';

const service = new TrainingService(repositories.trainingProfiles, repositories.exercises, repositories.workoutPlans, repositories.workoutSessions);
type Draft = { load: string; reps: string; seconds: string };

interface GymModeProps {
  profileId: string;
  session: WorkoutSession;
  exercises: Exercise[];
  onChanged: () => void;
  onFinished: (message: string) => void;
  onNotice: (message: string) => void;
}

export function GymMode({ profileId, session, exercises, onChanged, onFinished, onNotice }: GymModeProps) {
  useDocumentScrollLock();
  const capabilities = useMemo(() => browserCapabilities(), []);
  const wakeLockRef = useRef<WakeLockSentinelLike | undefined>(undefined);
  const previousRest = useRef(remainingRestSeconds(session.restEndsAt));
  const [current, setCurrent] = useState(session.currentExerciseIndex);
  const [logs, setLogs] = useState<WorkoutSetLog[]>([]);
  const [last, setLast] = useState<WorkoutSetLog[]>([]);
  const [history, setHistory] = useState<WorkoutSetLog[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [editing, setEditing] = useState<number>();
  const [rest, setRest] = useState(() => remainingRestSeconds(session.restEndsAt));
  const [restFinished, setRestFinished] = useState(false);
  const [substituting, setSubstituting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [finishConfirm, setFinishConfirm] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [completedSession, setCompletedSession] = useState<WorkoutSession>();
  const [busy, setBusy] = useState(false);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [recordMessage, setRecordMessage] = useState('');
  const exercise = (session.exercises[current] ?? session.exercises[0])!;
  const catalogExercise = exercises.find((item) => item.id === exercise?.exerciseId);

  const load = useCallback(async () => {
    if (!exercise) return;
    const [nextLogs, previous, allHistory] = await Promise.all([
      repositories.workoutSessions.listSetLogs(profileId, session.id),
      service.lastExerciseLogs(profileId, exercise.exerciseId, session.id),
      repositories.workoutSessions.listExerciseLogs(profileId, exercise.exerciseId),
    ]);
    setLogs(nextLogs); setLast(previous); setHistory(allHistory.filter((item) => item.sessionId !== session.id && item.completed));
    setDrafts(Object.fromEntries(Array.from({ length: exercise.workingSets }, (_, index) => {
      const existing = nextLogs.find((item) => item.exerciseId === exercise.exerciseId && item.setIndex === index);
      const prior = previous.find((item) => item.setIndex === index) ?? previous[0];
      return [index, {
        load: existing?.actualLoad?.toString() ?? prior?.actualLoad?.toString() ?? exercise.targetLoad?.toString() ?? '',
        reps: existing?.actualReps?.toString() ?? prior?.actualReps?.toString() ?? '',
        seconds: existing?.durationSeconds?.toString() ?? prior?.durationSeconds?.toString() ?? '',
      }];
    })));
  }, [exercise, profileId, session.id]);

  useEffect(() => { document.documentElement.classList.add('gym-mode-active'); return () => document.documentElement.classList.remove('gym-mode-active'); }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  useEffect(() => {
    const update = () => {
      const next = remainingRestSeconds(session.restEndsAt);
      if (previousRest.current > 0 && next === 0) {
        setRestFinished(true);
        if ('vibrate' in navigator) navigator.vibrate?.([120, 80, 120]);
        if (notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification('Descanso concluído', { body: 'Pronto para a próxima série.', icon: '/pwa-192.png', tag: `defyn-rest-${session.id}` });
      }
      previousRest.current = next; setRest(next);
    };
    update(); const timer = window.setInterval(update, 1000); return () => window.clearInterval(timer);
  }, [notificationsEnabled, session.id, session.restEndsAt]);
  useEffect(() => {
    if (!wakeLockEnabled) return;
    const reacquire = async () => {
      if (document.visibilityState !== 'visible' || (wakeLockRef.current && !wakeLockRef.current.released)) return;
      try { wakeLockRef.current = await requestScreenWakeLock(navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } }); } catch { /* browser controls availability */ }
    };
    void reacquire(); document.addEventListener('visibilitychange', reacquire);
    return () => { document.removeEventListener('visibilitychange', reacquire); void wakeLockRef.current?.release(); wakeLockRef.current = undefined; };
  }, [wakeLockEnabled]);

  if (completedSession) return <WorkoutSummary profileId={profileId} session={completedSession} exercises={exercises} onClose={() => onFinished('Treino concluído e salvo no histórico.')} />;
  if (!exercise) return <div className="gym-mode gym-empty"><strong>Esta ficha ainda não possui exercícios.</strong><Button onClick={() => setCancelConfirm(true)}>Encerrar sessão</Button></div>;

  const currentLogs = logs.filter((item) => item.exerciseId === exercise.exerciseId);
  const completedLogs = currentLogs.filter((item) => item.completed).sort((a, b) => a.setIndex - b.setIndex);
  const nextSetIndex = Array.from({ length: exercise.workingSets }, (_, index) => index).find((index) => !completedLogs.some((item) => item.setIndex === index));
  const activeSetIndex = editing ?? nextSetIndex;
  const draft = activeSetIndex === undefined ? undefined : drafts[activeSetIndex] ?? { load: '', reps: '', seconds: '' };
  const nextExercise = session.exercises[current + 1];
  const alternatives = exercises.filter((item) => item.id !== exercise.exerciseId && item.primaryMuscle === exercise.primaryMuscle && item.movementPattern === (catalogExercise?.movementPattern ?? item.movementPattern)).slice(0, 8);
  const sessionCompletedSets = logs.filter((item) => item.completed).length;
  const sessionPlannedSets = session.exercises.reduce((sum, item) => sum + item.workingSets, 0);

  function updateDraft(index: number, change: Partial<Draft>) { setDrafts((currentDrafts) => ({ ...currentDrafts, [index]: { ...(currentDrafts[index] ?? { load: '', reps: '', seconds: '' }), ...change } })); }
  function parseDraft(value: Draft) {
    return {
      actualLoad: exercise.loadUnit === 'none' || !value.load ? undefined : parseLocalizedNumber(value.load),
      actualReps: exercise.metric === 'reps' ? parseLocalizedNumber(value.reps) : undefined,
      durationSeconds: exercise.metric === 'seconds' ? parseLocalizedNumber(value.seconds) : undefined,
    };
  }
  function valid(value: Draft) { const parsed = parseDraft(value); return !((value.load && parsed.actualLoad === undefined) || (exercise.metric === 'reps' && parsed.actualReps === undefined) || (exercise.metric === 'seconds' && parsed.durationSeconds === undefined)); }
  async function persistDraft(index: number) {
    const value = drafts[index]; if (!value || !valid(value)) return;
    const parsed = parseDraft(value); await service.logSet(profileId, session.id, exercise.exerciseId, index, { ...parsed, completed: false }); onChanged();
  }
  async function completeSet(index: number) {
    const value = drafts[index] ?? { load: '', reps: '', seconds: '' };
    if (!valid(value)) { onNotice('Confira a série. Use números positivos; vírgula decimal é aceita.'); return; }
    setBusy(true); setRestFinished(false);
    try {
      const result = await service.logSet(profileId, session.id, exercise.exerciseId, index, { ...parseDraft(value), completed: true });
      const records = detectNewRecords(result.log, history);
      const labels = [records.maximumLoad && 'maior carga', records.repetitionsAtLoad && 'mais repetições nesta carga', records.setVolume && 'maior volume de série'].filter(Boolean);
      if (labels.length) { setRecordMessage(`Novo recorde: ${labels.join(' · ')}`); window.setTimeout(() => setRecordMessage(''), 4200); }
      setEditing(undefined); await load(); onChanged();
    } finally { setBusy(false); }
  }
  async function undo(log: WorkoutSetLog) { setBusy(true); try { await service.removeSet(profileId, session.id, log.id); setEditing(log.setIndex); await load(); onChanged(); onNotice(`Série ${log.setIndex + 1} desfeita. Os valores continuam disponíveis para correção.`); } finally { setBusy(false); } }
  async function goToExercise(index: number) { const next = Math.max(0, Math.min(session.exercises.length - 1, index)); await service.updateSession({ ...session, currentExerciseIndex: next, restEndsAt: undefined }); setCurrent(next); setEditing(undefined); setRestFinished(false); onChanged(); }
  async function adjustRest(seconds: number | undefined) { await service.updateSession({ ...session, restEndsAt: seconds === undefined ? undefined : new Date(Date.now() + seconds * 1000).toISOString() }); setRestFinished(false); onChanged(); }
  async function enableWakeLock() { try { const sentinel = await requestScreenWakeLock(navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } }); if (sentinel) { wakeLockRef.current = sentinel; setWakeLockEnabled(true); onNotice('Tela ativa durante esta sessão.'); } } catch { onNotice('O navegador não permitiu manter a tela ativa.'); } }
  async function enableNotifications() { const permission = await requestNotificationOptIn(capabilities.notifications && typeof Notification !== 'undefined' ? Notification : undefined); if (permission === 'granted') { setNotificationsEnabled(true); onNotice('Alerta de descanso ativado nesta sessão.'); } else if (permission === 'denied') onNotice('Notificações bloqueadas nas permissões do navegador.'); }
  async function finish() { setBusy(true); try { const completed = await service.finish(profileId, session.id); setFinishConfirm(false); setCompletedSession(completed); } finally { setBusy(false); } }
  async function cancel() { setBusy(true); try { await service.cancel(profileId, session.id); onFinished('Sessão cancelada. As séries registradas foram preservadas, mas ela não conta como treino concluído.'); } finally { setBusy(false); } }
  async function moveCurrent(delta: number) { const nextIndex = Math.max(0, Math.min(session.exercises.length - 1, current + delta)); if (nextIndex === current) return; const next = await service.reorderSessionExercises(profileId, session.id, current, nextIndex); setCurrent(next.currentExerciseIndex); onChanged(); onNotice('Ordem alterada somente para esta sessão.'); }

  return <div className="gym-mode" data-session-id={session.id}>
    <header className="gym-topbar">
      <div className="gym-progress-copy"><span>{session.templateName}</span><strong>Exercício {current + 1} de {session.exercises.length}</strong></div>
      <div className="gym-progress-track" role="progressbar" aria-label="Progresso do treino" aria-valuemin={0} aria-valuemax={sessionPlannedSets} aria-valuenow={sessionCompletedSets}><i style={{ width: `${sessionPlannedSets ? sessionCompletedSets / sessionPlannedSets * 100 : 0}%` }} /></div>
      <button className="gym-menu-button" type="button" onClick={() => setSettingsOpen(true)} aria-label="Opções da sessão"><span aria-hidden="true">⋯</span></button>
    </header>

    {(rest > 0 || restFinished) && <aside className={`gym-rest ${restFinished ? 'finished' : ''}`} role={rest > 0 ? 'timer' : 'status'} aria-live="polite">
      <div><span>{restFinished ? 'Descanso concluído' : 'Descanso'}</span><strong>{restFinished ? 'PRONTO' : `${String(Math.floor(rest / 60)).padStart(2, '0')}:${String(rest % 60).padStart(2, '0')}`}</strong><small>{restFinished ? 'Volte quando estiver pronto.' : `Próxima série: ${exercise.name}. O horário corrige a contagem em segundo plano.`}</small></div>
      <div>{rest > 0 && <button onClick={() => void adjustRest(rest + 30)}>+30s</button>}<button onClick={() => void adjustRest(undefined)}>{restFinished ? 'Fechar' : 'Pular'}</button></div>
    </aside>}
    {recordMessage && <div className="gym-record-toast" role="status">◆ {recordMessage}</div>}

    <main className="gym-exercise-card">
      <button className="gym-exercise-hero" type="button" onClick={() => setDetailsOpen(true)} aria-label={`Ver execução de ${exercise.name}`}>
        <ExerciseIllustration exercise={catalogExercise} large />
        <span><small>{MUSCLE_LABELS[exercise.primaryMuscle]}</small><strong>{exercise.name}</strong><em>{catalogExercise?.instructions[0] ?? 'Execute de forma controlada e segura.'}</em></span><b aria-hidden="true">↗</b>
      </button>

      <section className="gym-last-time" aria-label="Último treino deste exercício"><span>Última vez</span>{last.length ? <div>{last.map((item) => <strong key={item.id}>{formatSet(item)}</strong>)}</div> : <p>Primeiro registro deste exercício.</p>}</section>

      {activeSetIndex !== undefined && draft && <section className="gym-active-set">
        <header><div><span>{editing !== undefined ? 'Corrigir série' : 'Série atual'}</span><h2>Série {activeSetIndex + 1} <small>de {exercise.workingSets}</small></h2></div><p>Alvo: {exercise.target.minimum}{exercise.target.maximum !== exercise.target.minimum ? `–${exercise.target.maximum}` : ''} {exercise.metric === 'seconds' ? 'segundos' : 'repetições'}</p></header>
        <div className={`gym-set-inputs ${exercise.loadUnit === 'none' ? 'single' : ''}`}>
          {exercise.loadUnit !== 'none' && <label><span>Carga ({exercise.loadUnit})</span><input aria-label={`Carga da série ${activeSetIndex + 1}`} inputMode="decimal" enterKeyHint="next" value={draft.load} onChange={(event) => updateDraft(activeSetIndex, { load: event.target.value })} onBlur={() => void persistDraft(activeSetIndex)} /></label>}
          <label><span>{exercise.metric === 'seconds' ? 'Segundos' : 'Repetições'}</span><input aria-label={`${exercise.metric === 'seconds' ? 'Segundos' : 'Repetições'} da série ${activeSetIndex + 1}`} inputMode={exercise.metric === 'seconds' ? 'decimal' : 'numeric'} enterKeyHint="done" value={exercise.metric === 'seconds' ? draft.seconds : draft.reps} onChange={(event) => updateDraft(activeSetIndex, { [exercise.metric === 'seconds' ? 'seconds' : 'reps']: event.target.value })} onBlur={() => void persistDraft(activeSetIndex)} /></label>
        </div>
        <Button className="gym-complete-set" loading={busy} disabled={exercise.metric === 'reps' ? !draft.reps : !draft.seconds} onClick={() => void completeSet(activeSetIndex)}>{editing !== undefined ? 'Salvar correção' : 'Concluir série'} <span aria-hidden="true">✓</span></Button>
        {editing !== undefined && <button className="gym-cancel-edit" type="button" onClick={() => setEditing(undefined)}>Cancelar edição</button>}
      </section>}

      {activeSetIndex === undefined && <section className="gym-exercise-complete"><span aria-hidden="true">✓</span><div><strong>Exercício concluído</strong><p>Todas as séries planejadas foram registradas.</p></div></section>}

      {completedLogs.length > 0 && <section className="gym-completed-sets"><header><span>Séries concluídas</span><small>Toque em editar para corrigir sem perder o restante.</small></header>{completedLogs.map((item) => <article key={item.id}><b>{item.setIndex + 1}</b><strong>{formatSet(item)}</strong><div><button type="button" onClick={() => setEditing(item.setIndex)}>Editar</button><button type="button" onClick={() => void undo(item)}>Desfazer</button></div></article>)}</section>}

      <details className="gym-session-note"><summary>Adicionar nota da sessão</summary><textarea defaultValue={session.notes ?? ''} placeholder="Opcional, ex.: aparelho ocupado." onBlur={async (event) => { await service.updateSession({ ...session, notes: event.target.value.trim() || undefined }); onChanged(); }} /></details>

      {nextExercise && <aside className="gym-next-preview"><ExerciseIllustration exercise={exercises.find((item) => item.id === nextExercise.exerciseId)} /><div><span>Próximo exercício</span><strong>{nextExercise.name}</strong><small>{nextExercise.workingSets} séries · {nextExercise.restSeconds}s</small></div></aside>}
      <div className="gym-secondary-actions"><Button variant="secondary" compact onClick={async () => { const next = await service.skipExercise(profileId, session.id, exercise.exerciseId); setCurrent(next.currentExerciseIndex); onChanged(); }}>Pular hoje</Button><Button variant="secondary" compact onClick={() => setSubstituting(true)}>Substituir hoje</Button></div>
    </main>

    <footer className="gym-bottom-nav"><button type="button" disabled={current === 0} onClick={() => void goToExercise(current - 1)}>← <span>Anterior</span></button><strong>{current + 1}/{session.exercises.length}</strong><button type="button" className="primary" disabled={busy} onClick={() => current === session.exercises.length - 1 ? setFinishConfirm(true) : void goToExercise(current + 1)}>{current === session.exercises.length - 1 ? 'Finalizar treino' : 'Próximo'} <span aria-hidden="true">→</span></button></footer>

    {detailsOpen && <Modal title={exercise.name} eyebrow={MUSCLE_LABELS[exercise.primaryMuscle]} onClose={() => setDetailsOpen(false)}><div className="gym-exercise-detail"><ExerciseIllustration exercise={catalogExercise} large /><p>{exercise.equipment.map((item) => EQUIPMENT_LABELS[item]).join(' · ')}</p><ol>{catalogExercise?.instructions.map((instruction) => <li key={instruction}>{instruction}</li>) ?? <li>Execute de forma controlada e ajuste à sua realidade.</li>}</ol>{exercise.notes && <aside>{exercise.notes}</aside>}</div></Modal>}
    {substituting && <Modal title="Substituir só hoje" eyebrow="Sua ficha não será alterada" onClose={() => setSubstituting(false)}><div className="gym-replacement-list">{alternatives.length ? alternatives.map((item) => <button key={item.id} onClick={async () => { await service.substituteForToday(profileId, session.id, exercise.exerciseId, item.id); setSubstituting(false); onChanged(); }}><ExerciseIllustration exercise={item} /><span><strong>{item.name}</strong><small>{item.equipment.map((value) => EQUIPMENT_LABELS[value]).join(', ')}</small></span><b>→</b></button>) : <p>Nenhuma alternativa equivalente foi encontrada.</p>}</div></Modal>}
    {settingsOpen && <Modal title="Opções da sessão" eyebrow="Preferências só deste treino" onClose={() => setSettingsOpen(false)}><div className="gym-settings">
      {capabilities.wakeLock && <button type="button" className={wakeLockEnabled ? 'active' : ''} onClick={() => wakeLockEnabled ? setWakeLockEnabled(false) : void enableWakeLock()}><span>Manter tela ativa</span><b>{wakeLockEnabled ? 'Ativo' : 'Ativar'}</b></button>}
      {capabilities.notifications && <button type="button" className={notificationsEnabled ? 'active' : ''} onClick={() => !notificationsEnabled && void enableNotifications()}><span>Alerta ao fim do descanso</span><b>{notificationsEnabled ? 'Ativo' : 'Ativar'}</b></button>}
      <div className="gym-order-controls"><span>Ordem temporária deste exercício</span><button disabled={current === 0} onClick={() => void moveCurrent(-1)}>Mover antes</button><button disabled={current === session.exercises.length - 1} onClick={() => void moveCurrent(1)}>Mover depois</button></div>
      <Button variant="secondary" onClick={() => { setSettingsOpen(false); setFinishConfirm(true); }}>Finalizar treino</Button>
      <button className="gym-danger-action" type="button" onClick={() => { setSettingsOpen(false); setCancelConfirm(true); }}>Cancelar sessão</button>
    </div></Modal>}
    {finishConfirm && <Confirm title="Finalizar treino?" message={`${sessionCompletedSets} de ${sessionPlannedSets} séries estão concluídas. O resumo será salvo no histórico.`} confirm="Finalizar e ver resumo" busy={busy} onCancel={() => setFinishConfirm(false)} onConfirm={() => void finish()} />}
    {cancelConfirm && <Confirm danger title="Cancelar esta sessão?" message="As séries já registradas serão preservadas, mas a sessão não contará como treino concluído." confirm="Cancelar sessão" busy={busy} onCancel={() => setCancelConfirm(false)} onConfirm={() => void cancel()} />}
  </div>;
}

function WorkoutSummary({ profileId, session, exercises, onClose }: { profileId: string; session: WorkoutSession; exercises: Exercise[]; onClose: () => void }) {
  const [logs, setLogs] = useState<WorkoutSetLog[]>([]); const [previousLogs, setPreviousLogs] = useState<WorkoutSetLog[]>([]);
  useEffect(() => { let active = true; Promise.all([repositories.workoutSessions.listSetLogs(profileId, session.id), repositories.workoutSessions.list(profileId)]).then(async ([current, sessions]) => { const previous = sessions.filter((item) => item.status === 'completed' && item.templateId === session.templateId && item.id !== session.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]; const prior = previous ? await repositories.workoutSessions.listSetLogs(profileId, previous.id) : []; if (active) { setLogs(current); setPreviousLogs(prior); } }); return () => { active = false; }; }, [profileId, session.id, session.templateId]);
  const completed = logs.filter((item) => item.completed); const volumeKg = sessionVolume(completed.filter((item) => item.loadUnit === 'kg')); const volumeLb = sessionVolume(completed.filter((item) => item.loadUnit === 'lb')); const primaryUnit: 'kg' | 'lb' = completed.some((item) => item.loadUnit === 'lb') && !completed.some((item) => item.loadUnit === 'kg') ? 'lb' : 'kg'; const volume = primaryUnit === 'kg' ? volumeKg : volumeLb; const previousVolume = sessionVolume(previousLogs.filter((item) => item.loadUnit === primaryUnit)); const minutes = durationMinutes(session);
  const volumeLabel = [volumeKg > 0 && `${Math.round(volumeKg).toLocaleString('pt-BR')} kg`, volumeLb > 0 && `${Math.round(volumeLb).toLocaleString('pt-BR')} lb`].filter(Boolean).join(' · ') || '—';
  return <div className="gym-mode gym-summary"><header><span>Treino concluído</span><h1>{session.templateName}</h1><p>Salvo neste dispositivo e incluído no seu histórico.</p></header><section className="gym-summary-metrics"><article><span>Duração</span><strong>{minutes} min</strong></article><article><span>Séries</span><strong>{completed.length}</strong></article><article><span>Volume</span><strong>{volumeLabel}</strong></article><article><span>Comparação ({primaryUnit})</span><strong>{previousVolume ? `${volume >= previousVolume ? '+' : ''}${Math.round((volume - previousVolume) / previousVolume * 100)}%` : 'Primeiro'}</strong></article></section><section className="gym-summary-exercises">{session.exercises.map((exercise) => { const exerciseLogs = completed.filter((item) => item.exerciseId === exercise.exerciseId); const suggestion = exerciseLogs.length ? suggestDoubleProgression(exercise, exerciseLogs) : undefined; return <article key={exercise.prescriptionId} className={session.skippedExerciseIds.includes(exercise.exerciseId) ? 'skipped' : ''}><ExerciseIllustration exercise={exercises.find((item) => item.id === exercise.exerciseId)} /><div><strong>{exercise.name}</strong><p>{exerciseLogs.length ? exerciseLogs.map(formatSet).join(' · ') : session.skippedExerciseIds.includes(exercise.exerciseId) ? 'Pulado nesta sessão' : 'Sem séries concluídas'}</p>{suggestion && <small>{suggestion.message}</small>}</div></article>; })}</section>{session.notes && <aside className="gym-summary-note"><span>Nota da sessão</span><p>{session.notes}</p></aside>}<Button className="gym-summary-close" onClick={onClose}>Voltar para Hoje</Button></div>;
}

function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useAccessibleDialog(dialogRef, onClose, closeRef);
  return <div className="gym-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} className="gym-modal" role="dialog" aria-modal="true" aria-label={title}><header><div><span>{eyebrow}</span><h2>{title}</h2></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar">×</button></header>{children}</section></div>;
}
function Confirm({ title, message, confirm, danger = false, busy, onCancel, onConfirm }: { title: string; message: string; confirm: string; danger?: boolean; busy: boolean; onCancel: () => void; onConfirm: () => void }) { return <Modal title={title} eyebrow="Confirmação" onClose={onCancel}><div className="gym-confirm"><p>{message}</p><div><Button variant="secondary" onClick={onCancel}>Voltar</Button><Button className={danger ? 'danger' : ''} loading={busy} onClick={onConfirm}>{confirm}</Button></div></div></Modal>; }
function durationMinutes(session: WorkoutSession) { const end = session.completedAt ? new Date(session.completedAt).getTime() : Date.now(); return Math.max(1, Math.round((end - new Date(session.startedAt).getTime()) / 60000)); }
