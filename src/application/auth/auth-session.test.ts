import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { AuthGateway } from './auth-gateway';
import { AuthSessionService } from './auth-session';

function session(userId = 'account-a'): Session {
  return { access_token: 'not-real', refresh_token: 'not-real', expires_in: 3600, token_type: 'bearer', user: { id: userId, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' } };
}

function gateway(current: Session | null = null): AuthGateway & { emit: (event: AuthChangeEvent, next: Session | null) => void } {
  let listener: ((event: AuthChangeEvent, next: Session | null) => void) | undefined;
  return {
    getSession: vi.fn(async () => current),
    onAuthStateChange: vi.fn((nextListener) => { listener = nextListener; return { unsubscribe: vi.fn() }; }),
    signUp: vi.fn(async () => ({ user: null, session: null, confirmationPending: true })),
    signIn: vi.fn(async () => session()),
    requestPasswordReset: vi.fn(async () => undefined),
    updatePassword: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
    emit: (event, next) => listener?.(event, next),
  };
}

describe('sessão de autenticação', () => {
  it('faz bootstrap signed out sem depender da internet real', async () => {
    const service = new AuthSessionService(gateway());
    await expect(service.bootstrap()).resolves.toEqual({ status: 'signed-out', session: null, recovery: false });
  });

  it('restaura sessão existente', async () => {
    const existing = session();
    const service = new AuthSessionService(gateway(existing));
    await expect(service.bootstrap()).resolves.toEqual({ status: 'signed-in', session: existing, recovery: false });
  });

  it('propaga sign in, token refresh, recuperação e sign out sem expor tokens', () => {
    const mock = gateway();
    const service = new AuthSessionService(mock);
    const snapshots: string[] = [];
    service.subscribe((snapshot, event) => snapshots.push(`${event}:${snapshot.status}:${snapshot.recovery}`));
    mock.emit('SIGNED_IN', session());
    mock.emit('TOKEN_REFRESHED', session());
    mock.emit('PASSWORD_RECOVERY', session());
    mock.emit('SIGNED_OUT', null);
    expect(snapshots).toEqual(['SIGNED_IN:signed-in:false', 'TOKEN_REFRESHED:signed-in:false', 'PASSWORD_RECOVERY:signed-in:true', 'SIGNED_OUT:signed-out:false']);
  });

  it('delega login e logout ao gateway', async () => {
    const mock = gateway();
    const service = new AuthSessionService(mock);
    await service.signIn('qa@example.test', 'password-from-test');
    await service.signOut();
    expect(mock.signIn).toHaveBeenCalledWith('qa@example.test', 'password-from-test');
    expect(mock.signOut).toHaveBeenCalledOnce();
  });
});
