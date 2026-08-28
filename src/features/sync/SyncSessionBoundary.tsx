import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DefynSupabaseClient } from '../../infrastructure/supabase/client';
import { SupabaseSyncGateway } from '../../infrastructure/supabase/supabase-sync-gateway';
import { IndexedDbSyncStore, type BootstrapSummary } from '../../infrastructure/sync/indexed-db-sync-store';
import { defynDatabase } from '../../infrastructure/indexed-db/database';
import { SyncEngine } from '../../application/sync/sync-engine';
import type { SyncConflict, SyncStatusSnapshot } from '../../application/sync/sync-contract';
import { Button } from '../../shared/components/Button';
import { SyncContext, syncLabel, type SyncContextValue } from './sync-status-context';
import './sync-status.css';
import { MEDIA_NEEDED_EVENT } from '../../application/media/media-events';
import { decideInitialSync } from '../../application/sync/initial-sync-policy';
import { SupabaseRealtimeWakeUp } from '../../infrastructure/supabase/supabase-realtime-wakeup';

type BootstrapState =
  | { kind: 'loading'; message: string }
  | { kind: 'needs-confirmation'; summary: BootstrapSummary }
  | { kind: 'needs-first-connection' }
  | { kind: 'ready'; enabled: boolean }
  | { kind: 'error'; message: string };

