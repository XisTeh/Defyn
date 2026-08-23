import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const config = readFileSync(new URL('../../../vite.config.ts', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../../../public/sw-auto-update.js', import.meta.url), 'utf8');
const registration = readFileSync(new URL('./use-device-experience.ts', import.meta.url), 'utf8');
const coordinator = readFileSync(new URL('./PwaCoordinator.tsx', import.meta.url), 'utf8');

describe('atualização PWA imediata', () => {
  it('gera um worker autoUpdate e importa a ativação forçada', () => {
    expect(config).toContain("registerType: 'autoUpdate'");
    expect(config).toContain("importScripts: ['sw-auto-update.js']");
    expect(config).not.toContain("registerType: 'prompt'");
  });

  it('ativa somente updates de um worker existente e avisa todas as janelas', () => {
    expect(worker).toContain('registration.active');
    expect(worker).toContain("addEventListener('activate'");
    expect(worker).toContain('clients.claim()');
    expect(worker).toContain("clients.matchAll({ type: 'window', includeUncontrolled: true })");
    expect(worker).toContain("postMessage({ type: 'DEFYN_UPDATE_READY' })");
  });

  it('adianta a ativação, mas não recarrega durante uma sessão de academia', () => {
    expect(registration).toContain("classList.contains('gym-mode-active')");
    expect(registration).toContain('MutationObserver');
    expect(registration).toContain('window.location.reload()');
  });

  it('não mantém estado, callback ou botão de confirmação de versão', () => {
    expect(registration).not.toMatch(/needRefresh|onNeedRefresh|updateAvailable|updateServiceWorker/);
    expect(coordinator).not.toMatch(/Atualizar agora|Nova versão disponível|updateAvailable/);
  });

  it('registra o service worker imediatamente', () => {
    expect(registration).toContain('registerSW({');
    expect(registration).toContain('immediate: true');
  });
});
