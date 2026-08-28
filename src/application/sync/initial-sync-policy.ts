export type InitialSyncDecision = 'ready' | 'adopt-existing' | 'confirm-upload' | 'pull-first' | 'wait-for-network';

export function decideInitialSync(input: { enrolled: boolean; initialPullComplete: boolean; hasLocalData: boolean; online: boolean }): InitialSyncDecision {
  if (input.enrolled && input.initialPullComplete) return 'ready';
  if (input.enrolled && input.hasLocalData) return 'adopt-existing';
  if (!input.enrolled && input.hasLocalData) return 'confirm-upload';
  return input.online ? 'pull-first' : 'wait-for-network';
}