export function SyncSessionBoundary({ accountId, email, client, onSignOut, children }: { accountId: string; email?: string; client: DefynSupabaseClient; onSignOut: () => Promise<void>; children: ReactNode }) {
  const store = useMemo(() => new IndexedDbSyncStore(defynDatabase), []);
  const mediaCache = useMemo(() => import('../../infrastructure/sync/media-cache-coordinator').then(({ MediaCacheCoordinator }) => new MediaCacheCoordinator(defynDatabase, client)), [client]);
  const engine = useMemo(() => new SyncEngine(store, new SupabaseSyncGateway(client, (id) => defynDatabase.media.get(id))), [client, store]);
  const [bootstrap, setBootstrap] = useState<BootstrapState>({ kind: 'loading', message: 'Preparando seus dados neste dispositivo…' });
  const [status, setStatus] = useState<SyncStatusSnapshot>({ state: navigator.onLine ? 'idle' : 'offline', pendingCount: 0, conflictCount: 0 });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const running = useRef<Promise<void> | undefined>(undefined);
  const mutationTimer = useRef<number | undefined>(undefined);
  const channel = useRef<BroadcastChannel | undefined>(undefined);
  const realtimeWakeUp = useRef<{ accountId: string; client: DefynSupabaseClient; instance: SupabaseRealtimeWakeUp } | undefined>(undefined);

  const refreshStatus = useCallback(async (state?: SyncStatusSnapshot['state'], message?: string) => {
    const local = await store.status(accountId);
    setStatus({ ...local, state: state ?? (navigator.onLine ? (local.conflictCount ? 'conflict' : 'idle') : 'offline'), message });
    setConflicts(await store.listConflicts(accountId));
  }, [accountId, store]);

  const runSync = useCallback(async (force = false, announce = true) => {
    if (!navigator.onLine) { await refreshStatus('offline', 'Seus dados continuam salvos neste dispositivo.'); return; }
    if (running.current) return running.current;
    const execute = async () => {
      setStatus((current) => ({ ...current, state: 'syncing', message: undefined }));
      try {
        if (force) await store.retryNow(accountId);
        const run = async () => { await engine.run(accountId); await (await mediaCache).downloadAvatars(accountId); };
        if (navigator.locks) {
          await navigator.locks.request('defyn-sync-engine', { mode: 'exclusive', ifAvailable: true }, async (lock) => { if (lock) await run(); });
        } else await run();
        await refreshStatus();
        window.dispatchEvent(new Event('defyn:remote-applied'));
        void mediaCache.then((cache) => cache.downloadRecentPhotos(accountId)).catch(() => undefined);
        if (announce) channel.current?.postMessage({ type: 'sync-complete', accountId });
      } catch {
        await refreshStatus('error', 'Seus dados continuam salvos neste dispositivo.');
      }
    };
    running.current = execute().finally(() => { running.current = undefined; });
    return running.current;
  }, [accountId, engine, mediaCache, refreshStatus, store]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [hasLocalData, enrolled, initialPullComplete] = await Promise.all([store.hasSyncableData(), store.isEnrolled(accountId), store.isInitialPullComplete(accountId)]);
        const decision = decideInitialSync({ enrolled, initialPullComplete, hasLocalData, online: navigator.onLine });
        if (decision === 'ready') {
          if (navigator.onLine) await runSync();
          if (active) setBootstrap({ kind: 'ready', enabled: true });
          return;
        }
        if (decision === 'adopt-existing') {
          await store.markInitialPullComplete(accountId);
          if (active) setBootstrap({ kind: 'ready', enabled: true });
          return;
        }
        if (decision === 'confirm-upload') {
          const summary = await store.bootstrapSummary();
          if (active) setBootstrap({ kind: 'needs-confirmation', summary });
          return;
        }
        if (!enrolled) await store.activateEmptyInstallation(accountId);
        if (decision === 'wait-for-network') { if (active) setBootstrap({ kind: 'needs-first-connection' }); return; }
        await runSync();
        await store.markInitialPullComplete(accountId);
        if (active) setBootstrap({ kind: 'ready', enabled: true });
      } catch (caught) {
        if (active) setBootstrap({ kind: 'error', message: caught instanceof Error ? caught.message : 'Não foi possível preparar a sincronização.' });
      }
    })();
    return () => { active = false; };
  }, [accountId, runSync, store]);

  useEffect(() => {
    if (bootstrap.kind !== 'ready' || !bootstrap.enabled) return;
    const online = () => void runSync(true);
    const offline = () => void refreshStatus('offline', 'Seus dados continuam salvos neste dispositivo.');
    const visible = () => { if (document.visibilityState === 'visible') void runSync(); };
    const mutation = () => {
      if (mutationTimer.current) window.clearTimeout(mutationTimer.current);
      mutationTimer.current = window.setTimeout(() => void runSync(), 600);
      void refreshStatus();
    };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    window.addEventListener('defyn:local-mutation', mutation);
    const mediaNeeded = (event: Event) => { const mediaId = (event as CustomEvent<{mediaId?:string}>).detail?.mediaId; if (mediaId && navigator.onLine) void mediaCache.then((cache) => cache.downloadOne(accountId, mediaId)).catch(() => refreshStatus('error', 'A foto continua protegida na nuvem e poderá ser baixada novamente.')); };
    window.addEventListener(MEDIA_NEEDED_EVENT, mediaNeeded);
    document.addEventListener('visibilitychange', visible);
    const interval = window.setInterval(() => void runSync(), 60_000);
    if ('BroadcastChannel' in window) {
      channel.current = new BroadcastChannel('defyn-sync');
      channel.current.onmessage = (event: MessageEvent<{ type?: string; accountId?: string }>) => {
        if (event.data?.type === 'sync-complete' && event.data.accountId === accountId) void runSync(false, false);
      };
    }
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      window.removeEventListener('defyn:local-mutation', mutation);
      window.removeEventListener(MEDIA_NEEDED_EVENT, mediaNeeded);
      document.removeEventListener('visibilitychange', visible);
      window.clearInterval(interval);
      if (mutationTimer.current) window.clearTimeout(mutationTimer.current);
      channel.current?.close();
    };
  }, [accountId, bootstrap, mediaCache, refreshStatus, runSync]);

  useEffect(() => {
    if (bootstrap.kind !== 'ready' || !bootstrap.enabled) return;
    let current = realtimeWakeUp.current;
    if (!current || current.accountId !== accountId || current.client !== client) {
      current?.instance.stop();
      current = { accountId, client, instance: new SupabaseRealtimeWakeUp(client, accountId, () => runSync(false, false)) };
      realtimeWakeUp.current = current;
    }
    current.instance.start();
    return () => current.instance.stop();
  }, [accountId, bootstrap, client, runSync]);

  async function confirmBootstrap() {
    setBootstrap({ kind: 'loading', message: 'Preparando dados…' });
    try {
      await store.bootstrapUpload(accountId);
      setBootstrap({ kind: 'loading', message: 'Sincronizando registros…' });
      await runSync(true);
      setBootstrap({ kind: 'loading', message: 'Finalizando…' });
      await store.markInitialPullComplete(accountId);
      setBootstrap({ kind: 'ready', enabled: true });
    } catch (caught) {
      setBootstrap({ kind: 'error', message: caught instanceof Error ? caught.message : 'Não foi possível sincronizar os dados locais.' });
    }
  }

  async function requestSignOut() {
    const pending = await store.pendingCount(accountId);
    if (pending > 0) { setLogoutOpen(true); return; }
    setSigningOut(true);
    try { if (navigator.onLine) await withTimeout(runSync(), 5_000); }
    finally { await onSignOut(); setSigningOut(false); }
  }

  async function syncAndSignOut() {
    setSigningOut(true); setLogoutError('');
    try {
      if (!navigator.onLine) throw new Error('Sem conexão. Escolha sair mesmo assim ou tente novamente quando estiver online.');
      await withTimeout(runSync(true), 8_000);
      if (await store.pendingCount(accountId)) throw new Error('Ainda existem alterações pendentes neste dispositivo.');
      await onSignOut();
    } catch (caught) { setLogoutError(caught instanceof Error ? caught.message : 'Não foi possível sincronizar antes de sair.'); setSigningOut(false); }
  }

  async function resolve(conflictId: string, choice: 'local' | 'remote') {
    await store.resolveConflict(conflictId, choice);
    await runSync(true);
  }

  if (bootstrap.kind === 'loading') return <div className="boot-screen" data-pwa-update-blocking="true"><span className="brand-mark">D</span><strong>DEFYN</strong><p>{bootstrap.message}</p></div>;
  if (bootstrap.kind === 'needs-first-connection') return <main className="auth-page single"><section className="auth-card" role="status"><header><span className="page-eyebrow">Primeiro acesso neste dispositivo</span><h2>Conecte-se à internet uma vez</h2><p>Precisamos preparar seus dados neste dispositivo antes do primeiro uso. Depois disso, o DEFYN continuará funcionando offline normalmente.</p></header><Button type="button" onClick={() => window.location.reload()}>Tentar novamente</Button><Button type="button" variant="secondary" onClick={() => void onSignOut()}>Sair</Button></section></main>;
  if (bootstrap.kind === 'error') return <main className="auth-page single"><section className="auth-card" role="alert"><header><span className="page-eyebrow">Sincronização</span><h2>Não foi possível preparar este dispositivo</h2><p>{bootstrap.message}</p></header><Button type="button" onClick={() => window.location.reload()}>Tentar novamente</Button></section></main>;
  if (bootstrap.kind === 'needs-confirmation') return <BootstrapConfirmation summary={bootstrap.summary} busy={false} onConfirm={() => void confirmBootstrap()} onLater={() => setBootstrap({ kind: 'ready', enabled: false })} />;

  const context: SyncContextValue = { available: bootstrap.enabled, ...status, retry: () => void runSync(true), openDetails: () => setDetailsOpen(true), afterLocalClear: () => onSignOut(), requestSignOut: () => void requestSignOut() };
  return <SyncContext.Provider value={context}>
    <div data-pwa-update-blocking={status.state === 'syncing' || status.state === 'conflict' ? 'true' : undefined}>{children}</div>
    <aside className="account-session-pill" aria-label="Conta DEFYN conectada"><span><small>Conta DEFYN</small><strong>{email ?? 'Conectada'}</strong></span><button type="button" disabled={signingOut} onClick={() => void requestSignOut()}>{signingOut ? 'Saindo…' : 'Sair'}</button></aside>
    {detailsOpen && <SyncDetails status={status} conflicts={conflicts} onClose={() => setDetailsOpen(false)} onRetry={() => void runSync(true)} onResolve={(id, choice) => void resolve(id, choice)} />}
    {logoutOpen && <LogoutDialog online={navigator.onLine} pending={status.pendingCount} busy={signingOut} error={logoutError} onClose={() => setLogoutOpen(false)} onSync={() => void syncAndSignOut()} onLeave={() => void onSignOut()} />}
  </SyncContext.Provider>;
}

