export interface WakeLockSentinelLike { released?: boolean; release(): Promise<void>; addEventListener?(type: 'release', listener: () => void): void; }
export interface WakeLockNavigatorLike { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } }
export interface NotificationApiLike { permission: NotificationPermission; requestPermission(): Promise<NotificationPermission>; }

export async function requestScreenWakeLock(navigatorLike: WakeLockNavigatorLike): Promise<WakeLockSentinelLike | undefined> {
  if (!navigatorLike.wakeLock) return undefined;
  return navigatorLike.wakeLock.request('screen');
}

export async function requestNotificationOptIn(api?: NotificationApiLike): Promise<NotificationPermission | 'unsupported'> {
  if (!api) return 'unsupported';
  if (api.permission === 'granted' || api.permission === 'denied') return api.permission;
  return api.requestPermission();
}
