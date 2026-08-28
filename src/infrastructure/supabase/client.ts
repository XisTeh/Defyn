import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type { SupabaseRuntimeConfig } from './config';

export type DefynSupabaseClient = SupabaseClient<Database>;

let cachedClient: DefynSupabaseClient | undefined;
let cachedIdentity = '';

export function createSupabaseClient(config: Extract<SupabaseRuntimeConfig, { mode: 'supabase' }>): DefynSupabaseClient {
  const identity = `${config.url}\u0000${config.publishableKey}`;
  if (cachedClient && cachedIdentity === identity) return cachedClient;
  cachedIdentity = identity;
  cachedClient = createClient<Database>(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'defyn-auth',
    },
  });
  return cachedClient;
}
