import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { AuthGateway, AuthSubscription, SignUpResult } from './auth-gateway';

export type AuthSessionSnapshot =
  | { status: 'loading'; session: null; recovery: false }
  | { status: 'signed-out'; session: null; recovery: false }
  | { status: 'signed-in'; session: Session; recovery: boolean };

export class AuthSessionService {
  constructor(private readonly gateway: AuthGateway) {}

  async bootstrap(): Promise<AuthSessionSnapshot> {
    const session = await this.gateway.getSession();
    return session
      ? { status: 'signed-in', session, recovery: false }
      : { status: 'signed-out', session: null, recovery: false };
  }

  subscribe(listener: (snapshot: AuthSessionSnapshot, event: AuthChangeEvent) => void): AuthSubscription {
    return this.gateway.onAuthStateChange((event, session) => {
      if (!session) listener({ status: 'signed-out', session: null, recovery: false }, event);
      else listener({ status: 'signed-in', session, recovery: event === 'PASSWORD_RECOVERY' }, event);
    });
  }

  signUp(email: string, password: string): Promise<SignUpResult> { return this.gateway.signUp(email, password); }
  signIn(email: string, password: string): Promise<Session> { return this.gateway.signIn(email, password); }
  requestPasswordReset(email: string, redirectTo: string): Promise<void> { return this.gateway.requestPasswordReset(email, redirectTo); }
  updatePassword(password: string): Promise<void> { return this.gateway.updatePassword(password); }
  signOut(): Promise<void> { return this.gateway.signOut(); }
}
