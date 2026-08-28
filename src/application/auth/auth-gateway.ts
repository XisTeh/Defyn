import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

export interface SignUpResult {
  user: User | null;
  session: Session | null;
  confirmationPending: boolean;
}

export interface AuthSubscription { unsubscribe: () => void }

export interface AuthGateway {
  getSession(): Promise<Session | null>;
  onAuthStateChange(listener: (event: AuthChangeEvent, session: Session | null) => void): AuthSubscription;
  signUp(email: string, password: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<Session>;
  requestPasswordReset(email: string, redirectTo: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
}
