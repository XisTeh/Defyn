/** Legacy technical key kept only long enough to migrate existing browsers. */
export const LEGACY_LOCAL_OWNER_ACCOUNT_ID_KEY = 'localOwnerAccountId';

export const SYNC_ENROLLMENT_ACCOUNT_ID_KEY = 'sync:enrollmentAccountId';
export const SYNC_LAST_SUCCESS_AT_KEY = 'sync:lastSuccessAt';
export const SYNC_INITIAL_PULL_COMPLETE_KEY = 'sync:initialPullCompleteAccountId';
export const SYNC_ACTIVE_ACCOUNT_ID_KEY = 'sync:activeAccountId';

export function isInstallationOnlyPreference(key: string): boolean {
  return key === LEGACY_LOCAL_OWNER_ACCOUNT_ID_KEY || key.startsWith('sync:');
}
