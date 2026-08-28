import type { ReactNode } from 'react';
import { shouldExposeLocalData, type LocalOwnershipDecision } from '../../application/auth/local-installation-ownership';

export function LocalDataAccessGuard({ decision, children }: { decision: LocalOwnershipDecision; children: ReactNode }) {
  return shouldExposeLocalData(decision) ? children : null;
}