function BootstrapConfirmation({ summary, busy, onConfirm, onLater }: { summary: BootstrapSummary; busy: boolean; onConfirm: () => void; onLater: () => void }) {
  return <main className="auth-page single sync-bootstrap-page" data-pwa-update-blocking="true"><section className="auth-card sync-bootstrap-card"><header><span className="page-eyebrow">Sincronizar seus dados</span><h2>Encontramos dados locais vinculados à sua conta.</h2><p>Seus dados continuarão neste dispositivo enquanto uma cópia protegida é sincronizada com sua conta.</p></header><dl><div><dt>Perfis</dt><dd>{summary.profiles}</dd></div><div><dt>Treinos e séries</dt><dd>{summary.trainingPlans + summary.workoutSessions + summary.workoutSets}</dd></div><div><dt>Registros diários</dt><dd>{summary.hydration + summary.nutritionSummaries + summary.sleep}</dd></div><div><dt>Progresso e check-ins</dt><dd>{summary.progressRecords + summary.checkIns}</dd></div><div><dt>Fotos</dt><dd>{summary.photos}</dd></div></dl><Button type="button" loading={busy} onClick={onConfirm}>Sincronizar meus dados</Button><Button type="button" variant="secondary" disabled={busy} onClick={onLater}>Agora não</Button></section></main>;
}

