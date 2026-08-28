import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { AuthGateway, AuthSubscription, SignUpResult } from '../../application/auth/auth-gateway';
import type { DefynSupabaseClient } from './client';

export class SupabaseAuthGateway implements AuthGateway {
  constructor(private readonly client: DefynSupabaseClient) {}

  async getSession(): Promise<Session | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  onAuthStateChange(listener: (event: AuthChangeEvent, session: Session | null) => void): AuthSubscription {
    const { data } = this.client.auth.onAuthStateChange(listener);
    return { unsubscribe: () => data.subscription.unsubscribe() };
  }

  async signUp(email: string, password: string): Promise<SignUpResult> {
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) throw error;
    return { user: data.user, session: data.session, confirmationPending: Boolean(data.user && !data.session) };
  }

  async signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  }

  async requestPasswordReset(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }
}
