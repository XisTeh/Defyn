import { useCallback, useEffect, useMemo, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { browserCapabilities, resolveInstallAction } from '../../platform/device-capabilities';
import { criticalUpdateSectionCount, decideAutoUpdate, shouldReloadAfterControllerChange, subscribeToUpdateSafety } from './pwa-update-policy';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaRegistrationState { needRefresh: boolean; offlineReady: boolean; }
let pwaState: PwaRegistrationState = { needRefresh: false, offlineReady: false };
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | undefined;
let registrationStarted = false;
let applyingUpdate = false;
const pwaListeners = new Set<(state: PwaRegistrationState) => void>();

function publish(next: Partial<PwaRegistrationState>) {
  pwaState = { ...pwaState, ...next };
  pwaListeners.forEach((listener) => listener(pwaState));
}

async function applyPendingUpdateWhenSafe() {
  if (decideAutoUpdate(pwaState.needRefresh, criticalUpdateSectionCount(), applyingUpdate) !== 'apply') return;
  applyingUpdate = true;
  try { await updateServiceWorker?.(false); publish({ needRefresh: false }); }
  catch { publish({ needRefresh: true }); }
  finally { applyingUpdate = false; }
}

function ensureRegistration() {
  if (registrationStarted) return;
  registrationStarted = true;
  if (sessionStorage.getItem('defyn-sw-reload') === 'reloading') sessionStorage.removeItem('defyn-sw-reload');
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (!shouldReloadAfterControllerChange(sessionStorage.getItem('defyn-sw-reload'))) return;
    sessionStorage.setItem('defyn-sw-reload', 'reloading'); window.location.reload();
  });
  subscribeToUpdateSafety(() => { void applyPendingUpdateWhenSafe(); });
  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh: () => { publish({ needRefresh: true }); void applyPendingUpdateWhenSafe(); },
    onOfflineReady: () => publish({ offlineReady: true }),
    onRegisterError: () => publish({ offlineReady: false }),
  });
}

export function useDeviceExperience() {
  const capabilities = useMemo(() => browserCapabilities(), []);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [registration, setRegistration] = useState(pwaState);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent>();
  const [iosHelpOpen, setIosHelpOpen] = useState(false);

  useEffect(() => {
    ensureRegistration();
    const listener = (state: PwaRegistrationState) => setRegistration(state);
    pwaListeners.add(listener);
    const becameOnline = () => setOnline(true);
    const becameOffline = () => setOnline(false);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const installed = () => setInstallPrompt(undefined);
    window.addEventListener('online', becameOnline);
    window.addEventListener('offline', becameOffline);
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);
    return () => {
      pwaListeners.delete(listener);
      window.removeEventListener('online', becameOnline);
      window.removeEventListener('offline', becameOffline);
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const install = useCallback(async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(undefined);
      return;
    }
    if (capabilities.installPlatform === 'ios') setIosHelpOpen(true);
  }, [capabilities.installPlatform, installPrompt]);

  const installAction = resolveInstallAction(capabilities, Boolean(installPrompt));

  return {
    capabilities,
    online,
    offlineReady: registration.offlineReady,
    updateAvailable: registration.needRefresh,
    canInstall: installAction === 'prompt' || installAction === 'ios-help',
    iosHelpOpen,
    setIosHelpOpen,
    install,
  };
}
