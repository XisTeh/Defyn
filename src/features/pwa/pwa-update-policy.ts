import { useEffect } from 'react';

export type AutoUpdateDecision = 'idle' | 'wait' | 'apply';

export function decideAutoUpdate(updateAvailable: boolean, criticalSectionCount: number, applying: boolean): AutoUpdateDecision {
  if (!updateAvailable || applying) return 'idle';
  return criticalSectionCount > 0 ? 'wait' : 'apply';
}

const blockers = new Set<symbol>();
const listeners = new Set<() => void>();

function publish() { listeners.forEach((listener) => listener()); }
export function criticalUpdateSectionCount() { return blockers.size; }
export function subscribeToUpdateSafety(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); }

export function enterCriticalUpdateSection(label: string): () => void {
  const token = Symbol(label); blockers.add(token); publish();
  return () => { if (blockers.delete(token)) publish(); };
}

export function useCriticalUpdateSection(active: boolean, label: string): void {
  useEffect(() => active ? enterCriticalUpdateSection(label) : undefined, [active, label]);
}

export function shouldReloadAfterControllerChange(reloadMarker: string | null): boolean {
  return reloadMarker !== 'reloading';
}
