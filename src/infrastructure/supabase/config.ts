export type SupabaseRuntimeConfig =
  | { mode: 'local' }
  | { mode: 'supabase'; url: string; publishableKey: string };

export class SupabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigurationError';
  }
}

export interface SupabaseEnvironment {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

export function readSupabaseConfig(environment: SupabaseEnvironment): SupabaseRuntimeConfig {
  const url = environment.VITE_SUPABASE_URL?.trim() ?? '';
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

  if (!url && !publishableKey) return { mode: 'local' };
  if (!url || !publishableKey) {
    throw new SupabaseConfigurationError(
      'A configuração do Supabase está incompleta. Informe URL e Publishable Key, ou remova ambas para usar o modo local.',
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new SupabaseConfigurationError('VITE_SUPABASE_URL não contém uma URL válida.');
  }

  const localDevelopment = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
  if (parsedUrl.protocol !== 'https:' && !(localDevelopment && parsedUrl.protocol === 'http:')) {
    throw new SupabaseConfigurationError('VITE_SUPABASE_URL deve usar HTTPS, exceto no Supabase local.');
  }
  if (!publishableKey.startsWith('sb_publishable_')) {
    throw new SupabaseConfigurationError('Use a Publishable Key do Supabase (prefixo sb_publishable_) no frontend.');
  }

  return { mode: 'supabase', url: parsedUrl.toString().replace(/\/$/, ''), publishableKey };
}

export function readViteSupabaseConfig(): SupabaseRuntimeConfig {
  return readSupabaseConfig({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  });
}
