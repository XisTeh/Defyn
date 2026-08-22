import { describe, expect, it } from 'vitest';
import { decideAutoUpdate, enterCriticalUpdateSection, criticalUpdateSectionCount, shouldReloadAfterControllerChange } from './pwa-update-policy';

describe('atualização PWA automática', () => {
  it('aplica imediatamente quando a interface está segura', () => expect(decideAutoUpdate(true, 0, false)).toBe('apply'));
  it('aguarda durante estado crítico e aplica quando ele termina', () => { const release = enterCriticalUpdateSection('ocr'); expect(criticalUpdateSectionCount()).toBe(1); expect(decideAutoUpdate(true, criticalUpdateSectionCount(), false)).toBe('wait'); release(); expect(decideAutoUpdate(true, criticalUpdateSectionCount(), false)).toBe('apply'); });
  it('não reaplica enquanto uma atualização já está em curso', () => expect(decideAutoUpdate(true, 0, true)).toBe('idle'));
  it('recarrega uma vez por controllerchange', () => { expect(shouldReloadAfterControllerChange(null)).toBe(true); expect(shouldReloadAfterControllerChange('reloading')).toBe(false); });
});
