export type InstallPlatform = 'android' | 'ios' | 'desktop' | 'unsupported';

export interface DeviceCapabilities {
  camera: boolean;
  notifications: boolean;
  wakeLock: boolean;
  storageEstimate: boolean;
  persistentStorage: boolean;
  share: boolean;
  fileShare: boolean;
  standalone: boolean;
  installPlatform: InstallPlatform;
}

export interface CapabilityEnvironment {
  userAgent?: string;
  secureContext?: boolean;
  standaloneMedia?: boolean;
  navigatorStandalone?: boolean;
  mediaDevices?: boolean;
  notifications?: boolean;
  wakeLock?: boolean;
  storageEstimate?: boolean;
  persistentStorage?: boolean;
  share?: boolean;
  fileShare?: boolean;
}

export interface StorageSnapshot {
  usage?: number;
  quota?: number;
  ratio?: number;
  persisted?: boolean;
  level: 'unknown' | 'ok' | 'attention' | 'critical';
}

export type InstallAction = 'installed' | 'prompt' | 'ios-help' | 'hidden';

export function resolveInstallAction(capabilities: Pick<DeviceCapabilities, 'standalone' | 'installPlatform'>, hasDeferredPrompt: boolean): InstallAction {
  if (capabilities.standalone) return 'installed';
  if (hasDeferredPrompt) return 'prompt';
  if (capabilities.installPlatform === 'ios') return 'ios-help';
  return 'hidden';
}

export function detectInstallPlatform(userAgent = ''): InstallPlatform {
  const normalized = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(normalized)) return 'ios';
  if (/android/.test(normalized)) return 'android';
  if (/windows|macintosh|linux|cros/.test(normalized)) return 'desktop';
  return 'unsupported';
}

export function detectDeviceCapabilities(environment: CapabilityEnvironment): DeviceCapabilities {
  const installPlatform = detectInstallPlatform(environment.userAgent);
  const mobileCapture = installPlatform === 'android' || installPlatform === 'ios';
  return {
    camera: Boolean(environment.secureContext && (environment.mediaDevices || mobileCapture)),
    notifications: Boolean(environment.notifications),
    wakeLock: Boolean(environment.wakeLock),
    storageEstimate: Boolean(environment.storageEstimate),
    persistentStorage: Boolean(environment.persistentStorage),
    share: Boolean(environment.share),
    fileShare: Boolean(environment.fileShare),
    standalone: Boolean(environment.standaloneMedia || environment.navigatorStandalone),
    installPlatform,
  };
}

export function browserCapabilities(): DeviceCapabilities {
  const nav = navigator as Navigator & { standalone?: boolean; wakeLock?: unknown };
  return detectDeviceCapabilities({
    userAgent: nav.userAgent,
    secureContext: window.isSecureContext,
    standaloneMedia: window.matchMedia?.('(display-mode: standalone)').matches,
    navigatorStandalone: nav.standalone,
    mediaDevices: Boolean(nav.mediaDevices?.getUserMedia),
    notifications: 'Notification' in window,
    wakeLock: 'wakeLock' in nav,
    storageEstimate: Boolean(nav.storage?.estimate),
    persistentStorage: Boolean(nav.storage?.persist),
    share: Boolean(nav.share),
    fileShare: 'share' in nav && 'canShare' in nav,
  });
}

export function assessStorage(usage?: number, quota?: number, persisted?: boolean): StorageSnapshot {
  if (!Number.isFinite(usage) || !Number.isFinite(quota) || !quota || quota <= 0 || usage === undefined) {
    return { usage, quota, persisted, level: 'unknown' };
  }
  const ratio = Math.max(0, usage / quota);
  return { usage, quota, ratio, persisted, level: ratio >= 0.9 ? 'critical' : ratio >= 0.75 ? 'attention' : 'ok' };
}

export async function readStorageSnapshot(): Promise<StorageSnapshot> {
  if (!navigator.storage?.estimate) return assessStorage(undefined, undefined, undefined);
  const [estimate, persisted] = await Promise.all([
    navigator.storage.estimate(),
    navigator.storage.persisted?.().catch(() => undefined) ?? Promise.resolve(undefined),
  ]);
  return assessStorage(estimate.usage, estimate.quota, persisted);
}

export function parseLocalizedNumber(value: string): number | undefined {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function formatBytes(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return 'indisponível';
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  return `${(value / 1024 / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`;
}