function SyncDetails({ status, conflicts, onClose, onRetry, onResolve }: { status: SyncStatusSnapshot; conflicts: SyncConflict[]; onClose: () => void; onRetry: () => void; onResolve: (id: string, choice: 'local' | 'remote') => void }) {
  return <div className="sync-dialog-backdrop"><section className="sync-dialog" role="dialog" aria-modal="true" aria-label="Estado da sincronização"><header><div><span className="page-eyebrow">Sincronização</span><h2>{syncLabel(status)}</h2></div><button type="button" onClick={onClose} aria-label="Fechar">×</button></header><p>{status.state === 'error' ? 'Seus dados continuam salvos neste dispositivo.' : 'O DEFYN salva primeiro neste dispositivo e sincroniza automaticamente quando possível.'}</p>{status.pendingCount > 0 && <p><strong>{status.pendingCount}</strong> alteração(ões) pendente(s).</p>}{conflicts.map((conflict) => <article key={conflict.id}><strong>Este item foi alterado em outro dispositivo.</strong><p>Escolha qual versão deve permanecer.</p><div><Button compact type="button" onClick={() => onResolve(conflict.id, 'local')}>Usar deste dispositivo</Button><Button compact variant="secondary" type="button" onClick={() => onResolve(conflict.id, 'remote')}>Usar da nuvem</Button></div></article>)}<footer><Button variant="secondary" type="button" onClick={onRetry}>Tentar novamente</Button></footer></section></div>;
}

function LogoutDialog({ online, pending, busy, error, onClose, onSync, onLeave }: { online: boolean; pending: number; busy: boolean; error: string; onClose: () => void; onSync: () => void; onLeave: () => void }) {
  return <div className="sync-dialog-backdrop"><section className="sync-dialog" role="dialog" aria-modal="true" aria-label="Sair com alterações pendentes"><header><div><span className="page-eyebrow">Antes de sair</span><h2>Existem alterações que ainda não foram sincronizadas.</h2></div><button type="button" disabled={busy} onClick={onClose} aria-label="Fechar">×</button></header><p>{online ? `${pending} alteração(ões) continuam seguras neste dispositivo.` : 'Você está offline. As alterações continuam seguras neste dispositivo e poderão ser sincronizadas ao entrar novamente.'}</p>{error && <p className="sync-error" role="alert">{error}</p>}<footer>{online ? <Button type="button" loading={busy} onClick={onSync}>Sincronizar e sair</Button> : <Button type="button" disabled={busy} onClick={onClose}>Ficar</Button>}<Button type="button" variant="secondary" disabled={busy} onClick={onLeave}>Sair mesmo assim</Button></footer></section></div>;
}

async function withTimeout(value: Promise<void> | undefined, milliseconds: number): Promise<void> {
  if (!value) return;
  await Promise.race([value, new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('A sincronização demorou além do esperado.')), milliseconds))]);
}
