import { describe, expect, it } from 'vitest';
import { decideInitialSync } from './initial-sync-policy';

describe('bootstrap e novo dispositivo', () => {
  it('exige consentimento para dados locais ainda não inscritos', () => expect(decideInitialSync({ enrolled: false, initialPullComplete: false, hasLocalData: true, online: true })).toBe('confirm-upload'));
  it('não depende da nuvem depois que o dispositivo foi preparado', () => expect(decideInitialSync({ enrolled: true, initialPullComplete: true, hasLocalData: true, online: false })).toBe('ready'));
  it('retoma instalação já inscrita que ainda possui dados', () => expect(decideInitialSync({ enrolled: true, initialPullComplete: false, hasLocalData: true, online: false })).toBe('adopt-existing'));
  it('faz pull antes de decidir onboarding em dispositivo vazio', () => expect(decideInitialSync({ enrolled: false, initialPullComplete: false, hasLocalData: false, online: true })).toBe('pull-first'));
  it('faz pull novamente se a preparação anterior foi interrompida', () => expect(decideInitialSync({ enrolled: true, initialPullComplete: false, hasLocalData: false, online: true })).toBe('pull-first'));
  it('bloqueia onboarding falso no primeiro login offline', () => expect(decideInitialSync({ enrolled: false, initialPullComplete: false, hasLocalData: false, online: false })).toBe('wait-for-network'));
  it('mantém bloqueio offline após bootstrap vazio interrompido', () => expect(decideInitialSync({ enrolled: true, initialPullComplete: false, hasLocalData: false, online: false })).toBe('wait-for-network'));
});
