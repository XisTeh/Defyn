import { describe, expect, it } from 'vitest';
import { assessStorage, detectDeviceCapabilities, detectInstallPlatform, parseLocalizedNumber, resolveInstallAction } from './device-capabilities';

describe('capacidades do dispositivo', () => {
  it('detecta instalação iOS e modo standalone sem depender de APIs inexistentes', () => {
    expect(detectInstallPlatform('Mozilla/5.0 (iPhone)')).toBe('ios');
    expect(detectDeviceCapabilities({ userAgent: 'iPhone', secureContext: true, navigatorStandalone: true })).toMatchObject({ camera: true, standalone: true, installPlatform: 'ios', wakeLock: false });
  });

  it('não anuncia câmera fora de contexto seguro no desktop', () => {
    expect(detectDeviceCapabilities({ userAgent: 'Windows', secureContext: false, mediaDevices: true }).camera).toBe(false);
  });

  it('classifica pressão de armazenamento com limiares explícitos', () => {
    expect(assessStorage(50, 100).level).toBe('ok');
    expect(assessStorage(80, 100).level).toBe('attention');
    expect(assessStorage(95, 100).level).toBe('critical');
    expect(assessStorage().level).toBe('unknown');
  });

  it('aceita decimais brasileiros no treino', () => {
    expect(parseLocalizedNumber('12,5')).toBe(12.5);
    expect(parseLocalizedNumber(' 8.25 ')).toBe(8.25);
    expect(parseLocalizedNumber('-1')).toBeUndefined();
    expect(parseLocalizedNumber('abc')).toBeUndefined();
  });

  it('resolve instalação sem mostrar ação impossível', () => {
    expect(resolveInstallAction({ standalone: true, installPlatform: 'ios' }, true)).toBe('installed');
    expect(resolveInstallAction({ standalone: false, installPlatform: 'android' }, true)).toBe('prompt');
    expect(resolveInstallAction({ standalone: false, installPlatform: 'ios' }, false)).toBe('ios-help');
    expect(resolveInstallAction({ standalone: false, installPlatform: 'desktop' }, false)).toBe('hidden');
  });
});
