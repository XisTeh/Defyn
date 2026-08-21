import { describe, expect, it, vi } from 'vitest';
import { requestNotificationOptIn, requestScreenWakeLock } from './training-device';

describe('recursos opt-in do treino', () => {
  it('não tenta wake lock quando a API não existe', async () => {
    expect(await requestScreenWakeLock({})).toBeUndefined();
  });

  it('solicita wake lock somente quando chamado', async () => {
    const sentinel = { release: vi.fn(async () => undefined) };
    const request = vi.fn(async () => sentinel);
    expect(await requestScreenWakeLock({ wakeLock: { request } })).toBe(sentinel);
    expect(request).toHaveBeenCalledWith('screen');
  });

  it('não repete prompt de notificação decidido', async () => {
    const requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    expect(await requestNotificationOptIn({ permission: 'denied', requestPermission })).toBe('denied');
    expect(requestPermission).not.toHaveBeenCalled();
  });
});
