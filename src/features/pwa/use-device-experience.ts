import { useCallback, useEffect, useMemo, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { browserCapabilities, resolveInstallAction } from '../../platform/device-capabilities';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaRegistrationState { offlineReady: boolean; }
let pwaState: PwaRegistrationState = { offlineReady: false };
let registrationStarted = false;
const pwaListeners = new Set<(state: PwaRegistrationState) => void>();

function publish(next: Partial<PwaRegistrationState>) {
  pwaState = { ...pwaState, ...next };
  pwaListeners.forEach((listener) => listener(pwaState));
}

function ensureRegistration() {
  if (registrationStarted) return;
  registrationStarted = true;
  registerSW({
    immediate: true,
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
    canInstall: installAction === 'prompt' || installAction === 'ios-help',
    iosHelpOpen,
    setIosHelpOpen,
    install,
  };
}
