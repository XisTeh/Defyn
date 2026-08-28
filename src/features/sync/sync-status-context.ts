import { createContext, useContext } from 'react';
import type { SyncStatusSnapshot } from '../../application/sync/sync-contract';

export interface SyncContextValue extends SyncStatusSnapshot {
  available: boolean;
  retry: () => void;
  openDetails: () => void;
  afterLocalClear: () => Promise<void>;
  requestSignOut: () => void;
}

export const SyncContext = createContext<SyncContextValue>({ available: false, state: 'idle', pendingCount: 0, conflictCount: 0, retry: () => undefined, openDetails: () => undefined, afterLocalClear: () => Promise.resolve(), requestSignOut: () => undefined });

export function useSyncStatus(): SyncContextValue { return useContext(SyncContext); }

export function syncLabel(status: Pick<SyncStatusSnapshot, 'state' | 'pendingCount'>): string {
  if (status.state === 'syncing') return 'Sincronizando…';
  if (status.state === 'offline') return status.pendingCount ? `Offline · ${status.pendingCount} alterações pendentes` : 'Offline · dados neste dispositivo';
  if (status.state === 'error') return 'Erro de sincronização';
  if (status.state === 'conflict') return 'Conflito de sincronização';
  return status.pendingCount ? `${status.pendingCount} alterações pendentes` : 'Sincronizado';
}
